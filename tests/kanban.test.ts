import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqlJsDatabaseAdapter } from '../src/data/database/SqlJsDatabaseAdapter';
import { MigrationRunner, allMigrations } from '../src/data/migrations';
import { SqliteChangeLogRepository } from '../src/data/repositories/SqliteChangeLogRepository';
import { SqliteProjectRepository } from '../src/data/repositories/SqliteProjectRepository';
import { SqliteKanbanColumnRepository } from '../src/data/repositories/SqliteKanbanColumnRepository';
import { SqliteTaskRepository } from '../src/data/repositories/SqliteTaskRepository';
import { SqliteTimeSessionRepository } from '../src/data/repositories/SqliteTimeSessionRepository';
import { DeviceService } from '../src/services/deviceService';
import { ProjectService } from '../src/services/projectService';
import { KanbanService } from '../src/services/kanbanService';

describe('Step 4: Kanban Board & Tasks', () => {
  let db: SqlJsDatabaseAdapter;
  let changeLogRepo: SqliteChangeLogRepository;
  let projectRepo: SqliteProjectRepository;
  let columnRepo: SqliteKanbanColumnRepository;
  let taskRepo: SqliteTaskRepository;
  let sessionRepo: SqliteTimeSessionRepository;
  let deviceService: DeviceService;
  let projectService: ProjectService;
  let kanbanService: KanbanService;

  beforeEach(async () => {
    db = await SqlJsDatabaseAdapter.createInMemory();
    const runner = new MigrationRunner(db);
    await runner.run(allMigrations);

    changeLogRepo = new SqliteChangeLogRepository(db);
    deviceService = new DeviceService(db);
    projectRepo = new SqliteProjectRepository(db, changeLogRepo);
    columnRepo = new SqliteKanbanColumnRepository(db, changeLogRepo);
    taskRepo = new SqliteTaskRepository(db, changeLogRepo);
    sessionRepo = new SqliteTimeSessionRepository(db, changeLogRepo);

    projectService = new ProjectService(projectRepo, columnRepo, deviceService);
    kanbanService = new KanbanService(columnRepo, taskRepo, sessionRepo, deviceService);
  });

  afterEach(async () => {
    await db.close();
  });

  it('loads board with default columns and created tasks', async () => {
    const project = await projectService.createProject({ name: 'Sito Web E-commerce' });
    const boardBefore = await kanbanService.getBoardData(project.id);

    expect(boardBefore.columns.length).toBe(3);
    const [assistenzaCol, aggiornamentoCol] = boardBefore.columns;
    expect(assistenzaCol.name).toBe('Assistenza');
    expect(aggiornamentoCol.name).toBe('Aggiornamento');

    // Create task in Assistenza column
    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: assistenzaCol.id,
      title: 'Configurare Stripe',
      description: 'Integrazione webhook',
      estimatedMinutes: 60,
    });

    expect(task.id).toBeDefined();
    expect(task.columnId).toBe(assistenzaCol.id);
    expect(task.estimatedMinutes).toBe(60);

    const boardAfter = await kanbanService.getBoardData(project.id);
    expect(boardAfter.tasks.length).toBe(1);
    expect(boardAfter.tasks[0].title).toBe('Configurare Stripe');
  });

  it('moves task between columns and records UPDATE oplog', async () => {
    const project = await projectService.createProject({ name: 'Progetto Test' });
    const board = await kanbanService.getBoardData(project.id);
    const [todoCol, inProgressCol] = board.columns;

    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: todoCol.id,
      title: 'Scrivere documentazione',
    });

    // Move to In Progress
    const moved = await kanbanService.moveTask(task.id, inProgressCol.id, 0);
    expect(moved.columnId).toBe(inProgressCol.id);
    expect(moved.revision).toBe(2);

    // Verify in database
    const freshTask = await taskRepo.getById(task.id);
    expect(freshTask?.columnId).toBe(inProgressCol.id);

    // Verify oplog contains UPDATE
    const oplog = await changeLogRepo.getAll();
    const taskUpdates = oplog.filter((o) => o.entity === 'task' && o.operation === 'UPDATE');
    expect(taskUpdates.length).toBeGreaterThan(0);
  });

  it('soft deletes task and excludes from active board', async () => {
    const project = await projectService.createProject({ name: 'Progetto Pulizia' });
    const board = await kanbanService.getBoardData(project.id);
    const todoCol = board.columns[0];

    const task = await kanbanService.createTask({
      projectId: project.id,
      columnId: todoCol.id,
      title: 'Task da rimuovere',
    });

    await kanbanService.deleteTask(task.id);

    const boardAfter = await kanbanService.getBoardData(project.id);
    expect(boardAfter.tasks.length).toBe(0);

    // Raw verify soft-delete
    const allTasks = await taskRepo.getAll(true);
    const softDeleted = allTasks.find((t) => t.id === task.id);
    expect(softDeleted).toBeDefined();
    expect(softDeleted?.deletedAt).not.toBeNull();
  });

  it('creates and customizes columns in the board', async () => {
    const project = await projectService.createProject({ name: 'Progetto Custom' });
    const newCol = await kanbanService.createColumn(project.id, 'In Revisione');

    expect(newCol.name).toBe('In Revisione');
    expect(newCol.orderIndex).toBe(3);

    const board = await kanbanService.getBoardData(project.id);
    expect(board.columns.length).toBe(4);
    expect(board.columns[3].name).toBe('In Revisione');
  });
});
