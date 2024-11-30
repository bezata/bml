import "@/styles/globals.css";
import type { AppProps } from "next/app";
import ContextProvider from "@/context/wagmiContext";
import { parseCookies } from "nookies";
import { CookieProvider } from "@/context/sessionProvider";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps }: AppProps) {
  const cookies = parseCookies();
  return (
    
      <ContextProvider cookies = {JSON.stringify(cookies || {})}>
      <SessionProvider>
        <CookieProvider>
            <Component {...pageProps} />
         </CookieProvider>
        </SessionProvider>
      </ContextProvider>
   
  );
}
