import { TimeSession, CreateTimeSessionInput, StopTimeSessionInput } from '../entities/TimeSession';
import { EntityId } from '../types/base';

export interface ITimeSessionRepository {
  getByTaskId(taskId: EntityId, includeDeleted?: boolean): Promise<TimeSession[]>;
  getById(id: EntityId): Promise<TimeSession | null>;
  getActiveSession(): Promise<TimeSession | null>;
  create(input: CreateTimeSessionInput, deviceId: string): Promise<TimeSession>;
  stopSession(id: EntityId, input: StopTimeSessionInput, deviceId: string): Promise<TimeSession>;
  softDelete(id: EntityId, deviceId: string): Promise<void>;
  upsertRaw(session: TimeSession): Promise<void>;
  getAll(includeDeleted?: boolean): Promise<TimeSession[]>;
  getByDateRange(startDateIso: string, endDateIso: string, includeDeleted?: boolean): Promise<TimeSession[]>;
}
