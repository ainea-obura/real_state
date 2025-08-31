import { jwtDecode } from "jwt-decode";
import { DefaultSession, DefaultUser, NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { refreshTokenAction, verifyOtpAction } from "@/actions/users/auth";

/** The shape of the JWT's payload */
interface DecodedToken {
  exp: number;
  iat: number;
}

/** Extend the default User object */
interface CustomUser extends DefaultUser {
  id: string;
  username: string;
  full_name: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  error?: string;
  company: string;
  type: string;
  force_password_change?: boolean;
}

/** Extend the default Session object */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: CustomUser;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: string;
  }
}

/** Extend the default JWT object */
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    full_name: string;
    email: string;
    image: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: string;
    company: string;
    type: string;
    force_password_change?: boolean;
  }
}

/**
 * 2) CREDENTIALS: OTP
 */
const otpCredentials = CredentialsProvider({
  id: "otp",
  name: "OTP",
  credentials: {
    email: { label: "Email", type: "text" },
    otp: { label: "OTP", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.otp) {
      throw new Error("OTP or Email is missing");
    }

    const res = await verifyOtpAction(credentials.email, credentials.otp);
    if (res.error) {
      throw new Error(res.message);
    }

    const decoded: DecodedToken = jwtDecode(res.access_token);
    const expiresAt = decoded.exp * 1000; // convert seconds -> ms

    return {
      id: res.user.id,
      username: res.user.username,
      full_name: res.user.full_name,
      email: res.user.email,
      image: res.user.avatar,
      company: res.user.company,
      type: res.user.type,
      force_password_change: res.user.force_password_change,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      expiresAt,
    };
  },
});

/**
 * 3) UTILITY: REFRESH ACCESS TOKEN
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    console.log("Attempting to refresh token...");
    console.log("Current token state:", {
      hasRefreshToken: !!token.refreshToken,
      refreshTokenLength: token.refreshToken?.length,
      currentExpiresAt: token.expiresAt
        ? new Date(token.expiresAt).toISOString()
        : "undefined",
    });

    const res = await refreshTokenAction(token.refreshToken);

    if (res.error) {
      console.error("Refresh token action failed:", res.error, res.message);
      throw new Error(res.error || "Refresh token error");
    }

    if (!res.access_token) {
      console.error("No access token in refresh response:", res);
      throw new Error("No access token received");
    }

    const decoded: DecodedToken = jwtDecode(res.access_token);
    const expiresAt = decoded.exp * 1000; // convert seconds -> ms

    console.log(
      "Token refreshed successfully, new expiry:",
      new Date(expiresAt)
    );

    return {
      ...token,
      id: res.user?.id || token.id,
      username: res.user?.username || token.username,
      full_name: res.user?.full_name || token.full_name,
      email: res.user?.email || token.email,
      image: token.image,
      company: res.user?.company || token.company,
      type: res.user?.type || token.type,
      force_password_change:
        res.user?.force_password_change ?? token.force_password_change,
      accessToken: res.access_token,
      refreshToken: res.refresh_token ?? token.refreshToken,
      expiresAt,
      error: undefined, // clear any existing error
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * 4) NEXTAUTH CONFIG
 */
export const authOptions: NextAuthOptions = {
  providers: [otpCredentials],
  session: {
    strategy: "jwt",
    //TODO: Make it 15 Minutes
    maxAge: 7 * 60 * 60, // 7 hours
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT callback: New user login");
        const customUser = user as CustomUser;
        return {
          ...token,
          id: customUser.id,
          username: customUser.username,
          full_name: customUser.full_name,
          email: customUser.email || "",
          image: customUser.image || "",
          company: customUser.company,
          type: customUser.type,
          force_password_change: customUser.force_password_change,
          accessToken: customUser.accessToken,
          refreshToken: customUser.refreshToken,
          expiresAt: customUser.expiresAt,
        };
      }

      // Check if token is expired or about to expire (refresh 5 minutes early)
      const now = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

      // Debug logging
      console.log("JWT callback: Token check:", {
        now: new Date(now).toISOString(),
        expiresAt: token.expiresAt
          ? new Date(token.expiresAt).toISOString()
          : "undefined",
        timeLeft: token.expiresAt
          ? Math.floor((token.expiresAt - now) / 1000)
          : "undefined",
        shouldRefresh: token.expiresAt
          ? now >= token.expiresAt - bufferTime
          : false,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
      });

      if (token.expiresAt && now < token.expiresAt - bufferTime) {
        console.log("JWT callback: Token still valid, not refreshing");
        return token; // Token is still valid
      }

      console.log(
        "JWT callback: Token expired or about to expire, refreshing..."
      );
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      console.log("Session callback: Creating session for token:", {
        hasId: !!token.id,
        hasAccessToken: !!token.accessToken,
        hasRefreshToken: !!token.refreshToken,
        expiresAt: token.expiresAt
          ? new Date(token.expiresAt).toISOString()
          : "undefined",
        error: token.error,
      });

      session.user = {
        id: token.id,
        username: token.username,
        full_name: token.full_name,
        email: token.email,
        image: token.image,
        company: token.company as string,
        type: token.type as string,
        force_password_change: token.force_password_change,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        error: token.error,
      };

      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      session.error = token.error;

      console.log("Session callback: Session created successfully");
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    signOut: "/sign-in",
  },
};
