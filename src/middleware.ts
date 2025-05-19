// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Customize this logic if you want to redirect different URLs differently
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    // Adjust these paths as needed for your application
    pages: {
      signIn: "/myapp",
    },
  }
);

export const config = {
  matcher: ["/protected/:path*"],
};