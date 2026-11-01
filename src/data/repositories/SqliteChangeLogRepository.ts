import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';
import {
  ChangeLogEntry,
  ChangeLogEntity,
  ChangeLogOperation,
} from '../../domain/entities/ChangeLog';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';

interface ChangeLogRow {
  id: string;
  entity: string;
  entity_id: string;
  operation: string;
  payload: string;
  timestamp: string;
  device_id: string;
  synced_at: string | null;
}

export class SqliteChangeLogRepository implements IChangeLogRepository {
  private db: IDatabaseAdapter;

  constructor(db: IDatabaseAdapter) {
    this.db = db;
  }

  async append(
    entity: ChangeLogEntity,
    entityId: EntityId,
    operation: ChangeLogOperation,
    payload: unknown,
    deviceId: string
  ): Promise<ChangeLogEntry> {
    const entry: ChangeLogEntry = {
      id: generateUuidV7(),
      entity,
      entityId,
      operation,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      timestamp: nowUtcIso(),
      deviceId,
      syncedAt: null,
    };

    await this.db.execute(
      `INSERT INTO change_log (id, entity, entity_id, operation, payload, timestamp, device_id, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.entity,
        entry.entityId,
        entry.operation,
        entry.payload,
        entry.timestamp,
        entry.deviceId,
        entry.syncedAt,
      ]
    );

    return entry;
  }

  async getUnsynced(): Promise<ChangeLogEntry[]> {
    const rows = await this.db.select<ChangeLogRow>(
      `SELECT id, entity, entity_id, operation, payload, timestamp, device_id, synced_at
       FROM change_log
       WHERE synced_at IS NULL
       ORDER BY timestamp ASC`
    );
    return rows.map(this.mapRowToEntry);
  }

  async markSynced(ids: EntityId[], syncedAtIso: string): Promise<void> {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    await this.db.execute(
      `UPDATE change_log SET synced_at = ? WHERE id IN (${placeholders})`,
      [syncedAtIso, ...ids]
    );
  }

  async getAll(): Promise<ChangeLogEntry[]> {
    const rows = await this.db.select<ChangeLogRow>(
      `SELECT id, entity, entity_id, operation, payload, timestamp, device_id, synced_at
       FROM change_log
       ORDER BY timestamp ASC`
    );
    return rows.map(this.mapRowToEntry);
  }

  private mapRowToEntry(row: ChangeLogRow): ChangeLogEntry {
    return {
      id: row.id,
      entity: row.entity as ChangeLogEntity,
      entityId: row.entity_id,
      operation: row.operation as ChangeLogOperation,
      payload: row.payload,
      timestamp: row.timestamp,
      deviceId: row.device_id,
      syncedAt: row.synced_at,
    };
  }
}
