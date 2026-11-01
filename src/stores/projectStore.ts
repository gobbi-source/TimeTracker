import { create } from 'zustand';
import { Project, CreateProjectInput, UpdateProjectInput } from '../domain/entities/Project';
import { EntityId } from '../domain/types/base';
import { getServiceContainer } from '../services/container';

interface ProjectState {
  projects: Project[];
  selectedProjectId: EntityId | null;
  isLoading: boolean;
  error: string | null;
  loadProjects: (includeDeleted?: boolean) => Promise<void>;
  setSelectedProjectId: (id: EntityId | null) => void;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  updateProject: (id: EntityId, input: UpdateProjectInput) => Promise<Project>;
  archiveProject: (id: EntityId) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,

  setSelectedProjectId: (id: EntityId | null) => {
    set({ selectedProjectId: id });
  },

  loadProjects: async (includeDeleted = false) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const list = await container.projectService.getProjects(includeDeleted);
      const currentSelected = get().selectedProjectId;

      // Auto-select first project if none is selected and list is not empty
      let nextSelected = currentSelected;
      if (!currentSelected && list.length > 0) {
        nextSelected = list[0].id;
      } else if (currentSelected && !list.some((p) => p.id === currentSelected)) {
        nextSelected = list.length > 0 ? list[0].id : null;
      }

      set({
        projects: list,
        selectedProjectId: nextSelected,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nel caricamento progetti',
        isLoading: false,
      });
    }
  },

  createProject: async (input: CreateProjectInput) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const project = await container.projectService.createProject(input);
      set((state) => ({
        projects: [...state.projects, project].sort((a, b) => a.name.localeCompare(b.name)),
        selectedProjectId: project.id,
        isLoading: false,
      }));
      return project;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nella creazione progetto';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  updateProject: async (id: EntityId, input: UpdateProjectInput) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const updated = await container.projectService.updateProject(id, input);
      set((state) => ({
        projects: state.projects
          .map((p) => (p.id === id ? updated : p))
          .sort((a, b) => a.name.localeCompare(b.name)),
        isLoading: false,
      }));
      return updated;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nella modifica progetto';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },

  archiveProject: async (id: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      await container.projectService.archiveProject(id);
      set((state) => {
        const remaining = state.projects.filter((p) => p.id !== id);
        return {
          projects: remaining,
          selectedProjectId:
            state.selectedProjectId === id
              ? remaining.length > 0
                ? remaining[0].id
                : null
              : state.selectedProjectId,
          isLoading: false,
        };
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Errore nell\'archiviazione progetto';
      set({ error: errorMsg, isLoading: false });
      throw err;
    }
  },
}));
