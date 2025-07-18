
import { TooltipProvider } from "@/components/ui/tooltip";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { ThemeProvider } from "./components/theme/theme-provider";


const App = () => (
    <TooltipProvider>
      
      <HashRouter>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          
        </Routes>
        </ThemeProvider>
      </HashRouter>
    </TooltipProvider>
);

export default App;
