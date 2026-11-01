import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsDatabaseAdapter } from '../src/data/database/SqlJsDatabaseAdapter';
import { MigrationRunner, allMigrations } from '../src/data/migrations';
import { SqliteChangeLogRepository } from '../src/data/repositories/SqliteChangeLogRepository';
import { SqliteClientRepository } from '../src/data/repositories/SqliteClientRepository';
import { SqliteProjectRepository } from '../src/data/repositories/SqliteProjectRepository';
import { SqliteKanbanColumnRepository } from '../src/data/repositories/SqliteKanbanColumnRepository';
import { DeviceService } from '../src/services/deviceService';
import { ClientService } from '../src/services/clientService';
import { ProjectService } from '../src/services/projectService';

describe('Step 3: Clients & Projects Repositories and Services', () => {
  let db: SqlJsDatabaseAdapter;
  let changeLogRepo: SqliteChangeLogRepository;
  let clientRepo: SqliteClientRepository;
  let projectRepo: SqliteProjectRepository;
  let columnRepo: SqliteKanbanColumnRepository;
  let deviceService: DeviceService;
  let clientService: ClientService;
  let projectService: ProjectService;

  beforeEach(async () => {
    db = await SqlJsDatabaseAdapter.createInMemory();
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    changeLogRepo = new SqliteChangeLogRepository(db);
    deviceService = new DeviceService(db);
    clientRepo = new SqliteClientRepository(db, changeLogRepo);
    projectRepo = new SqliteProjectRepository(db, changeLogRepo);
    columnRepo = new SqliteKanbanColumnRepository(db, changeLogRepo);

    clientService = new ClientService(clientRepo, deviceService);
    projectService = new ProjectService(projectRepo, columnRepo, deviceService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('creates client with UUIDv7, sync metadata and records CREATE oplog', async () => {
    const client = await clientService.createClient({
      name: 'Egitto',
      notes: 'Faraone e piramidi',
      color: '#f59e0b',
    });

    expect(client.id).toBeDefined();
    expect(client.name).toBe('Egitto');
    expect(client.color).toBe('#f59e0b');
    expect(client.deletedAt).toBeNull();
    expect(client.revision).toBe(1);

    // Verify Oplog recorded entry
    const oplog = await changeLogRepo.getAll();
    expect(oplog.length).toBe(1);
    expect(oplog[0].entity).toBe('client');
    expect(oplog[0].entityId).toBe(client.id);
    expect(oplog[0].operation).toBe('CREATE');
  });

  it('updates client, increments revision and records UPDATE oplog', async () => {
    const client = await clientService.createClient({
      name: 'Acme',
      notes: 'Old note',
      color: '#3b82f6',
    });

    const updated = await clientService.updateClient(client.id, {
      name: 'Acme Corp Inc.',
      notes: 'Updated note',
    });

    expect(updated.name).toBe('Acme Corp Inc.');
    expect(updated.notes).toBe('Updated note');
    expect(updated.color).toBe('#3b82f6'); // Preserved
    expect(updated.revision).toBe(2);

    const oplog = await changeLogRepo.getAll();
    expect(oplog.length).toBe(2);
    expect(oplog[1].operation).toBe('UPDATE');
  });

  it('archives (soft deletes) client and filters from active list', async () => {
    const client = await clientService.createClient({
      name: 'Cliente Temporaneo',
    });

    await clientService.archiveClient(client.id);

    const activeList = await clientService.getClients(false);
    expect(activeList.some((c) => c.id === client.id)).toBe(false);

    const allList = await clientService.getClients(true);
    const archived = allList.find((c) => c.id === client.id);
    expect(archived).toBeDefined();
    expect(archived?.deletedAt).not.toBeNull();
    expect(archived?.revision).toBe(2);

    const oplog = await changeLogRepo.getAll();
    expect(oplog.find((o) => o.operation === 'DELETE')).toBeDefined();
  });

  it('creates project linked to a client and generates default Kanban columns', async () => {
    const client = await clientService.createClient({
      name: 'Egitto',
    });

    const project = await projectService.createProject({
      name: 'Piramide',
      clientId: client.id,
      description: 'Grande monumento',
      color: '#eab308',
    });

    expect(project.id).toBeDefined();
    expect(project.clientId).toBe(client.id);
    expect(project.name).toBe('Piramide');

    // Default columns should be created
    const columns = await columnRepo.getByProjectId(project.id);
    expect(columns.length).toBe(3);
    expect(columns[0].name).toBe('Da fare');
    expect(columns[1].name).toBe('In corso');
    expect(columns[2].name).toBe('Fatto');
  });

  it('creates internal project without client', async () => {
    const project = await projectService.createProject({
      name: 'Progetto Personale Studio',
      clientId: null,
    });

    expect(project.clientId).toBeNull();
    const fetched = await projectService.getProjectById(project.id);
    expect(fetched?.clientId).toBeNull();
  });

  it('archiving a client preserves its associated projects intact', async () => {
    const client = await clientService.createClient({ name: 'Egitto' });
    const project = await projectService.createProject({
      name: 'Piramide',
      clientId: client.id,
    });

    // Archive client
    await clientService.archiveClient(client.id);

    // Project must still exist and be active
    const activeProjects = await projectService.getProjects(false);
    const proj = activeProjects.find((p) => p.id === project.id);
    expect(proj).toBeDefined();
    expect(proj?.clientId).toBe(client.id);
    expect(proj?.deletedAt).toBeNull();
  });
});
