import { z } from 'zod';
import { SyncMetadata, EntityId } from '../types/base';

export interface TimeSession extends SyncMetadata {
  id: EntityId;
  taskId: EntityId;
  startTime: string; // ISO 8601 UTC
  endTime: string | null; // ISO 8601 UTC, null if currently running
  note: string | null;
}

export const TimeSessionSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  startTime: z.string(),
  endTime: z.string().nullable().default(null),
  note: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  revision: z.number().int().positive().default(1),
  deviceId: z.string().min(1),
});

export type CreateTimeSessionInput = {
  taskId: EntityId;
  startTime: string;
  note?: string | null;
};

export type StopTimeSessionInput = {
  endTime: string;
  note?: string | null;
};
