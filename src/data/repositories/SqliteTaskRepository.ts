import { ITaskRepository } from '../../domain/repositories/ITaskRepository';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../domain/entities/Task';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';

interface TaskRow {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  device_id: string;
}

export class SqliteTaskRepository implements ITaskRepository {
  private db: IDatabaseAdapter;
  private changeLogRepo: IChangeLogRepository;

  constructor(db: IDatabaseAdapter, changeLogRepo: IChangeLogRepository) {
    this.db = db;
    this.changeLogRepo = changeLogRepo;
  }

  async getAll(includeDeleted = false): Promise<Task[]> {
    const query = includeDeleted
      ? 'SELECT * FROM tasks ORDER BY order_index ASC'
      : 'SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY order_index ASC';
    const rows = await this.db.select<TaskRow>(query);
    return rows.map(this.mapRowToEntity);
  }

  async getByProjectId(projectId: EntityId, includeDeleted = false): Promise<Task[]> {
    const query = includeDeleted
      ? 'SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index ASC'
      : 'SELECT * FROM tasks WHERE project_id = ? AND deleted_at IS NULL ORDER BY order_index ASC';
    const rows = await this.db.select<TaskRow>(query, [projectId]);
    return rows.map(this.mapRowToEntity);
  }

  async getByColumnId(columnId: EntityId, includeDeleted = false): Promise<Task[]> {
    const query = includeDeleted
      ? 'SELECT * FROM tasks WHERE column_id = ? ORDER BY order_index ASC'
      : 'SELECT * FROM tasks WHERE column_id = ? AND deleted_at IS NULL ORDER BY order_index ASC';
    const rows = await this.db.select<TaskRow>(query, [columnId]);
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: EntityId): Promise<Task | null> {
    const rows = await this.db.select<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async create(input: CreateTaskInput, deviceId: string): Promise<Task> {
    const now = nowUtcIso();
    const task: Task = {
      id: generateUuidV7(),
      projectId: input.projectId,
      columnId: input.columnId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      orderIndex: input.orderIndex,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO tasks (id, project_id, column_id, title, description, estimated_minutes, order_index, created_at, updated_at, deleted_at, revision, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.projectId,
          task.columnId,
          task.title,
          task.description,
          task.estimatedMinutes,
          task.orderIndex,
          task.createdAt,
          task.updatedAt,
          task.deletedAt,
          task.revision,
          task.deviceId,
        ]
      );

      await this.changeLogRepo.append('task', task.id, 'CREATE', task, deviceId);
    });

    return task;
  }

  async update(id: EntityId, input: UpdateTaskInput, deviceId: string): Promise<Task> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Task with id "${id}" not found.`);
    }

    const now = nowUtcIso();
    const updated: Task = {
      ...existing,
      columnId: input.columnId !== undefined ? input.columnId : existing.columnId,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? (input.description?.trim() || null) : existing.description,
      estimatedMinutes: input.estimatedMinutes !== undefined ? input.estimatedMinutes : existing.estimatedMinutes,
      orderIndex: input.orderIndex !== undefined ? input.orderIndex : existing.orderIndex,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE tasks
         SET column_id = ?, title = ?, description = ?, estimated_minutes = ?, order_index = ?, updated_at = ?, revision = ?, device_id = ?
         WHERE id = ?`,
        [
          updated.columnId,
          updated.title,
          updated.description,
          updated.estimatedMinutes,
          updated.orderIndex,
          updated.updatedAt,
          updated.revision,
          updated.deviceId,
          updated.id,
        ]
      );

      await this.changeLogRepo.append('task', updated.id, 'UPDATE', updated, deviceId);
    });

    return updated;
  }

  async moveTask(
    id: EntityId,
    targetColumnId: EntityId,
    newOrderIndex: number,
    deviceId: string
  ): Promise<Task> {
    return await this.update(
      id,
      {
        columnId: targetColumnId,
        orderIndex: newOrderIndex,
      },
      deviceId
    );
  }

  async softDelete(id: EntityId, deviceId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const now = nowUtcIso();
    const updated: Task = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE tasks SET deleted_at = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [updated.deletedAt, updated.updatedAt, updated.revision, updated.deviceId, updated.id]
      );

      await this.changeLogRepo.append('task', updated.id, 'DELETE', updated, deviceId);
    });
  }

  async upsertRaw(task: Task): Promise<void> {
    await this.db.execute(
      `INSERT INTO tasks (id, project_id, column_id, title, description, estimated_minutes, order_index, created_at, updated_at, deleted_at, revision, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         project_id = excluded.project_id,
         column_id = excluded.column_id,
         title = excluded.title,
         description = excluded.description,
         estimated_minutes = excluded.estimated_minutes,
         order_index = excluded.order_index,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision,
         device_id = excluded.device_id`,
      [
        task.id,
        task.projectId,
        task.columnId,
        task.title,
        task.description,
        task.estimatedMinutes,
        task.orderIndex,
        task.createdAt,
        task.updatedAt,
        task.deletedAt,
        task.revision,
        task.deviceId,
      ]
    );
  }

  private mapRowToEntity(row: TaskRow): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      columnId: row.column_id,
      title: row.title,
      description: row.description,
      estimatedMinutes: row.estimated_minutes,
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      revision: row.revision,
      deviceId: row.device_id,
    };
  }
}
