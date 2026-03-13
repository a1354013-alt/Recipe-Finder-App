/**
 * AI Recognition Page
 * 
 * Upload food images and get AI-powered ingredient recognition
 * and recipe recommendations
 * 
 * 安全特性：
 * - 未登入自動導流到首頁
 * - 圖片上傳 DoS 限制（8MB base64 上限）
 * - CSRF 驗證（client 自動帶 x-csrf-token）
 */

import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload, Sparkles, ChefHat, Settings } from 'lucide-react';
import Navigation from '@/components/Navigation';
import RecipeCard from '@/components/RecipeCard';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

interface RecognizedIngredient {
  name: string;
  quantity: string;
  unit: string;
}

interface RecommendedRecipe {
  name: string;
  description: string;
  ingredients_used: string[];
  difficulty: string;
  cookTime: number;
  servings?: number;
}

export default function AIRecognition() {
  // All hooks must be called before any conditional returns
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [recognizedIngredients, setRecognizedIngredients] = useState<RecognizedIngredient[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<RecommendedRecipe[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const recognizeIngredientsMutation = trpc.ai.recognizeIngredients.useMutation();
  const getRecommendationsMutation = trpc.ai.getRecipeRecommendations.useMutation();
  const getConfigQuery = trpc.ai.getConfig.useQuery();
  const [aiProvider, setAiProvider] = useState<'manus' | 'ollama'>('manus');

  // useEffect must be called before any conditional returns
  useEffect(() => {
    if (getConfigQuery.data) {
      setAiProvider(getConfigQuery.data.provider);
    }
  }, [getConfigQuery.data]);

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

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedImage(base64);
      // Pass actual file type to handler
      handleRecognizeIngredients(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleRecognizeIngredients = async (base64: string, mimeType: string = 'image/jpeg') => {
    setIsProcessing(true);
    try {
      const result = await recognizeIngredientsMutation.mutateAsync({
        imageBase64: base64.split(',')[1] || base64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      });

      setRecognizedIngredients(result.ingredients);
      setConfidence(result.confidence);

      // Get recipe recommendations
      const ingredientNames = result.ingredients.map((ing) => ing.name);
      const recipes = await getRecommendationsMutation.mutateAsync({
        ingredients: ingredientNames,
        maxRecipes: 5,
      });

      setRecommendedRecipes(recipes.recipes);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error recognizing ingredients:', error);
      }
      toast.error('Failed to recognize ingredients');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearch = (query: string) => {
    setLocation(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation onSearch={handleSearch} />

      {/* Hero Section */}
      <section className="relative py-12 px-4 bg-gradient-to-r from-accent/10 to-accent/5">
        <div className="container max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-accent rounded-lg">
              <Sparkles className="w-8 h-8 text-accent-foreground" />
            </div>
          </div>
          <h1 className="font-merriweather font-bold text-4xl md:text-5xl text-accent mb-4">
            AI 食材識別
          </h1>
          <p className="text-lg text-muted-foreground font-lato max-w-2xl mx-auto">
            上傳食材圖片，讓 AI 識別食材並推薦相關食譜
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="px-3 py-1 bg-accent/20 text-accent rounded-full font-lato">
              {aiProvider === 'manus' ? 'Manus AI' : 'Ollama'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/ai-settings')}
              className="gap-1"
            >
              <Settings className="w-4 h-4" />
              配置
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto py-12 px-4">
        {/* Upload Section */}
        <Card className="mb-8 border-2 border-dashed border-accent/30 hover:border-accent/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-accent" />
              上傳食材圖片
            </CardTitle>
            <CardDescription>
              支援 JPG、PNG 等常見圖片格式（最大 8MB）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-8 border-2 border-dashed border-accent/30 rounded-lg hover:border-accent/50 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-muted-foreground font-lato">正在識別食材...</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-accent" />
                  <p className="font-lato text-foreground">點擊上傳圖片或拖放圖片到此處</p>
                  <p className="text-sm text-muted-foreground font-lato">JPG、PNG 或其他圖片格式（最大 8MB）</p>
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Image Preview & Results */}
        {selectedImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Image Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">上傳的圖片</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={selectedImage}
                  alt="Uploaded food"
                  className="w-full h-64 object-cover rounded-lg"
                />
              </CardContent>
            </Card>

            {/* Recognized Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">識別的食材</CardTitle>
                <CardDescription>
                  識別信心度: {(confidence * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recognizedIngredients.length > 0 ? (
                    recognizedIngredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="p-3 bg-accent/10 rounded-lg border border-accent/20"
                      >
                        <p className="font-merriweather font-semibold text-foreground">
                          {ingredient.name}
                        </p>
                        <p className="text-sm text-muted-foreground font-lato">
                          {ingredient.quantity} {ingredient.unit}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground font-lato">等待識別結果...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommended Recipes */}
        {recommendedRecipes.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-8">
              <h2 className="section-title m-0">推薦食譜</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedRecipes.map((recipe, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-merriweather line-clamp-2">
                      {recipe.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground font-lato line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-lato">
                        {recipe.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-lato">
                        {recipe.cookTime} 分鐘
                      </span>
                      {recipe.servings && (
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full font-lato">
                          {recipe.servings} 人份
                        </span>
                      )}
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-lato mb-2">使用的食材:</p>
                      <div className="flex gap-1 flex-wrap">
                        {recipe.ingredients_used.slice(0, 3).map((ing, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-lato"
                          >
                            {ing}
                          </span>
                        ))}
                        {recipe.ingredients_used.length > 3 && (
                          <span className="px-2 py-1 text-xs text-muted-foreground font-lato">
                            +{recipe.ingredients_used.length - 3} 更多
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedImage && (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground font-lato">
                上傳一張食材圖片開始探索推薦食譜
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
