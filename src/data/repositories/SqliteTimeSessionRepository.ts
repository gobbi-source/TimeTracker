import { ITimeSessionRepository } from '../../domain/repositories/ITimeSessionRepository';
import {
  TimeSession,
  CreateTimeSessionInput,
  StopTimeSessionInput,
} from '../../domain/entities/TimeSession';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';

interface SessionRow {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  device_id: string;
}

export class SqliteTimeSessionRepository implements ITimeSessionRepository {
  private db: IDatabaseAdapter;
  private changeLogRepo: IChangeLogRepository;

  constructor(db: IDatabaseAdapter, changeLogRepo: IChangeLogRepository) {
    this.db = db;
    this.changeLogRepo = changeLogRepo;
  }

  async getAll(includeDeleted = false): Promise<TimeSession[]> {
    const query = includeDeleted
      ? 'SELECT * FROM time_sessions ORDER BY start_time DESC'
      : 'SELECT * FROM time_sessions WHERE deleted_at IS NULL ORDER BY start_time DESC';
    const rows = await this.db.select<SessionRow>(query);
    return rows.map(this.mapRowToEntity);
  }

  async getByTaskId(taskId: EntityId, includeDeleted = false): Promise<TimeSession[]> {
    const query = includeDeleted
      ? 'SELECT * FROM time_sessions WHERE task_id = ? ORDER BY start_time DESC'
      : 'SELECT * FROM time_sessions WHERE task_id = ? AND deleted_at IS NULL ORDER BY start_time DESC';
    const rows = await this.db.select<SessionRow>(query, [taskId]);
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: EntityId): Promise<TimeSession | null> {
    const rows = await this.db.select<SessionRow>('SELECT * FROM time_sessions WHERE id = ?', [
      id,
    ]);
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async getActiveSession(): Promise<TimeSession | null> {
    const rows = await this.db.select<SessionRow>(
      'SELECT * FROM time_sessions WHERE end_time IS NULL AND deleted_at IS NULL ORDER BY start_time DESC LIMIT 1'
    );
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async create(input: CreateTimeSessionInput, deviceId: string): Promise<TimeSession> {
    const now = nowUtcIso();
    const session: TimeSession = {
      id: generateUuidV7(),
      taskId: input.taskId,
      startTime: input.startTime,
      endTime: null,
      note: input.note?.trim() || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO time_sessions (id, task_id, start_time, end_time, note, created_at, updated_at, deleted_at, revision, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.id,
          session.taskId,
          session.startTime,
          session.endTime,
          session.note,
          session.createdAt,
          session.updatedAt,
          session.deletedAt,
          session.revision,
          session.deviceId,
        ]
      );

      await this.changeLogRepo.append('time_session', session.id, 'CREATE', session, deviceId);
    });

    return session;
  }

  async stopSession(
    id: EntityId,
    input: StopTimeSessionInput,
    deviceId: string
  ): Promise<TimeSession> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`TimeSession with id "${id}" not found.`);
    }

    const now = nowUtcIso();
    const updated: TimeSession = {
      ...existing,
      endTime: input.endTime,
      note: input.note !== undefined ? (input.note?.trim() || null) : existing.note,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE time_sessions
         SET end_time = ?, note = ?, updated_at = ?, revision = ?, device_id = ?
         WHERE id = ?`,
        [
          updated.endTime,
          updated.note,
          updated.updatedAt,
          updated.revision,
          updated.deviceId,
          updated.id,
        ]
      );

      await this.changeLogRepo.append('time_session', updated.id, 'UPDATE', updated, deviceId);
    });

    return updated;
  }

  async softDelete(id: EntityId, deviceId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const now = nowUtcIso();
    const updated: TimeSession = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE time_sessions SET deleted_at = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [updated.deletedAt, updated.updatedAt, updated.revision, updated.deviceId, updated.id]
      );

      await this.changeLogRepo.append('time_session', updated.id, 'DELETE', updated, deviceId);
    });
  }

  async upsertRaw(session: TimeSession): Promise<void> {
    await this.db.execute(
      `INSERT INTO time_sessions (id, task_id, start_time, end_time, note, created_at, updated_at, deleted_at, revision, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         task_id = excluded.task_id,
         start_time = excluded.start_time,
         end_time = excluded.end_time,
         note = excluded.note,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision,
         device_id = excluded.device_id`,
      [
        session.id,
        session.taskId,
        session.startTime,
        session.endTime,
        session.note,
        session.createdAt,
        session.updatedAt,
        session.deletedAt,
        session.revision,
        session.deviceId,
      ]
    );
  }

  async getByDateRange(
    startDateIso: string,
    endDateIso: string,
    includeDeleted = false
  ): Promise<TimeSession[]> {
    const query = includeDeleted
      ? `SELECT * FROM time_sessions WHERE start_time >= ? AND start_time <= ? ORDER BY start_time ASC`
      : `SELECT * FROM time_sessions WHERE start_time >= ? AND start_time <= ? AND deleted_at IS NULL ORDER BY start_time ASC`;
    const rows = await this.db.select<SessionRow>(query, [startDateIso, endDateIso]);
    return rows.map(this.mapRowToEntity);
  }

  async getTotalTrackedSecondsMap(projectId?: EntityId): Promise<Record<EntityId, number>> {
    // Computes total completed seconds per task
    const query = projectId
      ? `SELECT s.task_id, s.start_time, s.end_time
         FROM time_sessions s
         JOIN tasks t ON s.task_id = t.id
         WHERE t.project_id = ? AND s.deleted_at IS NULL AND s.end_time IS NOT NULL`
      : `SELECT task_id, start_time, end_time
         FROM time_sessions
         WHERE deleted_at IS NULL AND end_time IS NOT NULL`;

    const rows = await this.db.select<{ task_id: string; start_time: string; end_time: string }>(
      query,
      projectId ? [projectId] : []
    );

    const totals: Record<EntityId, number> = {};
    for (const row of rows) {
      const startMs = new Date(row.start_time).getTime();
      const endMs = new Date(row.end_time).getTime();
      const diffSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
      totals[row.task_id] = (totals[row.task_id] || 0) + diffSec;
    }
    return totals;
  }

  private mapRowToEntity(row: SessionRow): TimeSession {
    return {
      id: row.id,
      taskId: row.task_id,
      startTime: row.start_time,
      endTime: row.end_time,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      revision: row.revision,
      deviceId: row.device_id,
    };
  }
}
