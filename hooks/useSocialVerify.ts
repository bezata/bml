// hooks/useSocialVerify.ts
import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export const PROVIDERS = {
  github: {
    name: "GitHub",
    scope: "read:user user:email",
    authUrl: "https://github.com/login/oauth/authorize",
    profileLinkKey: "githubProfileLink",
    redirectUri: "/api/social/verify/github/callback",
  },
  twitter: {
    name: "Twitter",
    scope: "users.read tweet.read",
    authUrl: "https://twitter.com/i/oauth2/authorize",
    profileLinkKey: "xProfileLink",
    redirectUri: "/api/social/verify/twitter/callback",
  },
  discord: {
    name: "Discord",
    scope: "identify email",
    authUrl: "https://discord.com/api/oauth2/authorize",
    profileLinkKey: "discordProfileLink",
    redirectUri: "/api/social/verify/discord/callback",
  },
  linkedin: {
    name: "LinkedIn",
    scope: "r_liteprofile r_emailaddress",
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    profileLinkKey: "linkedinProfileLink",
    redirectUri: "/api/social/verify/linkedin/callback",
  },
} as const;

type Provider = keyof typeof PROVIDERS;
type VerificationStatus = Record<Provider, boolean>;

interface VerificationResult {
  success: boolean;
  provider: Provider;
  profileData: {
    id: string;
    username?: string;
    email?: string;
    avatar?: string;
    profileUrl?: string;
    redirectUri: "/api/social/verify/github/callback";
  };
}

interface UseSocialVerifyOptions {
  onSuccess?: (provider: Provider, data: VerificationResult) => void;
  onError?: (provider: Provider, error: Error) => void;
}

// Get environment variable in a type-safe way
const getClientId = (provider: Provider): string => {
  const envKey = `NEXT_PUBLIC_OAUTH_CLIENT_ID_${provider.toUpperCase()}`;
  return process.env[envKey] || "";
};

export function useSocialVerify(options: UseSocialVerifyOptions = {}) {
  const { data: session, update: updateSession } = useSession();
  const authWindowRef = useRef<Window | null>(null);
  const checkWindowInterval = useRef<NodeJS.Timeout>();

  const updateUserSettings = async (
    provider: Provider,
    profileData: VerificationResult["profileData"]
  ) => {
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          [PROVIDERS[provider].profileLinkKey]: profileData.profileUrl,
          ...(provider === "github" &&
            profileData.email && {
              email: profileData.email,
            }),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user settings");
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  };

  const handleWindowClose = useCallback(() => {
    if (checkWindowInterval.current) {
      clearInterval(checkWindowInterval.current);
    }
    authWindowRef.current = null;
  }, []);

  const verifyProvider = useCallback(
    async (provider: Provider) => {
      try {
        const state = Math.random().toString(36).substring(7);
        localStorage.setItem("oauth_state", state);
        localStorage.setItem("oauth_provider", provider);

        const clientId = getClientId(provider);
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: `${window.location.origin}${PROVIDERS[provider].redirectUri}`,
          scope: PROVIDERS[provider].scope,
          state,
          response_type: "code",
        });

        const authUrl = `${PROVIDERS[provider].authUrl}?${params}`;

        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        authWindowRef.current = window.open(
          authUrl,
          `Connect ${PROVIDERS[provider].name}`,
          `width=${width},height=${height},left=${left},top=${top},toolbar=0,scrollbars=1,status=1,resizable=1,location=1,menuBar=0`
        );

        if (authWindowRef.current) {
          checkWindowInterval.current = setInterval(() => {
            if (authWindowRef.current?.closed) {
              handleWindowClose();
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error initiating verification:", error);
        options.onError?.(provider, error as Error);
      }
    },
    [options, handleWindowClose]
  );

  const handleCallback = useCallback(
    async (code: string, state: string) => {
      const savedState = localStorage.getItem("oauth_state");
      const provider = localStorage.getItem(
        "oauth_provider"
      ) as Provider | null;

      if (!provider || state !== savedState) {
        console.error("Invalid verification attempt");
        return;
      }

      try {
        const response = await fetch(`/api/social/verify/${provider}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error("Verification failed");
        }

        const result = (await response.json()) as VerificationResult;

        await updateUserSettings(provider, result.profileData);

        localStorage.removeItem("oauth_state");
        localStorage.removeItem("oauth_provider");

        await updateSession();

        // Close the popup window
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth_success", provider, data: result },
            window.location.origin
          );
          window.close();
        }

        options.onSuccess?.(provider, result);
      } catch (error) {
        console.error("Verification error:", error);
        options.onError?.(provider, error as Error);

        // Notify opener of error
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "oauth_error",
              provider,
              error: error instanceof Error ? error.message : String(error),
            },
            window.location.origin
          );
          window.close();
        }
      }
    },
    [session, options, updateSession]
  );

  // Listen for messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "oauth_success") {
        options.onSuccess?.(event.data.provider, event.data.data);
        handleWindowClose();
      } else if (event.data.type === "oauth_error") {
        options.onError?.(event.data.provider, new Error(event.data.error));
        handleWindowClose();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (checkWindowInterval.current) {
        clearInterval(checkWindowInterval.current);
      }
    };
  }, [options, handleWindowClose]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const state = urlParams.get("state");

    if (code && state && window.opener) {
      handleCallback(code, state);
    }
  }, [handleCallback]);

  const getVerificationStatus = useCallback((): VerificationStatus => {
    const checkProfileLink = (provider: Provider): boolean => {
      const linkKey = PROVIDERS[provider].profileLinkKey;
      return Boolean(
        session?.user &&
          (session.user as Record<string, string | undefined>)[linkKey]
      );
    };

    return {
      github: checkProfileLink("github"),
      twitter: checkProfileLink("twitter"),
      discord: checkProfileLink("discord"),
      linkedin: checkProfileLink("linkedin"),
    };
  }, [session]);

  return {
    verifyProvider,
    isVerified: getVerificationStatus(),
    isAuthenticated: Boolean(session),
  };
}
