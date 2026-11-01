import { z } from 'zod';
import { SyncMetadata, EntityId } from '../types/base';

export interface Task extends SyncMetadata {
  id: EntityId;
  projectId: EntityId;
  columnId: EntityId;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  orderIndex: number;
}

export const TaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1, 'Il titolo del task è obbligatorio'),
  description: z.string().nullable().optional().default(null),
  estimatedMinutes: z.number().int().nonnegative().nullable().optional().default(null),
  orderIndex: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  revision: z.number().int().positive().default(1),
  deviceId: z.string().min(1),
});

export type CreateTaskInput = {
  projectId: EntityId;
  columnId: EntityId;
  title: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  orderIndex: number;
};

export type UpdateTaskInput = {
  columnId?: EntityId;
  title?: string;
  description?: string | null;
  estimatedMinutes?: number | null;
  orderIndex?: number;
};
