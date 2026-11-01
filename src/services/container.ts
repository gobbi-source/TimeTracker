import { isTauri } from '@tauri-apps/api/core';
import { IDatabaseAdapter } from '../data/database/DatabaseAdapter';
import { TauriDatabaseAdapter } from '../data/database/TauriDatabaseAdapter';
import { SqlJsDatabaseAdapter } from '../data/database/SqlJsDatabaseAdapter';
import { MigrationRunner, allMigrations } from '../data/migrations';
import { SqliteChangeLogRepository } from '../data/repositories/SqliteChangeLogRepository';
import { SqliteClientRepository } from '../data/repositories/SqliteClientRepository';
import { SqliteProjectRepository } from '../data/repositories/SqliteProjectRepository';
import { SqliteKanbanColumnRepository } from '../data/repositories/SqliteKanbanColumnRepository';
import { DeviceService } from './deviceService';
import { ClientService } from './clientService';
import { ProjectService } from './projectService';

export interface ServiceContainer {
  db: IDatabaseAdapter;
  deviceService: DeviceService;
  clientService: ClientService;
  projectService: ProjectService;
  clientRepo: SqliteClientRepository;
  projectRepo: SqliteProjectRepository;
  columnRepo: SqliteKanbanColumnRepository;
  changeLogRepo: SqliteChangeLogRepository;
}

let containerPromise: Promise<ServiceContainer> | null = null;

export async function getServiceContainer(): Promise<ServiceContainer> {
  if (!containerPromise) {
    containerPromise = initializeContainer();
  }
  return containerPromise;
}

async function initializeContainer(): Promise<ServiceContainer> {
  let db: IDatabaseAdapter;

  if (isTauri()) {
    try {
      db = await TauriDatabaseAdapter.connect('sqlite:timetracker.db');
    } catch (err) {
      console.error('Failed to connect to Tauri SQLite, falling back to in-memory:', err);
      db = await SqlJsDatabaseAdapter.createInMemory();
    }
  } else {
    db = await SqlJsDatabaseAdapter.createInMemory();
  }

  // Run all migrations
  const migrationRunner = new MigrationRunner(db);
  await migrationRunner.run(allMigrations);

  // Repositories & Services
  const changeLogRepo = new SqliteChangeLogRepository(db);
  const deviceService = new DeviceService(db);
  const clientRepo = new SqliteClientRepository(db, changeLogRepo);
  const projectRepo = new SqliteProjectRepository(db, changeLogRepo);
  const columnRepo = new SqliteKanbanColumnRepository(db, changeLogRepo);

  const clientService = new ClientService(clientRepo, deviceService);
  const projectService = new ProjectService(projectRepo, columnRepo, deviceService);

  return {
    db,
    deviceService,
    clientService,
    projectService,
    clientRepo,
    projectRepo,
    columnRepo,
    changeLogRepo,
  };
}
