// app/protected/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect("/myapp");
    },
  });

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl mb-4">Protected Page</h1>
      <p>You are logged in as {session.user?.name}</p>
    </div>
  );
}