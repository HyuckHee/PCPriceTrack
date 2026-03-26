import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import * as schema from './schema';

export const DATABASE_TOKEN = 'DATABASE';

export type Database = NodePgDatabase<typeof schema>;

export const databaseProviders = [
  {
    provide: 'PG_POOL',
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      return new Pool({
        connectionString: config.get<string>('database.url'),
        max: 20,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      });
    },
  },
  {
    provide: DATABASE_TOKEN,
    inject: ['PG_POOL'],
    useFactory: (pool: Pool): Database => {
      return drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });
    },
  },
];
