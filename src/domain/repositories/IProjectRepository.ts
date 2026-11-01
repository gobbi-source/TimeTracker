import { Project, CreateProjectInput, UpdateProjectInput } from '../entities/Project';
import { EntityId } from '../types/base';

export interface IProjectRepository {
  getAll(includeDeleted?: boolean): Promise<Project[]>;
  getById(id: EntityId): Promise<Project | null>;
  getByClientId(clientId: EntityId, includeDeleted?: boolean): Promise<Project[]>;
  create(input: CreateProjectInput, deviceId: string): Promise<Project>;
  update(id: EntityId, input: UpdateProjectInput, deviceId: string): Promise<Project>;
  softDelete(id: EntityId, deviceId: string): Promise<void>;
  upsertRaw(project: Project): Promise<void>;
}
