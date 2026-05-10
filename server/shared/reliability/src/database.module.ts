import { Module, Global } from '@nestjs/common';

@Global()
@Module({})
export class DatabaseHardeningModule {
  /**
   * Recommended production settings for PostgreSQL connection pooling
   */
  static getDatabaseConfig() {
    const connectionLimit = process.env.DB_CONNECTION_LIMIT || '20';
    const poolTimeout = process.env.DB_POOL_TIMEOUT || '10';
    
    return {
      connectionString: `${process.env.DATABASE_URL}?connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`,
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
    };
  }
}
