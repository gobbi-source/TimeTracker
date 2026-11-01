import { IClientRepository } from '../../domain/repositories/IClientRepository';
import { Client, CreateClientInput, UpdateClientInput } from '../../domain/entities/Client';
import { EntityId, generateUuidV7, nowUtcIso } from '../../domain/types/base';
import { IDatabaseAdapter } from '../database/DatabaseAdapter';
import { IChangeLogRepository } from '../../domain/repositories/IChangeLogRepository';

interface ClientRow {
  id: string;
  name: string;
  notes: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  revision: number;
  device_id: string;
}

export class SqliteClientRepository implements IClientRepository {
  private db: IDatabaseAdapter;
  private changeLogRepo: IChangeLogRepository;

  constructor(db: IDatabaseAdapter, changeLogRepo: IChangeLogRepository) {
    this.db = db;
    this.changeLogRepo = changeLogRepo;
  }

  async getAll(includeDeleted = false): Promise<Client[]> {
    const query = includeDeleted
      ? 'SELECT * FROM clients ORDER BY name ASC'
      : 'SELECT * FROM clients WHERE deleted_at IS NULL ORDER BY name ASC';
    const rows = await this.db.select<ClientRow>(query);
    return rows.map(this.mapRowToEntity);
  }

  async getById(id: EntityId): Promise<Client | null> {
    const rows = await this.db.select<ClientRow>('SELECT * FROM clients WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return this.mapRowToEntity(rows[0]);
  }

  async create(input: CreateClientInput, deviceId: string): Promise<Client> {
    const now = nowUtcIso();
    const client: Client = {
      id: generateUuidV7(),
      name: input.name.trim(),
      notes: input.notes?.trim() || null,
      color: input.color?.trim() || null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      revision: 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO clients (id, name, notes, color, created_at, updated_at, deleted_at, revision, device_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.name,
          client.notes,
          client.color,
          client.createdAt,
          client.updatedAt,
          client.deletedAt,
          client.revision,
          client.deviceId,
        ]
      );

      await this.changeLogRepo.append('client', client.id, 'CREATE', client, deviceId);
    });

    return client;
  }

  async update(id: EntityId, input: UpdateClientInput, deviceId: string): Promise<Client> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Client with id "${id}" not found.`);
    }

    const now = nowUtcIso();
    const updated: Client = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      notes: input.notes !== undefined ? (input.notes?.trim() || null) : existing.notes,
      color: input.color !== undefined ? (input.color?.trim() || null) : existing.color,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE clients
         SET name = ?, notes = ?, color = ?, updated_at = ?, revision = ?, device_id = ?
         WHERE id = ?`,
        [
          updated.name,
          updated.notes,
          updated.color,
          updated.updatedAt,
          updated.revision,
          updated.deviceId,
          updated.id,
        ]
      );

      await this.changeLogRepo.append('client', updated.id, 'UPDATE', updated, deviceId);
    });

    return updated;
  }

  async softDelete(id: EntityId, deviceId: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    const now = nowUtcIso();
    const updated: Client = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
      revision: existing.revision + 1,
      deviceId,
    };

    await this.db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE clients SET deleted_at = ?, updated_at = ?, revision = ?, device_id = ? WHERE id = ?`,
        [updated.deletedAt, updated.updatedAt, updated.revision, updated.deviceId, updated.id]
      );

      await this.changeLogRepo.append('client', updated.id, 'DELETE', updated, deviceId);
    });
  }

  async upsertRaw(client: Client): Promise<void> {
    await this.db.execute(
      `INSERT INTO clients (id, name, notes, color, created_at, updated_at, deleted_at, revision, device_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         notes = excluded.notes,
         color = excluded.color,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         deleted_at = excluded.deleted_at,
         revision = excluded.revision,
         device_id = excluded.device_id`,
      [
        client.id,
        client.name,
        client.notes,
        client.color,
        client.createdAt,
        client.updatedAt,
        client.deletedAt,
        client.revision,
        client.deviceId,
      ]
    );
  }

  private mapRowToEntity(row: ClientRow): Client {
    return {
      id: row.id,
      name: row.name,
      notes: row.notes,
      color: row.color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      revision: row.revision,
      deviceId: row.device_id,
    };
  }
}
