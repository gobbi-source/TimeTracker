import { v7 as uuidv7 } from 'uuid';

export type EntityId = string;

export interface SyncMetadata {
  createdAt: string; // ISO 8601 UTC string (e.g. 2026-11-01T12:00:00.000Z)
  updatedAt: string; // ISO 8601 UTC string
  deletedAt: string | null; // ISO 8601 UTC string or null (Soft Delete)
  revision: number; // Incremental revision number, starts at 1
  deviceId: string; // ID of the device that authored or last modified this record
}

/**
 * Returns current timestamp in UTC ISO-8601 format with millisecond precision.
 */
export function nowUtcIso(): string {
  return new Date().toISOString();
}

/**
 * Generates an RFC 9562 compliant UUID version 7.
 * UUIDv7 contains a 48-bit timestamp prefix, making it chronologically sortable.
 */
export function generateUuidV7(): EntityId {
  return uuidv7();
}
