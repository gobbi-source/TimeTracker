import { z } from 'zod';
import { EntityId } from '../types/base';

export type ChangeLogEntity = 'client' | 'project' | 'kanban_column' | 'task' | 'time_session';
export type ChangeLogOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ChangeLogEntry {
  id: EntityId;
  entity: ChangeLogEntity;
  entityId: EntityId;
  operation: ChangeLogOperation;
  payload: string; // JSON string of the entity
  timestamp: string; // ISO 8601 UTC
  deviceId: string;
  syncedAt: string | null;
}

export const ChangeLogSchema = z.object({
  id: z.string().uuid(),
  entity: z.enum(['client', 'project', 'kanban_column', 'task', 'time_session']),
  entityId: z.string().uuid(),
  operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  payload: z.string(),
  timestamp: z.string(),
  deviceId: z.string().min(1),
  syncedAt: z.string().nullable().default(null),
});
