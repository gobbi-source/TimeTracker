import { describe, it, expect } from 'vitest';
import { generateUuidV7, nowUtcIso } from '../src/domain/types/base';
import { ClientSchema } from '../src/domain/entities/Client';
import { ProjectSchema } from '../src/domain/entities/Project';
import { TaskSchema } from '../src/domain/entities/Task';

describe('Domain Foundations', () => {
  it('generates valid UUID v7 with chronological order', async () => {
    const id1 = generateUuidV7();
    // sleep a few milliseconds to ensure timestamp difference
    await new Promise((res) => setTimeout(res, 5));
    const id2 = generateUuidV7();

    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(id2 > id1).toBe(true);
  });

  it('generates UTC ISO-8601 timestamps', () => {
    const now = nowUtcIso();
    expect(now).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('validates Client schema with sync metadata', () => {
    const validClient = {
      id: generateUuidV7(),
      name: 'Egitto',
      notes: 'Cliente storico',
      color: '#3b82f6',
      createdAt: nowUtcIso(),
      updatedAt: nowUtcIso(),
      deletedAt: null,
      revision: 1,
      deviceId: 'device-test-01',
    };

    const parsed = ClientSchema.safeParse(validClient);
    expect(parsed.success).toBe(true);
  });

  it('validates Project schema with optional client association', () => {
    const clientId = generateUuidV7();
    const validProject = {
      id: generateUuidV7(),
      clientId: clientId,
      name: 'Piramide',
      description: 'Costruzione grande piramide',
      color: '#10b981',
      createdAt: nowUtcIso(),
      updatedAt: nowUtcIso(),
      deletedAt: null,
      revision: 1,
      deviceId: 'device-test-01',
    };

    const parsed = ProjectSchema.safeParse(validProject);
    expect(parsed.success).toBe(true);
  });

  it('validates Task schema with column association and estimate', () => {
    const validTask = {
      id: generateUuidV7(),
      projectId: generateUuidV7(),
      columnId: generateUuidV7(),
      title: 'Disegnare le fondamenta',
      description: 'Specifiche tecniche',
      estimatedMinutes: 120,
      orderIndex: 0,
      createdAt: nowUtcIso(),
      updatedAt: nowUtcIso(),
      deletedAt: null,
      revision: 1,
      deviceId: 'device-test-01',
    };

    const parsed = TaskSchema.safeParse(validTask);
    expect(parsed.success).toBe(true);
  });
});
