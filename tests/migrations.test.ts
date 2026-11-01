import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsDatabaseAdapter } from '../src/data/database/SqlJsDatabaseAdapter';
import { MigrationRunner } from '../src/data/migrations/MigrationRunner';
import { allMigrations } from '../src/data/migrations';
import { SqliteChangeLogRepository } from '../src/data/repositories/SqliteChangeLogRepository';
import { DeviceService } from '../src/services/deviceService';
import { generateUuidV7, nowUtcIso } from '../src/domain/types/base';

describe('Step 2: Migrations, Schema & Oplog', () => {
  let db: SqlJsDatabaseAdapter;

  beforeEach(async () => {
    db = await SqlJsDatabaseAdapter.createInMemory();
  });

  afterEach(async () => {
    await db.close();
  });

  it('runs initial schema migration successfully', async () => {
    const runner = new MigrationRunner(db);
    const applied = await runner.run(allMigrations);

    expect(applied).toBe(1);

    const history = await runner.getAppliedMigrations();
    expect(history.length).toBe(1);
    expect(history[0].name).toBe('001_initial_schema');
    expect(history[0].version).toBe(1);
  });

  it('is idempotent when run multiple times', async () => {
    const runner = new MigrationRunner(db);
    const appliedFirst = await runner.run(allMigrations);
    expect(appliedFirst).toBe(1);

    const appliedSecond = await runner.run(allMigrations);
    expect(appliedSecond).toBe(0);
  });

  it('creates all expected tables and indexes in SQLite', async () => {
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    const tables = await db.select<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC"
    );
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('app_settings');
    expect(tableNames).toContain('clients');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('kanban_columns');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('time_sessions');
    expect(tableNames).toContain('change_log');
    expect(tableNames).toContain('schema_migrations');
  });

  it('records mutations in ChangeLog (Oplog) with deviceId and timestamp', async () => {
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    const changeLogRepo = new SqliteChangeLogRepository(db);
    const testDeviceId = 'device-test-xyz';
    const clientId = generateUuidV7();

    const clientPayload = {
      id: clientId,
      name: 'Egitto SpA',
      color: '#f59e0b',
      createdAt: nowUtcIso(),
      updatedAt: nowUtcIso(),
      deletedAt: null,
      revision: 1,
      deviceId: testDeviceId,
    };

    // 1. Append CREATE operation
    const entry = await changeLogRepo.append(
      'client',
      clientId,
      'CREATE',
      clientPayload,
      testDeviceId
    );

    expect(entry.id).toBeDefined();
    expect(entry.entity).toBe('client');
    expect(entry.entityId).toBe(clientId);
    expect(entry.operation).toBe('CREATE');
    expect(entry.deviceId).toBe(testDeviceId);
    expect(entry.syncedAt).toBeNull();

    // 2. Query unsynced
    const unsynced = await changeLogRepo.getUnsynced();
    expect(unsynced.length).toBe(1);
    expect(unsynced[0].entityId).toBe(clientId);

    // 3. Mark as synced
    await changeLogRepo.markSynced([entry.id], nowUtcIso());

    const unsyncedAfter = await changeLogRepo.getUnsynced();
    expect(unsyncedAfter.length).toBe(0);

    const all = await changeLogRepo.getAll();
    expect(all.length).toBe(1);
    expect(all[0].syncedAt).not.toBeNull();
  });

  it('generates and persists unique deviceId via DeviceService', async () => {
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    const deviceService = new DeviceService(db);
    const devId1 = await deviceService.getDeviceId();
    expect(devId1).toMatch(/^dev_/);

    // Calling again returns identical ID
    const devId2 = await deviceService.getDeviceId();
    expect(devId2).toBe(devId1);

    // Re-instantiating service reads from database
    const freshService = new DeviceService(db);
    const devId3 = await freshService.getDeviceId();
    expect(devId3).toBe(devId1);
  });
});
