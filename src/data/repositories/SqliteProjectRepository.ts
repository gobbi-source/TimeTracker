import { IProjectRepository } from '../../domain/repositories/IProjectRepository';
import { Project, CreateProjectInput, UpdateProjectInput } from '../../domain/entities/Project';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';

interface ProjectRow {
  id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  device_id: string;
}

export class SqliteProjectRepository implements IProjectRepository {
  private db: IDatabaseAdapter;
  private changeLogRepo: IChangeLogRepository;

  constructor(db: IDatabaseAdapter, changeLogRepo: IChangeLogRepository) {
    this.db = db;
    this.changeLogRepo = changeLogRepo;
  }

  async getAll(includeDeleted = false): Promise<Project[]> {
    const query = includeDeleted
      ? 'SELECT * FROM projects ORDER BY name ASC'
      : 'SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY name ASC';
    const rows = await this.db.select<ProjectRow>(query);
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: EntityId): Promise<Project | null> {
    const rows = await this.db.select<ProjectRow>('SELECT * FROM projects WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async getByClientId(clientId: EntityId, includeDeleted = false): Promise<Project[]> {
    const query = includeDeleted
      ? 'SELECT * FROM projects WHERE client_id = ? ORDER BY name ASC'
      : 'SELECT * FROM projects WHERE client_id = ? AND deleted_at IS NULL ORDER BY name ASC';
    const rows = await this.db.select<ProjectRow>(query, [clientId]);
    return rows.map(this.mapRowToEntity);
  }

  async create(input: CreateProjectInput, deviceId: string): Promise<Project> {
    const now = nowUtcIso();
    const project: Project = {
      id: generateUuidV7(),
      clientId: input.clientId || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO projects (id, client_id, name, description, color, created_at, updated_at, deleted_at, revision, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.clientId,
          project.name,
          project.description,
          project.color,
          project.createdAt,
          project.updatedAt,
          project.deletedAt,
          project.revision,
          project.deviceId,
        ]
      );

      await this.changeLogRepo.append('project', project.id, 'CREATE', project, deviceId);
    });

    return project;
  }

  async update(id: EntityId, input: UpdateProjectInput, deviceId: string): Promise<Project> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Project with id "${id}" not found.`);
    }

    const now = nowUtcIso();
    const updated: Project = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      clientId: input.clientId !== undefined ? (input.clientId || null) : existing.clientId,
      description: input.description !== undefined ? (input.description?.trim() || null) : existing.description,
      color: input.color !== undefined ? (input.color?.trim() || null) : existing.color,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE projects
         SET name = ?, client_id = ?, description = ?, color = ?, updated_at = ?, revision = ?, device_id = ?
         WHERE id = ?`,
        [
          updated.name,
          updated.clientId,
          updated.description,
          updated.color,
          updated.updatedAt,
          updated.revision,
          updated.deviceId,
          updated.id,
        ]
      );

      await this.changeLogRepo.append('project', updated.id, 'UPDATE', updated, deviceId);
    });

    return updated;
  }

  async softDelete(id: EntityId, deviceId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const now = nowUtcIso();
    const updated: Project = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE projects SET deleted_at = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [updated.deletedAt, updated.updatedAt, updated.revision, updated.deviceId, updated.id]
      );

      await this.changeLogRepo.append('project', updated.id, 'DELETE', updated, deviceId);
    });
  }

  async upsertRaw(project: Project): Promise<void> {
    await this.db.execute(
      `INSERT INTO projects (id, client_id, name, description, color, created_at, updated_at, deleted_at, revision, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         client_id = excluded.client_id,
         name = excluded.name,
         description = excluded.description,
         color = excluded.color,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision,
         device_id = excluded.device_id`,
      [
        project.id,
        project.clientId,
        project.name,
        project.description,
        project.color,
        project.createdAt,
        project.updatedAt,
        project.deletedAt,
        project.revision,
        project.deviceId,
      ]
    );
  }

  private mapRowToEntity(row: ProjectRow): Project {
    return {
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      description: row.description,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      revision: row.revision,
      deviceId: row.device_id,
    };
  }
}
