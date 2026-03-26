import { Global, Module } from '@nestjs/common';
import { databaseProviders, DATABASE_TOKEN } from './database.provider';

@Global()
@Module({
  providers: [...databaseProviders],
  exports: [DATABASE_TOKEN, 'PG_POOL'],
})
export class DatabaseModule {}
