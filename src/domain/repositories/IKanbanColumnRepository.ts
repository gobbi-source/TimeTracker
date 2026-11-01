import { KanbanColumn, CreateColumnInput, UpdateColumnInput } from '../entities/KanbanColumn';
import { EntityId } from '../types/base';

export interface IKanbanColumnRepository {
  getByProjectId(projectId: EntityId, includeDeleted?: boolean): Promise<KanbanColumn[]>;
  getById(id: EntityId): Promise<KanbanColumn | null>;
  create(input: CreateColumnInput, deviceId: string): Promise<KanbanColumn>;
  update(id: EntityId, input: UpdateColumnInput, deviceId: string): Promise<KanbanColumn>;
  softDelete(id: EntityId, deviceId: string): Promise<void>;
  upsertRaw(column: KanbanColumn): Promise<void>;
  getAll(includeDeleted?: boolean): Promise<KanbanColumn[]>;
}
