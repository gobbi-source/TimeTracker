import initSqlJs, { Database, SqlJsStatic, BindParams, SqlValue } from 'sql.js';
import { IDatabaseAdapter, QueryResult } from './DatabaseAdapter';

let sqlJsPromise: Promise<SqlJsStatic> | null = null;

function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs();
  }
  return sqlJsPromise;
}

export class SqlJsDatabaseAdapter implements IDatabaseAdapter {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async createInMemory(): Promise<SqlJsDatabaseAdapter> {
    const SQL = await getSqlJs();
    const db = new SQL.Database();
    return new SqlJsDatabaseAdapter(db);
  }

  async execute(query: string, bindValues: unknown[] = []): Promise<QueryResult> {
    const bindObject = this.formatBindValues(bindValues);
    this.db.run(query, bindObject);
    const rowsAffected = this.db.getRowsModified();
    return {
      rowsAffected,
      lastInsertId: 0,
    };
  }

  async select<T>(query: string, bindValues: unknown[] = []): Promise<T[]> {
    const stmt = this.db.prepare(query);
    const bindObject = this.formatBindValues(bindValues);
    if (bindValues.length > 0) {
      stmt.bind(bindObject);
    }

    const results: T[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as unknown as T;
      results.push(row);
    }
    stmt.free();
    return results;
  }

  async transaction<T>(action: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T> {
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = await action(this);
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  exportBinary(): Uint8Array {
    return this.db.export();
  }

  private formatBindValues(values: unknown[]): BindParams {
    return values.map((val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'number' || typeof val === 'string') return val;
      if (val instanceof Uint8Array) return val;
      return String(val);
    }) as SqlValue[];
  }
}
