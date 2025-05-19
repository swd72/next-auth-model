// app/page.tsx
"use client";

import { useKeycloak } from "@/hook/useKeycloak";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const { token } = useKeycloak();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <h1 className="text-2xl mb-4">Next.js with Next-Auth and Keycloak</h1>
        
        {isLoading ? (
          <p>Loading session...</p>
        ) : session ? (
          <div>
            <p>Signed in as {session.user?.name}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/next-auth" })}
              className="px-4 py-2 bg-red-500 text-white rounded mt-4"
            >
              Sign out
            </button>
            {token && (
              <div className="mt-4">
                <p>Access Token (first 20 chars):</p>
                <pre className="bg-gray-100 p-2 rounded">
                  {token.substring(0, 20)}...
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p>Not signed in</p>
            <button
              onClick={() => signIn("keycloak")}
              className="px-4 py-2 bg-blue-500 text-white rounded mt-4"
            >
              Sign in with Keycloak
            </button>
          </div>
        )}
      </div>
    </main>
  );
}