import { z } from "zod";

const booleanFromString = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === "boolean" ? value : value === "true"));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),
  APP_NAME: z.string().default("RIBBAI OPS"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://postgres:postgres@localhost:5432/ribbai_ops?schema=public&connection_limit=10"),
  DIRECT_URL: z.string().url().optional(),

  AUTH_SECRET: z.string().min(32).default("local-development-auth-secret-change-me"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: booleanFromString.default(false),
  NEXTAUTH_URL: z.string().url().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default("local-supabase-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("ribbai-ops"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  AUDIT_LOG_ENABLED: booleanFromString.default(true),

  PLAYWRIGHT_TEST_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;
