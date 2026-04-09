import { validateEnv } from './env';

export default () => {
  const env = validateEnv(process.env as Record<string, unknown>);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    database: {
      url: env.DATABASE_URL,
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      name: env.POSTGRES_DB,
    },
    redis: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      tls: env.REDIS_TLS,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiry: env.JWT_EXPIRY,
      refreshExpiry: env.JWT_REFRESH_EXPIRY,
    },
    email: {
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM,
    },
    oauth: {
      frontendUrl: env.FRONTEND_URL,
      kakaoClientId: env.KAKAO_CLIENT_ID,
      kakaoClientSecret: env.KAKAO_CLIENT_SECRET,
      kakaoCallbackUrl: `${env.API_URL}/api/auth/kakao/callback`,
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleClientSecret: env.GOOGLE_CLIENT_SECRET,
      googleCallbackUrl: `${env.API_URL}/api/auth/google/callback`,
    },
    crawler: {
      concurrency: env.CRAWLER_CONCURRENCY,
      proxyUrl: env.PROXY_URL,
    },
    naver: {
      clientId: env.NAVER_CLIENT_ID,
      clientSecret: env.NAVER_CLIENT_SECRET,
    },
  };
};
