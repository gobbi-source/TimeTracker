import { ChangeLogEntry, ChangeLogEntity, ChangeLogOperation } from '../entities/ChangeLog';
import { EntityId } from '../types/base';

export interface IChangeLogRepository {
  append(
    entity: ChangeLogEntity,
    entityId: EntityId,
    operation: ChangeLogOperation,
    payload: unknown,
    deviceId: string
  ): Promise<ChangeLogEntry>;
  getUnsynced(): Promise<ChangeLogEntry[]>;
  markSynced(ids: EntityId[], syncedAtIso: string): Promise<void>;
  getAll(): Promise<ChangeLogEntry[]>;
}
