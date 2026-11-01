import { Task, CreateTaskInput, UpdateTaskInput } from '../entities/Task';
import { EntityId } from '../types/base';

export interface ITaskRepository {
  getByProjectId(projectId: EntityId, includeDeleted?: boolean): Promise<Task[]>;
  getByColumnId(columnId: EntityId, includeDeleted?: boolean): Promise<Task[]>;
  getById(id: EntityId): Promise<Task | null>;
  create(input: CreateTaskInput, deviceId: string): Promise<Task>;
  update(id: EntityId, input: UpdateTaskInput, deviceId: string): Promise<Task>;
  moveTask(id: EntityId, targetColumnId: EntityId, newOrderIndex: number, deviceId: string): Promise<Task>;
  softDelete(id: EntityId, deviceId: string): Promise<void>;
  upsertRaw(task: Task): Promise<void>;
  getAll(includeDeleted?: boolean): Promise<Task[]>;
}
