// hooks/useKeycloak.ts
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function useKeycloak() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  console.log(session)
  useEffect(() => {
    if (session?.accessToken) {
      setToken(session.accessToken as string);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [session]);

  return { token, loading };
}