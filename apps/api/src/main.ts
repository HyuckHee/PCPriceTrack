import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;
  const pool = new Pool({ connectionString: databaseUrl, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: path.join(__dirname, 'database/migrations') });
  await pool.end();
  console.log('Migrations complete.');
}

async function bootstrap() {
  await runMigrations();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;
  const nodeEnv = config.get<string>('nodeEnv');

  // Global validation pipe — strips unknown properties, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter for consistent error response shape
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? true,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}

bootstrap();
