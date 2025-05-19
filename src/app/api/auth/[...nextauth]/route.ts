// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

const projectName = "authmodel"; // เปลี่ยนเป็นชื่อ Project


const handler = NextAuth({
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        // เก็บเฉพาะ Refresh Token หรือ Access Token ที่จำเป็น
        // หากไม่ต้องใช้งาน idToken ก็ไม่ต้องเก็บ
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    },
  },
  
  // Configure session handling to ensure it works with the basePath
  cookies: {
    sessionToken: {
      name: `${projectName}.next-auth.session-token`,
      options: {
        path: "/next-auth",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${projectName}.next-auth.callback-url`,
      options: {
        path: "/next-auth",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${projectName}.next-auth.csrf-token`,
      options: {
        path: "/next-auth",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
  }
});

export { handler as GET, handler as POST };