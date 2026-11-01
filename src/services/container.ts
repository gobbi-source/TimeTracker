import { isTauri } from '@tauri-apps/api/core';
import { IDatabaseAdapter } from '../data/database/DatabaseAdapter';
import { TauriDatabaseAdapter } from '../data/database/TauriDatabaseAdapter';
import { SqlJsDatabaseAdapter } from '../data/database/SqlJsDatabaseAdapter';
import { MigrationRunner, allMigrations } from '../data/migrations';
import { SqliteChangeLogRepository } from '../data/repositories/SqliteChangeLogRepository';
import { SqliteClientRepository } from '../data/repositories/SqliteClientRepository';
import { SqliteProjectRepository } from '../data/repositories/SqliteProjectRepository';
import { SqliteKanbanColumnRepository } from '../data/repositories/SqliteKanbanColumnRepository';
import { SqliteTaskRepository } from '../data/repositories/SqliteTaskRepository';
import { SqliteTimeSessionRepository } from '../data/repositories/SqliteTimeSessionRepository';
import { DeviceService } from './deviceService';
import { ClientService } from './clientService';
import { ProjectService } from './projectService';
import { KanbanService } from './kanbanService';

export interface ServiceContainer {
  db: IDatabaseAdapter;
  deviceService: DeviceService;
  clientService: ClientService;
  projectService: ProjectService;
  kanbanService: KanbanService;
  clientRepo: SqliteClientRepository;
  projectRepo: SqliteProjectRepository;
  columnRepo: SqliteKanbanColumnRepository;
  taskRepo: SqliteTaskRepository;
  sessionRepo: SqliteTimeSessionRepository;
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
  const taskRepo = new SqliteTaskRepository(db, changeLogRepo);
  const sessionRepo = new SqliteTimeSessionRepository(db, changeLogRepo);

  const clientService = new ClientService(clientRepo, deviceService);
  const projectService = new ProjectService(projectRepo, columnRepo, deviceService);
  const kanbanService = new KanbanService(columnRepo, taskRepo, sessionRepo, deviceService);

  return {
    db,
    deviceService,
    clientService,
    projectService,
    kanbanService,
    clientRepo,
    projectRepo,
    columnRepo,
    taskRepo,
    sessionRepo,
    changeLogRepo,
  };
}
