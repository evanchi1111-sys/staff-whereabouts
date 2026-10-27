import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeProvider } from "../helpers/themeMode";
import { TooltipProvider } from "./Tooltip";
import { Toaster } from "./Toaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { FlootRealtimeProvider } from "./FlootRealtimeProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute “fresh” window
    },
  },
});

export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <ScrollToHashElement />
        <FlootRealtimeProvider>
          <TooltipProvider>
            {children}
            {/* Renders every toast(...) from helpers/toast. Mounted once, here. */}
            <Toaster />
          </TooltipProvider>
        </FlootRealtimeProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
};
