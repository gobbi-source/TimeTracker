import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { Migration } from './types';
import { nowUtcIso } from '../../domain/types/base';

export class MigrationRunner {
  private db: IDatabaseAdapter;

  constructor(db: IDatabaseAdapter) {
    this.db = db;
  }

  async run(migrations: Migration[]): Promise<number> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const rows = await this.db.select<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version ASC'
    );
    const appliedVersions = new Set(rows.map((r) => r.version));

    const sorted = [...migrations].sort((a, b) => a.version - b.version);
    let appliedCount = 0;

    for (const migration of sorted) {
      if (!appliedVersions.has(migration.version)) {
        await this.db.transaction(async (tx) => {
          await migration.up(tx);
          await tx.execute(
            'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
            [migration.version, migration.name, nowUtcIso()]
          );
        });
        appliedCount++;
      }
    }

    return appliedCount;
  }

  async getAppliedMigrations(): Promise<{ version: number; name: string; applied_at: string }[]> {
    return await this.db.select(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC'
    );
  }
}
