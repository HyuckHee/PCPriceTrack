import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Admin
  ADMIN_SECRET: z.string().min(1),

  // Database
  DATABASE_URL: z.string().min(1),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),

  // Redis
  REDIS_MODE: z.enum(['disabled', 'local', 'upstash']).default('disabled'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(''),
  REDIS_TLS: z.coerce.boolean().default(false),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().default('1h'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // OAuth
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:3001'),
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Crawler
  CRAWLER_CONCURRENCY: z.coerce.number().default(3),
  PROXY_URL: z.string().optional(),

  // Naver Shopping API
  NAVER_CLIENT_ID: z.string().optional(),
  NAVER_CLIENT_SECRET: z.string().optional(),

  // LLM Spec Extraction (optional — falls back to parse-only mode)
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, errs]) => `  ${key}: ${errs?.join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return result.data;
}
