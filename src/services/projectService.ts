import { IProjectRepository } from '../domain/repositories/IProjectRepository';
import { IKanbanColumnRepository } from '../domain/repositories/IKanbanColumnRepository';
import { Project, CreateProjectInput, UpdateProjectInput } from '../domain/entities/Project';
import { EntityId } from '../domain/types/base';
import { DeviceService } from './deviceService';

export class ProjectService {
  private projectRepo: IProjectRepository;
  private columnRepo: IKanbanColumnRepository;
  private deviceService: DeviceService;

  constructor(
    projectRepo: IProjectRepository,
    columnRepo: IKanbanColumnRepository,
    deviceService: DeviceService
  ) {
    this.projectRepo = projectRepo;
    this.columnRepo = columnRepo;
    this.deviceService = deviceService;
  }

  async getProjects(includeDeleted = false): Promise<Project[]> {
    return await this.projectRepo.getAll(includeDeleted);
  }

  async getProjectById(id: EntityId): Promise<Project | null> {
    return await this.projectRepo.getById(id);
  }

  async getProjectsByClient(clientId: EntityId, includeDeleted = false): Promise<Project[]> {
    return await this.projectRepo.getByClientId(clientId, includeDeleted);
  }

  async createProject(
    input: CreateProjectInput,
    defaultColumnNames = ['Da fare', 'In corso', 'Fatto']
  ): Promise<Project> {
    const deviceId = await this.deviceService.getDeviceId();
    const project = await this.projectRepo.create(input, deviceId);

    // Initialize default Kanban columns for the new project
    for (let i = 0; i < defaultColumnNames.length; i++) {
      await this.columnRepo.create(
        {
          projectId: project.id,
          name: defaultColumnNames[i],
          orderIndex: i,
        },
        deviceId
      );
    }

    return project;
  }

  async updateProject(id: EntityId, input: UpdateProjectInput): Promise<Project> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.projectRepo.update(id, input, deviceId);
  }

  async archiveProject(id: EntityId): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId();
    await this.projectRepo.softDelete(id, deviceId);
  }
}
