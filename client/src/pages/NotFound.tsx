import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChefHat } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-accent rounded-lg flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-accent-foreground" />
          </div>
        </div>
        <h1 className="font-merriweather font-bold text-5xl text-accent mb-4">404</h1>
        <p className="text-2xl font-merriweather font-bold text-foreground mb-2">
          Recipe Not Found
        </p>
        <p className="text-muted-foreground font-lato mb-8 max-w-md">
          Sorry, the recipe you're looking for doesn't exist. Let's get you back to discovering delicious recipes!
        </p>
        <Link href="/">
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
