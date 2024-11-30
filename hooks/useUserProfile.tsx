import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

export function useUserProfile() {
  type UserProfile = {
    walletAddress: string;
    name: string | null;
    email: string | null;
    bio: string | null;
    avatar: string | null;
    chainId: string;
    language: string | null;
    theme: string | null;
    notifications: JSON | null;
    privacy: JSON | null;
    twoFactor: boolean;
    defaultPaymentAddress: string | null;
    paymentAddress: string | null;
  };
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (status !== "authenticated") {
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [status]);

  const updateProfile = useCallback(
    async (updatedData: Partial<UserProfile>) => {
      if (status !== "authenticated") {
        setError("Not authenticated");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
          throw new Error("Failed to update profile");
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  return { profile, loading, error, fetchProfile, updateProfile };
}
