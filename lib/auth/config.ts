import type { NextAuthConfig } from "next-auth";

import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [],
  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST,
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
