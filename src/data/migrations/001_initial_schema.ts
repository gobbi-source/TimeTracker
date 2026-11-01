import { Migration } from './types';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';

export const migration001InitialSchema: Migration = {
  version: 1,
  name: '001_initial_schema',
  async up(db: IDatabaseAdapter): Promise<void> {
    // 1. Settings & metadata
    await db.execute(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 2. Clients table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        notes TEXT,
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        device_id TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_clients_deleted_at ON clients(deleted_at);`);

    // 3. Projects table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        device_id TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);`);

    // 4. Kanban Columns table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS kanban_columns (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        order_index REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        device_id TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_columns_project_order ON kanban_columns(project_id, order_index);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_columns_deleted_at ON kanban_columns(deleted_at);`);

    // 5. Tasks table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        column_id TEXT NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        estimated_minutes INTEGER,
        order_index REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        device_id TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_column_order ON tasks(column_id, order_index);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);`);

    // 6. Time Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        revision INTEGER NOT NULL DEFAULT 1,
        device_id TEXT NOT NULL
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_task_id ON time_sessions(task_id);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON time_sessions(start_time);`);

    // 7. Change Log (Oplog append-only table for sync and auditing)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS change_log (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        device_id TEXT NOT NULL,
        synced_at TEXT
      );
    `);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_changelog_timestamp ON change_log(timestamp);`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_changelog_synced ON change_log(synced_at);`);
  },
};
