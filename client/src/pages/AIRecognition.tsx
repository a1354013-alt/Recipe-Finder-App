/**
 * AI Recognition Page
 * 
 * Uses React Query hooks for AI-powered ingredient recognition
 * and recipe recommendations
 * 
 * 安全特性：
 * - 未登入自動導流到首頁
 * - 圖片上傳 DoS 限制（8MB base64 上限）
 * - CSRF 驗證（client 自動帶 x-csrf-token）
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Sparkles, ChefHat } from 'lucide-react';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { trpc } from '@/lib/trpc';
import { Recipe } from '@/lib/recipes';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';
import { AIRecognizedIngredient, RECIPE_PLACEHOLDER_IMAGE } from '@shared/types';

interface RecommendedRecipe {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cookTime: number;
  servings?: number;
}

export default function AIRecognition() {
  // All hooks must be called before any conditional returns
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recognizedIngredients, setRecognizedIngredients] = useState<AIRecognizedIngredient[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Use React Query hooks for mutations
  const recognizeIngredientsMutation = trpc.ai.recognizeIngredients.useMutation();
  const getRecommendationsMutation = trpc.ai.getRecipeRecommendations.useMutation();
  trpc.ai.getConfig.useQuery();

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案大小（8MB 上限）
    const MAX_SIZE = 8 * 1024 * 1024; // 8MB
    if (file.size > MAX_SIZE) {
      toast.error('Image must be less than 8MB');
      return;
    }

    // 檢查 MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are supported');
      return;
    }

    // 轉換為 base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRecognize = async () => {
    if (!selectedImage) {
      toast.error('Please select an image');
      return;
    }

    setIsProcessing(true);
    try {
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = selectedImage.split(',')[1] || selectedImage;
      const mimeType = selectedImage.includes('image/jpeg') ? 'image/jpeg' : 
                      selectedImage.includes('image/png') ? 'image/png' : 'image/webp';

      // Call recognizeIngredients mutation
      const result = await recognizeIngredientsMutation.mutateAsync({
        imageBase64: base64Data,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      });

      setRecognizedIngredients(result.ingredients);
      setConfidence(result.confidence);

      // Get recipe recommendations
      const ingredientNames = result.ingredients.map((ing: RecognizedIngredient) => ing.name);
      const recipes = await getRecommendationsMutation.mutateAsync({
        ingredients: ingredientNames,
        maxRecipes: 5,
      });

      // Convert recommendations to Recipe format for display (AI recommendations only)
      const recipeObjects: Recipe[] = recipes.recipes.map((recipe: RecommendedRecipe, idx: number) => ({
        id: -1 - idx, // Use negative IDs to distinguish AI recommendations from real recipes
        title: recipe.name || 'Recipe',
        image: RECIPE_PLACEHOLDER_IMAGE,
        readyInMinutes: recipe.cookTime || 30,
        servings: recipe.servings || 4,
        sourceUrl: '',
        summary: recipe.description,
        difficulty: recipe.difficulty,
        cuisines: [],
        diets: [],
      }));

      setRecommendedRecipes(recipeObjects);
      toast.success('Ingredients recognized successfully!');
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error recognizing ingredients:', error);
      }
      toast.error('Failed to recognize ingredients');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedImage(null);
    setRecognizedIngredients([]);
    setRecommendedRecipes([]);
    setConfidence(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={() => {}} />

      <div className="container py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
            <h1 className="font-merriweather font-bold text-4xl text-accent">
              AI Recipe Recognition
            </h1>
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <p className="text-muted-foreground font-lato max-w-2xl mx-auto">
            Upload a food image and our AI will recognize the ingredients and suggest recipes
          </p>
        </div>

        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Image Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Image
              </CardTitle>
              <CardDescription>
                Supported formats: JPEG, PNG, WebP (max 8MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Button
                      onClick={() => setSelectedImage(null)}
                      variant="outline"
                      className="absolute top-2 right-2"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  onClick={handleRecognize}
                  disabled={!selectedImage || isProcessing || recognizeIngredientsMutation.isPending}
                  className="w-full"
                >
                  {isProcessing || recognizeIngredientsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recognizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Recognize Ingredients
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recognized Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="w-5 h-5" />
                Recognized Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recognizedIngredients.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">{(confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {recognizedIngredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-secondary rounded"
                      >
                        <span className="font-lato">{ing.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {ing.quantity} {ing.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleClear} variant="outline" className="w-full">
                    Clear
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground font-lato">
                  Upload an image to see recognized ingredients
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recommended Recipes */}
        {recommendedRecipes.length > 0 && (
          <div>
            <h2 className="font-merriweather font-bold text-2xl text-accent mb-6">
              Recommended Recipes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
