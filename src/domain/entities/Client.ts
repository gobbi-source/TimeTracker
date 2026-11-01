import { z } from 'zod';
import { SyncMetadata, EntityId } from '../types/base';

export interface Client extends SyncMetadata {
  id: EntityId;
  name: string;
  notes: string | null;
  color: string | null;
}

export const ClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Il nome del cliente è obbligatorio'),
  notes: z.string().nullable().optional().default(null),
  color: z.string().nullable().optional().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().default(null),
  revision: z.number().int().positive().default(1),
  deviceId: z.string().min(1),
});

export type CreateClientInput = {
  name: string;
  notes?: string | null;
  color?: string | null;
};

export type UpdateClientInput = {
  name?: string;
  notes?: string | null;
  color?: string | null;
};
