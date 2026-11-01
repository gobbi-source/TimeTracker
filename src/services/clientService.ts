import { IClientRepository } from '../domain/repositories/IClientRepository';
import { Client, CreateClientInput, UpdateClientInput } from '../domain/entities/Client';
import { EntityId } from '../domain/types/base';
import { DeviceService } from './deviceService';

export class ClientService {
  private clientRepo: IClientRepository;
  private deviceService: DeviceService;

  constructor(clientRepo: IClientRepository, deviceService: DeviceService) {
    this.clientRepo = clientRepo;
    this.deviceService = deviceService;
  }

  async getClients(includeDeleted = false): Promise<Client[]> {
    return await this.clientRepo.getAll(includeDeleted);
  }

  async getClientById(id: EntityId): Promise<Client | null> {
    return await this.clientRepo.getById(id);
  }

  async createClient(input: CreateClientInput): Promise<Client> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.clientRepo.create(input, deviceId);
  }

  async updateClient(id: EntityId, input: UpdateClientInput): Promise<Client> {
    const deviceId = await this.deviceService.getDeviceId();
    return await this.clientRepo.update(id, input, deviceId);
  }

  async archiveClient(id: EntityId): Promise<void> {
    const deviceId = await this.deviceService.getDeviceId();
    await this.clientRepo.softDelete(id, deviceId);
  }
}
