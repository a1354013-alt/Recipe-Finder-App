import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import RecipeDetail from "@/pages/RecipeDetail";
import SearchResults from "@/pages/SearchResults";
import Favorites from "@/pages/Favorites";
import AIRecognition from "@/pages/AIRecognition";
import AISettings from "@/pages/AISettings";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { DarkModeProvider } from "./contexts/DarkModeContext";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/recipe/:id"} component={RecipeDetail} />
      <Route path={"/search"} component={SearchResults} />
      <Route path={"/favorites"} component={Favorites} />
      <Route path={"/ai-recognition"} component={AIRecognition} />
      <Route path={"/ai-settings"} component={AISettings} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: Culinary Kitchen Aesthetic Theme
// - Light background (#FFFFFF) with warm orange accents (#E8743B)
// - Fresh green (#2D5016) for health/diet indicators
// - Merriweather for headings, Lato for body text
// - Warm, appetizing, and welcoming design
// - Soft shadows and elegant hover animations

function App() {
  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <ThemeProvider
          defaultTheme="light"
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  );
}

export default App;
