import { IKanbanColumnRepository } from '../../domain/repositories/IKanbanColumnRepository';
import {
  KanbanColumn,
  CreateColumnInput,
  UpdateColumnInput,
} from '../../domain/entities/KanbanColumn';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';

interface ColumnRow {
  id: string;
  project_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  device_id: string;
}

export class SqliteKanbanColumnRepository implements IKanbanColumnRepository {
  private db: IDatabaseAdapter;
  private changeLogRepo: IChangeLogRepository;

  constructor(db: IDatabaseAdapter, changeLogRepo: IChangeLogRepository) {
    this.db = db;
    this.changeLogRepo = changeLogRepo;
  }

  async getAll(includeDeleted = false): Promise<KanbanColumn[]> {
    const query = includeDeleted
      ? 'SELECT * FROM kanban_columns ORDER BY order_index ASC'
      : 'SELECT * FROM kanban_columns WHERE deleted_at IS NULL ORDER BY order_index ASC';
    const rows = await this.db.select<ColumnRow>(query);
    return rows.map(this.mapRowToEntity);
  }

  async getByProjectId(projectId: EntityId, includeDeleted = false): Promise<KanbanColumn[]> {
    const query = includeDeleted
      ? 'SELECT * FROM kanban_columns WHERE project_id = ? ORDER BY order_index ASC'
      : 'SELECT * FROM kanban_columns WHERE project_id = ? AND deleted_at IS NULL ORDER BY order_index ASC';
    const rows = await this.db.select<ColumnRow>(query, [projectId]);
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: EntityId): Promise<KanbanColumn | null> {
    const rows = await this.db.select<ColumnRow>(
      'SELECT * FROM kanban_columns WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async create(input: CreateColumnInput, deviceId: string): Promise<KanbanColumn> {
    const now = nowUtcIso();
    const column: KanbanColumn = {
      id: generateUuidV7(),
      projectId: input.projectId,
      name: input.name.trim(),
      orderIndex: input.orderIndex,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO kanban_columns (id, project_id, name, order_index, created_at, updated_at, deleted_at, revision, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          column.id,
          column.projectId,
          column.name,
          column.orderIndex,
          column.createdAt,
          column.updatedAt,
          column.deletedAt,
          column.revision,
          column.deviceId,
        ]
      );

      await this.changeLogRepo.append('kanban_column', column.id, 'CREATE', column, deviceId);
    });

    return column;
  }

  async update(id: EntityId, input: UpdateColumnInput, deviceId: string): Promise<KanbanColumn> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Column with id "${id}" not found.`);
    }

    const now = nowUtcIso();
    const updated: KanbanColumn = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      orderIndex: input.orderIndex !== undefined ? input.orderIndex : existing.orderIndex,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE kanban_columns SET name = ?, order_index = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [
          updated.name,
          updated.orderIndex,
          updated.updatedAt,
          updated.revision,
          updated.deviceId,
          updated.id,
        ]
      );

      await this.changeLogRepo.append('kanban_column', updated.id, 'UPDATE', updated, deviceId);
    });

    return updated;
  }

  async softDelete(id: EntityId, deviceId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const now = nowUtcIso();
    const updated: KanbanColumn = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE kanban_columns SET deleted_at = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [updated.deletedAt, updated.updatedAt, updated.revision, updated.deviceId, updated.id]
      );

      await this.changeLogRepo.append('kanban_column', updated.id, 'DELETE', updated, deviceId);
    });
  }

  async upsertRaw(column: KanbanColumn): Promise<void> {
    await this.db.execute(
      `INSERT INTO kanban_columns (id, project_id, name, order_index, created_at, updated_at, deleted_at, revision, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         project_id = excluded.project_id,
         name = excluded.name,
         order_index = excluded.order_index,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision,
         device_id = excluded.device_id`,
      [
        column.id,
        column.projectId,
        column.name,
        column.orderIndex,
        column.createdAt,
        column.updatedAt,
        column.deletedAt,
        column.revision,
        column.deviceId,
      ]
    );
  }

  private mapRowToEntity(row: ColumnRow): KanbanColumn {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      revision: row.revision,
      deviceId: row.device_id,
    };
  }
}
