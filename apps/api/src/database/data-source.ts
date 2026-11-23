import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createMigrationDataSourceOptions } from './data-source-options';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for migrations');
}

export default new DataSource(createMigrationDataSourceOptions(databaseUrl));
