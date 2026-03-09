import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import WelcomePage from "./pages/WelcomePage";
import PrivacyPage from "./pages/PrivacyPage";
import AppShell from "./components/AppShell";
import MentorHomePage from "./pages/MentorHomePage";
import MentorChatPage from "./pages/MentorChatPage";
import JournalPage from "./pages/JournalPage";
import ProgressPage from "./pages/ProgressPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/app" element={<AppShell />}>
            <Route index element={<MentorHomePage />} />
            <Route path="mentor/:entryPath" element={<MentorChatPage />} />
            <Route path="journal" element={<JournalPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
