import { ITimeSessionRepository } from '../domain/repositories/ITimeSessionRepository';
import { ITaskRepository } from '../domain/repositories/ITaskRepository';
import { IProjectRepository } from '../domain/repositories/IProjectRepository';
import { IClientRepository } from '../domain/repositories/IClientRepository';
import { TimeSession } from '../domain/entities/TimeSession';
import { Task } from '../domain/entities/Task';
import { Project } from '../domain/entities/Project';
import { Client } from '../domain/entities/Client';
import { EntityId, nowUtcIso } from '../domain/types/base';
import { DeviceService } from './deviceService';

export interface ActiveSessionDetails {
  session: TimeSession;
  task: Task;
  project: Project;
  client: Client | null;
}

export class TimerService {
  private sessionRepo: ITimeSessionRepository;
  private taskRepo: ITaskRepository;
  private projectRepo: IProjectRepository;
  private clientRepo: IClientRepository;
  private deviceService: DeviceService;

  constructor(
    sessionRepo: ITimeSessionRepository,
    taskRepo: ITaskRepository,
    projectRepo: IProjectRepository,
    clientRepo: IClientRepository,
    deviceService: DeviceService
  ) {
    this.sessionRepo = sessionRepo;
    this.taskRepo = taskRepo;
    this.projectRepo = projectRepo;
    this.clientRepo = clientRepo;
    this.deviceService = deviceService;
  }

  async getActiveSession(): Promise<TimeSession | null> {
    return await this.sessionRepo.getActiveSession();
  }

  async getActiveSessionDetails(): Promise<ActiveSessionDetails | null> {
    const session = await this.sessionRepo.getActiveSession();
    if (!session) return null;

    const task = await this.taskRepo.getById(session.taskId);
    if (!task) return null;

    const project = await this.projectRepo.getById(task.projectId);
    if (!project) return null;

    const client = project.clientId ? await this.clientRepo.getById(project.clientId) : null;

    return {
      session,
      task,
      project,
      client,
    };
  }

  async startTimer(taskId: EntityId, note?: string): Promise<TimeSession> {
    const deviceId = await this.deviceService.getDeviceId();

    // 1. Enforce requirement: "un solo timer attivo alla volta"
    const active = await this.sessionRepo.getActiveSession();
    if (active) {
      if (active.taskId === taskId) {
        // Already running on this task
        return active;
      }
      // Stop the currently active session on the other task first
      await this.sessionRepo.stopSession(active.id, { endTime: nowUtcIso() }, deviceId);
    }

    // 2. Start new session
    return await this.sessionRepo.create(
      {
        taskId,
        startTime: nowUtcIso(),
        note: note || null,
      },
      deviceId
    );
  }

  async stopTimer(sessionId: EntityId, note?: string): Promise<TimeSession> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.sessionRepo.stopSession(
      sessionId,
      {
        endTime: nowUtcIso(),
        note: note || null,
      },
      deviceId
    );
  }

  async stopActiveTimer(note?: string): Promise<TimeSession | null> {
    const active = await this.sessionRepo.getActiveSession();
    if (!active) return null;
    return await this.stopTimer(active.id, note);
  }

  async checkInterruptedSession(): Promise<ActiveSessionDetails | null> {
    // When the application starts up, check if there is an unclosed session from a previous run
    return await this.getActiveSessionDetails();
  }

  async resolveInterruptedSession(
    sessionId: EntityId,
    resolution: 'keep' | 'resume' | 'discard',
    closedAtIso?: string
  ): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId();

    if (resolution === 'keep') {
      // Close session at the specified timestamp or current time
      const endTime = closedAtIso || nowUtcIso();
      await this.sessionRepo.stopSession(sessionId, { endTime }, deviceId);
    } else if (resolution === 'discard') {
      // Soft-delete the interrupted session
      await this.sessionRepo.softDelete(sessionId, deviceId);
    } else if (resolution === 'resume') {
      // Keep session running as active
    }
  }
}
