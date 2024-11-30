import React from "react";
import { useSessionManager } from "../hooks/useSessionManager";

export const CookieContext = React.createContext<
  ReturnType<typeof useSessionManager> | undefined
>(undefined);

export function CookieProvider({ children }: { children: React.ReactNode }) {
  const sessionManager = useSessionManager();

  return (
    <CookieContext.Provider value={sessionManager}>
      {children}
    </CookieContext.Provider>
  );
}
