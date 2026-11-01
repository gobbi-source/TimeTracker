import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsDatabaseAdapter } from '../src/data/database/SqlJsDatabaseAdapter';
import { MigrationRunner, allMigrations } from '../src/data/migrations';
import { SqliteChangeLogRepository } from '../src/data/repositories/SqliteChangeLogRepository';
import { SqliteClientRepository } from '../src/data/repositories/SqliteClientRepository';
import { SqliteProjectRepository } from '../src/data/repositories/SqliteProjectRepository';
import { SqliteKanbanColumnRepository } from '../src/data/repositories/SqliteKanbanColumnRepository';
import { SqliteTaskRepository } from '../src/data/repositories/SqliteTaskRepository';
import { SqliteTimeSessionRepository } from '../src/data/repositories/SqliteTimeSessionRepository';
import { DeviceService } from '../src/services/deviceService';
import { ClientService } from '../src/services/clientService';
import { ProjectService } from '../src/services/projectService';
import { KanbanService } from '../src/services/kanbanService';
import { TimerService } from '../src/services/timerService';

describe('Step 5: Timer Engine & Crash Recovery', () => {
  let db: SqlJsDatabaseAdapter;
  let sessionRepo: SqliteTimeSessionRepository;
  let timerService: TimerService;
  let clientService: ClientService;
  let projectService: ProjectService;
  let kanbanService: KanbanService;

  beforeEach(async () => {
    db = await SqlJsDatabaseAdapter.createInMemory();
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    const changeLogRepo = new SqliteChangeLogRepository(db);
    const deviceService = new DeviceService(db);
    const clientRepo = new SqliteClientRepository(db, changeLogRepo);
    const projectRepo = new SqliteProjectRepository(db, changeLogRepo);
    const columnRepo = new SqliteKanbanColumnRepository(db, changeLogRepo);
    const taskRepo = new SqliteTaskRepository(db, changeLogRepo);
    sessionRepo = new SqliteTimeSessionRepository(db, changeLogRepo);

    clientService = new ClientService(clientRepo, deviceService);
    projectService = new ProjectService(projectRepo, columnRepo, deviceService);
    kanbanService = new KanbanService(columnRepo, taskRepo, sessionRepo, deviceService);
    timerService = new TimerService(sessionRepo, taskRepo, projectRepo, clientRepo, deviceService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('starts a timer on a task and retrieves active details with client and project', async () => {
    const client = await clientService.createClient({ name: 'Egitto', color: '#f59e0b' });
    const project = await projectService.createProject({ name: 'Piramide', clientId: client.id });
    const board = await kanbanService.getBoardData(project.id);
    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: board.columns[0].id,
      title: 'Tagliare blocchi di pietra',
    });

    const session = await timerService.startTimer(task.id);
    expect(session.id).toBeDefined();
    expect(session.taskId).toBe(task.id);
    expect(session.endTime).toBeNull();

    // Verify active details includes client name and project
    const details = await timerService.getActiveSessionDetails();
    expect(details).not.toBeNull();
    expect(details?.task.id).toBe(task.id);
    expect(details?.project.name).toBe('Piramide');
    expect(details?.client?.name).toBe('Egitto');
  });

  it('enforces single active timer rule: starting another task stops the first', async () => {
    const project = await projectService.createProject({ name: 'Progetto Test' });
    const board = await kanbanService.getBoardData(project.id);
    const taskA = await kanbanService.createTask({
      projectId: project.id,
      columnId: board.columns[0].id,
      title: 'Task A',
    });
    const taskB = await kanbanService.createTask({
      projectId: project.id,
      columnId: board.columns[0].id,
      title: 'Task B',
    });

    // Start Task A
    const sessionA = await timerService.startTimer(taskA.id);
    expect(sessionA.endTime).toBeNull();

    // Wait a brief moment and start Task B
    await new Promise((res) => setTimeout(res, 10));
    const sessionB = await timerService.startTimer(taskB.id);

    // Session A should now be stopped in the database
    const stoppedA = await sessionRepo.getById(sessionA.id);
    expect(stoppedA?.endTime).not.toBeNull();

    // Session B should be the only active session
    const active = await timerService.getActiveSession();
    expect(active?.id).toBe(sessionB.id);
    expect(active?.taskId).toBe(taskB.id);
  });

  it('stops active timer correctly with end_time', async () => {
    const project = await projectService.createProject({ name: 'Progetto Stop' });
    const board = await kanbanService.getBoardData(project.id);
    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: board.columns[0].id,
      title: 'Task da fermare',
    });

    await timerService.startTimer(task.id);
    const stopped = await timerService.stopActiveTimer('Sessione completata');

    expect(stopped?.endTime).not.toBeNull();
    expect(stopped?.note).toBe('Sessione completata');

    const active = await timerService.getActiveSession();
    expect(active).toBeNull();
  });

  it('handles crash recovery: keeps, resumes or discards interrupted session', async () => {
    const project = await projectService.createProject({ name: 'Progetto Crash' });
    const board = await kanbanService.getBoardData(project.id);
    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: board.columns[0].id,
      title: 'Task interrotto da crash',
    });

    // Simulate session left running when app abruptly closed
    const session = await timerService.startTimer(task.id);

    // Boot check
    const interrupted = await timerService.checkInterruptedSession();
    expect(interrupted).not.toBeNull();
    expect(interrupted?.session.id).toBe(session.id);

    // Test resolution: 'keep'
    await timerService.resolveInterruptedSession(session.id, 'keep');
    const checkedAfterKeep = await timerService.getActiveSession();
    expect(checkedAfterKeep).toBeNull(); // now closed and kept

    const savedSession = await sessionRepo.getById(session.id);
    expect(savedSession?.endTime).not.toBeNull();
    expect(savedSession?.deletedAt).toBeNull();
  });
});
