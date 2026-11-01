import { create } from 'zustand';
import { Client, CreateClientInput, UpdateClientInput } from '../domain/entities/Client';
import { EntityId } from '../domain/types/base';
import { getServiceContainer } from '../services/container';

interface ClientState {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
  loadClients: (includeDeleted?: boolean) => Promise<void>;
  createClient: (input: CreateClientInput) => Promise<Client>;
  updateClient: (id: EntityId, input: UpdateClientInput) => Promise<Client>;
  archiveClient: (id: EntityId) => Promise<void>;
}

export const useClientStore = create<ClientState>((set) => ({
  clients: [],
  isLoading: false,
  error: null,

  loadClients: async (includeDeleted = false) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const list = await container.clientService.getClients(includeDeleted);
      set({ clients: list, isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nel caricamento clienti',
        isLoading: false,
      });
    }
  },

  createClient: async (input: CreateClientInput) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const client = await container.clientService.createClient(input);
      set((state) => ({
        clients: [...state.clients, client].sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return client;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nella creazione cliente';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  updateClient: async (id: EntityId, input: UpdateClientInput) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const updated = await container.clientService.updateClient(id, input);
      set((state) => ({
        clients: state.clients
          .map((c) => (c.id === id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return updated;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nella modifica cliente';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  archiveClient: async (id: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      await container.clientService.archiveClient(id);
      // Remove from active list
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id),
        isLoading: false,
      }));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nell\'archiviazione cliente';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },
}));
