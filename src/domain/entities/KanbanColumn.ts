import { z } from 'zod';
import { SyncMetadata, EntityId } from '../types/base';

export interface KanbanColumn extends SyncMetadata {
  id: EntityId;
  projectId: EntityId;
  name: string;
  orderIndex: number;
}

export const KanbanColumnSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1, 'Il nome della colonna è obbligatorio'),
  orderIndex: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  revision: z.number().int().positive().default(1),
  deviceId: z.string().min(1),
});

export type CreateColumnInput = {
  projectId: EntityId;
  name: string;
  orderIndex: number;
};

export type UpdateColumnInput = {
  name?: string;
  orderIndex?: number;
};
