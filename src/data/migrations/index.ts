import { Migration } from './types';
import { migration001InitialSchema } from './001_initial_schema';

export const allMigrations: Migration[] = [migration001InitialSchema];

export * from './types';
export * from './MigrationRunner';
