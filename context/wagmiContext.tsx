"use client";

import { wagmiAdapter, projectId } from "@/configs/wagmiConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { polygon , base } from "@reown/appkit/networks";
import React, { type ReactNode } from "react";
import { WagmiProvider, type Config } from "wagmi";
import { siweConfig } from "@/configs/siweConfig";
import { cookieToInitialState } from "wagmi";

// Set up queryClient
const queryClient = new QueryClient();

// Set up metadata
const metadata = {
  name: "BML",
  description: "BML",
  url: "https://ugabuga-git-main-bezatas-projects.vercel.app/?_vercel_share=BTOwwvZOH7pz1kuCoPgwwgR0yDGHyhO9", // origin must match your domain & subdomain
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [polygon, base],
  defaultNetwork: polygon,
  metadata: metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    swaps: true,
    onramp: true,
    email: true,
    socials: ["google", "x", "github", "discord", "apple", "facebook"],
    emailShowWallets: false, // default to true
  },
  themeMode: "light",
  siweConfig: siweConfig,
});

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
