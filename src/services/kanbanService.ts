import { IKanbanColumnRepository } from '../domain/repositories/IKanbanColumnRepository';
import { ITaskRepository } from '../domain/repositories/ITaskRepository';
import { SqliteTimeSessionRepository } from '../data/repositories/SqliteTimeSessionRepository';
import { KanbanColumn } from '../domain/entities/KanbanColumn';
import { Task, UpdateTaskInput } from '../domain/entities/Task';
import { EntityId } from '../domain/types/base';
import { DeviceService } from './deviceService';

export interface TaskWithTrackedTime extends Task {
  totalTrackedSeconds: number;
}

export interface BoardData {
  columns: KanbanColumn[];
  tasks: TaskWithTrackedTime[];
}

export class KanbanService {
  private columnRepo: IKanbanColumnRepository;
  private taskRepo: ITaskRepository;
  private sessionRepo: SqliteTimeSessionRepository;
  private deviceService: DeviceService;

  constructor(
    columnRepo: IKanbanColumnRepository,
    taskRepo: ITaskRepository,
    sessionRepo: SqliteTimeSessionRepository,
    deviceService: DeviceService
  ) {
    this.columnRepo = columnRepo;
    this.taskRepo = taskRepo;
    this.sessionRepo = sessionRepo;
    this.deviceService = deviceService;
  }

  async getBoardData(projectId: EntityId): Promise<BoardData> {
    const [columns, tasks, trackedMap] = await Promise.all([
      this.columnRepo.getByProjectId(projectId, false),
      this.taskRepo.getByProjectId(projectId, false),
      this.sessionRepo.getTotalTrackedSecondsMap(projectId),
    ]);

    const tasksWithTracked: TaskWithTrackedTime[] = tasks.map((task) => ({
      ...task,
      totalTrackedSeconds: trackedMap[task.id] || 0,
    }));

    return {
      columns: columns.sort((a, b) => a.orderIndex - b.orderIndex),
      tasks: tasksWithTracked.sort((a, b) => a.orderIndex - b.orderIndex),
    };
  }

  async createColumn(projectId: EntityId, name: string): Promise<KanbanColumn> {
    const existing = await this.columnRepo.getByProjectId(projectId, false);
    const orderIndex = existing.length;
    const deviceId = await this.deviceService.getDeviceId();
    return await this.columnRepo.create({ projectId, name, orderIndex }, deviceId);
  }

  async updateColumn(columnId: EntityId, name?: string, orderIndex?: number): Promise<KanbanColumn> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.columnRepo.update(columnId, { name, orderIndex }, deviceId);
  }

  async deleteColumn(columnId: EntityId): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId();
    // Soft delete all tasks inside this column
    const tasks = await this.taskRepo.getByColumnId(columnId, false);
    for (const t of tasks) {
      await this.taskRepo.softDelete(t.id, deviceId);
    }
    // Soft delete column
    await this.columnRepo.softDelete(columnId, deviceId);
  }

  async createTask(input: {
    projectId: EntityId;
    columnId: EntityId;
    title: string;
    description?: string | null;
    estimatedMinutes?: number | null;
  }): Promise<TaskWithTrackedTime> {
    const tasksInCol = await this.taskRepo.getByColumnId(input.columnId, false);
    const orderIndex = tasksInCol.length;
    const deviceId = await this.deviceService.getDeviceId();

    const task = await this.taskRepo.create(
      {
        projectId: input.projectId,
        columnId: input.columnId,
        title: input.title,
        description: input.description,
        estimatedMinutes: input.estimatedMinutes,
        orderIndex,
      },
      deviceId
    );

    return {
      ...task,
      totalTrackedSeconds: 0,
    };
  }

  async updateTask(taskId: EntityId, input: UpdateTaskInput): Promise<Task> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.taskRepo.update(taskId, input, deviceId);
  }

  async moveTask(
    taskId: EntityId,
    targetColumnId: EntityId,
    newOrderIndex: number
  ): Promise<Task> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.taskRepo.moveTask(taskId, targetColumnId, newOrderIndex, deviceId);
  }

  async deleteTask(taskId: EntityId): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId();
    await this.taskRepo.softDelete(taskId, deviceId);
  }
}
