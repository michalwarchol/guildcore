import type { DataSourceOptions } from 'typeorm';

export function createMigrationDataSourceOptions(
  databaseUrl: string,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    synchronize: false,
    entities: ['src/modules/**/*.entity.ts'],
    migrations: ['src/database/migrations/*.ts'],
  };
}
