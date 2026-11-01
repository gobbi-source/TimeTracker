import { create } from 'zustand';
import { KanbanColumn } from '../domain/entities/KanbanColumn';
import { TaskWithTrackedTime } from '../services/kanbanService';
import { UpdateTaskInput } from '../domain/entities/Task';
import { EntityId } from '../domain/types/base';
import { getServiceContainer } from '../services/container';

interface KanbanState {
  columns: KanbanColumn[];
  tasks: TaskWithTrackedTime[];
  isLoading: boolean;
  error: string | null;

  loadBoard: (projectId: EntityId) => Promise<void>;
  createColumn: (projectId: EntityId, name: string) => Promise<KanbanColumn>;
  updateColumn: (columnId: EntityId, name: string) => Promise<void>;
  deleteColumn: (columnId: EntityId) => Promise<void>;

  createTask: (input: {
    projectId: EntityId;
    columnId: EntityId;
    title: string;
    description?: string | null;
    estimatedMinutes?: number | null;
  }) => Promise<TaskWithTrackedTime>;
  updateTask: (taskId: EntityId, input: UpdateTaskInput) => Promise<void>;
  deleteTask: (taskId: EntityId) => Promise<void>;
  moveTask: (taskId: EntityId, targetColumnId: EntityId, newOrderIndex: number) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  columns: [],
  tasks: [],
  isLoading: false,
  error: null,

  loadBoard: async (projectId: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const board = await container.kanbanService.getBoardData(projectId);
      set({
        columns: board.columns,
        tasks: board.tasks,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nel caricamento della lavagna',
        isLoading: false,
      });
    }
  },

  createColumn: async (projectId: EntityId, name: string) => {
    try {
      const container = await getServiceContainer();
      const col = await container.kanbanService.createColumn(projectId, name);
      set((state) => ({
        columns: [...state.columns, col].sort((a, b) => a.orderIndex - b.orderIndex),
      }));
      return col;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nella creazione della colonna' });
      throw err;
    }
  },

  updateColumn: async (columnId: EntityId, name: string) => {
    try {
      const container = await getServiceContainer();
      const updated = await container.kanbanService.updateColumn(columnId, name);
      set((state) => ({
        columns: state.columns.map((c) => (c.id === columnId ? updated : c)),
      }));
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nella modifica della colonna' });
      throw err;
    }
  },

  deleteColumn: async (columnId: EntityId) => {
    try {
      const container = await getServiceContainer();
      await container.kanbanService.deleteColumn(columnId);
      set((state) => ({
        columns: state.columns.filter((c) => c.id !== columnId),
        tasks: state.tasks.filter((t) => t.columnId !== columnId),
      }));
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nell\'eliminazione della colonna' });
      throw err;
    }
  },

  createTask: async (input) => {
    try {
      const container = await getServiceContainer();
      const task = await container.kanbanService.createTask(input);
      set((state) => ({
        tasks: [...state.tasks, task].sort((a, b) => a.orderIndex - b.orderIndex),
      }));
      return task;
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nella creazione del task' });
      throw err;
    }
  },

  updateTask: async (taskId: EntityId, input: UpdateTaskInput) => {
    try {
      const container = await getServiceContainer();
      const updated = await container.kanbanService.updateTask(taskId, input);
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updated } : t
        ),
      }));
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nella modifica del task' });
      throw err;
    }
  },

  deleteTask: async (taskId: EntityId) => {
    try {
      const container = await getServiceContainer();
      await container.kanbanService.deleteTask(taskId);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId),
      }));
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Errore nell\'eliminazione del task' });
      throw err;
    }
  },

  moveTask: async (taskId: EntityId, targetColumnId: EntityId, newOrderIndex: number) => {
    // 1. Optimistic UI update
    const previousTasks = get().tasks;
    set((state) => {
      const updated = state.tasks.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            columnId: targetColumnId,
            orderIndex: newOrderIndex,
          };
        }
        return t;
      });
      return { tasks: updated };
    });

    try {
      const container = await getServiceContainer();
      await container.kanbanService.moveTask(taskId, targetColumnId, newOrderIndex);
    } catch (err: unknown) {
      // Revert if error
      set({ tasks: previousTasks, error: err instanceof Error ? err.message : 'Errore nello spostamento task' });
      throw err;
    }
  },
}));
