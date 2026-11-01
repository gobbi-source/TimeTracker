import Database from '@tauri-apps/plugin-sql';
import { IDatabaseAdapter, QueryResult } from './DatabaseAdapter';

export class TauriDatabaseAdapter implements IDatabaseAdapter {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async connect(dbPath = 'sqlite:timetracker.db'): Promise<TauriDatabaseAdapter> {
    const db = await Database.load(dbPath);
    return new TauriDatabaseAdapter(db);
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<QueryResult> {
    const res = await this.db.execute(query, bindValues);
    return {
      rowsAffected: res.rowsAffected ?? 0,
      lastInsertId: res.lastInsertId ?? 0,
    };
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T[]> {
    return await this.db.select<T[]>(query, bindValues);
  }

  async transaction<T>(action: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    await this.db.execute('BEGIN TRANSACTION');
    try {
      const result = await action(this);
      await this.db.execute('COMMIT');
      return result;
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}
