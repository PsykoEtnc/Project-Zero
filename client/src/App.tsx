import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import { RoleSelector } from "@/components/RoleSelector";
import { Dashboard } from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

function AppContent() {
  const { currentRole } = useRole();

  if (!currentRole) {
    return <RoleSelector />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/briefing" component={Dashboard} />
      <Route path="/debriefing" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RoleProvider>
          <AppContent />
          <Toaster />
        </RoleProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
