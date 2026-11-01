import { Client, CreateClientInput, UpdateClientInput } from '../entities/Client';
import { EntityId } from '../types/base';

export interface IClientRepository {
  getAll(includeDeleted?: boolean): Promise<Client[]>;
  getById(id: EntityId): Promise<Client | null>;
  create(input: CreateClientInput, deviceId: string): Promise<Client>;
  update(id: EntityId, input: UpdateClientInput, deviceId: string): Promise<Client>;
  softDelete(id: EntityId, deviceId: string): Promise<void>;
  upsertRaw(client: Client): Promise<void>; // Used by restore & sync
}
