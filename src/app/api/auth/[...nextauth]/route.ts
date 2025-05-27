// app/api/auth/[...nextauth]/route.ts
import NextAuth, { AuthOptions, TokenSet, User as NextAuthUser, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import KeycloakProvider from "next-auth/providers/keycloak";

const projectName = "authmodel"; // เปลี่ยนเป็นชื่อ Project

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the original token and an error property
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const tokenUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_ID!,
        client_secret: process.env.KEYCLOAK_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens: TokenSet = await response.json();

    if (!response.ok) {
      console.error("Error refreshing access token", refreshedTokens);
      // It's important to clear the refresh token if it's invalid
      // to prevent an infinite refresh loop.
      if (refreshedTokens.error === 'invalid_grant') {
        return {
          ...token,
          accessToken: undefined, // Clear access token
          refreshToken: undefined, // Clear refresh token
          accessTokenExpires: 0,
          error: "InvalidGrantError", // Specific error for client to handle (e.g., sign out)
        };
      }
      throw refreshedTokens;
    }

    console.log("Access token refreshed successfully");

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + (refreshedTokens.expires_in as number) * 1000,
      // Keycloak might send a new refresh_token. If so, use it. Otherwise, keep the old one.
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      // Do NOT store the new id_token here to keep the JWT small
    };
  } catch (error) {
    console.error("RefreshAccessTokenError", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      // The profile callback shapes the 'user' object.
      // The default Keycloak provider already does a good job creating a minimal user:
      // profile(profile) {
      //   return {
      //     id: profile.sub,
      //     name: profile.name ?? profile.preferred_username,
      //     email: profile.email,
      //     image: profile.picture, // Often null, doesn't take much space if it's a URL
      //   }
      // }
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }: { token: JWT; account: Account | null; user?: NextAuthUser }): Promise<JWT> {
      // Initial sign in
      if (account && user) {
        console.log("Initial sign in: Storing tokens and minimal user info in JWT.");
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Essential for refresh mechanism with JWT strategy

        // account.expires_at is in seconds, convert to milliseconds for Date.now() comparison
        if (account.expires_at) {
            token.accessTokenExpires = account.expires_at * 1000;
        }
        
        // Store minimal user information. The `user` object is already shaped by the provider's `profile` callback.
        // This typically includes id, name, email.
        token.user = user;

        // **DO NOT store account.id_token in the `token` object by default**
        // If you absolutely need the id_token on the client for some specific calls AFTER login,
        // you could pass it to the session, but be mindful of its size.
        // For most apps, the accessToken is for APIs, and user info is for display.
        // token.idToken = account.id_token; // <-- REMOVED TO SAVE SPACE

        // If you need specific claims from id_token (e.g., roles) and they are small:
        // You would decode account.id_token here (e.g., using jwt-decode library)
        // and add only those specific small claims to the token.
        // For example:
        // import { jwtDecode } from "jwt-decode"; // yarn add jwt-decode or npm install jwt-decode
        // const decodedIdToken = jwtDecode(account.id_token);
        // token.roles = decodedIdToken.realm_access?.roles; // Example: if roles are small

        return token;
      }

      // If token has an error (e.g. from a failed refresh), don't try to refresh again.
      if (token.error) {
        return token;
      }

      // Return previous token if the access token has not expired yet
      // Add a small buffer (e.g., 60 seconds) to refresh proactively.
      const bufferSeconds = 60;
      if (token.accessTokenExpires && Date.now() < ((token.accessTokenExpires as number) - bufferSeconds * 1000)) {
        // console.log("Access token is still valid");
        return token;
      }

      // Access token has expired or is about to expire, try to update it
      console.log("Access token expired or about to expire, attempting to refresh...");
      if (!token.refreshToken) {
        console.warn("No refresh token available, cannot refresh. User might need to sign in again.");
        // Clear out the token to effectively sign the user out on the next session check
        return { ...token, error: "NoRefreshTokenError", accessToken: undefined, accessTokenExpires: 0 };
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user data.
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined; // Propagate error to client
      
      // The token.user here comes from what we set in the jwt callback
      if (token.user) {
        session.user = token.user as NextAuthUser; // Ensure NextAuthUser type is used
      }

      // If you decided to store specific small claims (like roles) in the JWT:
      // session.roles = token.roles;

      // **DO NOT pass the full idToken to the session by default**
      // session.idToken = token.idToken as string | undefined; // <-- REMOVED TO SAVE SPACE

      // If the token has an error, the client-side can use this to sign the user out.
      if (token.error === "InvalidGrantError" || token.error === "RefreshAccessTokenError" || token.error === "NoRefreshTokenError") {
        // This indicates the session is no longer valid.
        // The client should handle this by signing the user out.
        console.warn(`Session callback: Propagating error to client: ${token.error}`);
      }
      
      return session;
    },
  },
  cookies: {
    // sessionToken: {
    //   name: `${projectName}.next-auth.session-token`,
    //   options: {
    //     path: "/next-auth",
    //     httpOnly: true,
    //     sameSite: "lax",
    //     secure: process.env.NODE_ENV === "production",
    //   },
    // },
    callbackUrl: {
      name: `${projectName}.next-auth.callback-url`,
      options: {
        path: "/next-auth",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    },
    // csrfToken: {
    //   // REVERT THIS LINE:
    //   // name: `__Host-${projectName}.next-auth.csrf-token`, // Using __Host- prefix
    //   // TO THIS (your previous working style, or the default NextAuth one):
    //   name: `${projectName}.next-auth.csrf-token`, // Or try the default: `__Secure-next-auth.csrf-token` or `next-auth.csrf-token`
    //   options: {
    //     path: "/next-auth",
    //     httpOnly: true,
    //     sameSite: "lax",
    //     secure: process.env.NODE_ENV === "production",
    //   },
    // },
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt", // Explicitly stating JWT strategy
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };