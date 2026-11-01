import { z } from 'zod';
import { SyncMetadata, EntityId } from '../types/base';

export interface Project extends SyncMetadata {
  id: EntityId;
  clientId: EntityId | null;
  name: string;
  description: string | null;
  color: string | null;
}

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().nullable().default(null),
  name: z.string().min(1, 'Il nome del progetto è obbligatorio'),
  description: z.string().nullable().optional().default(null),
  color: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  revision: z.number().int().positive().default(1),
  deviceId: z.string().min(1),
});

export type CreateProjectInput = {
  name: string;
  clientId?: EntityId | null;
  description?: string | null;
  color?: string | null;
};

export type UpdateProjectInput = {
  name?: string;
  clientId?: EntityId | null;
  description?: string | null;
  color?: string | null;
};
