import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { setCookie } from "cookies-next";

export function useSessionManager() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.accessToken) {
      setCookie("auth", session.accessToken, { maxAge: 60 * 60 * 24 * 7 }); // Set the token as a cookie for 7 days
    }
  }, [session]);

  return { session, status };
}
