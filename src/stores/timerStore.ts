import { create } from 'zustand';
import { ActiveSessionDetails } from '../services/timerService';
import { EntityId } from '../domain/types/base';
import { getServiceContainer } from '../services/container';

interface TimerState {
  activeDetails: ActiveSessionDetails | null;
  elapsedSeconds: number;
  interruptedDetails: ActiveSessionDetails | null;
  isCrashModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  isPause: boolean;
  pausedTaskId: EntityId | null;
  initTimer: () => Promise<void>;
  startTimer: (taskId: EntityId) => Promise<void>;
  pauseTimer: () => Promise<void>;
  stopTimer: (isPause?: boolean, note?: string) => Promise<void>;
  resolveCrashRecovery: (action: 'keep' | 'resume' | 'discard') => Promise<void>;
  tick: () => void;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

export const useTimerStore = create<TimerState>((set, get) => ({
  activeDetails: null,
  elapsedSeconds: 0,
  interruptedDetails: null,
  isCrashModalOpen: false,
  isLoading: false,
  error: null,
  isPause: false,
  pausedTaskId: null,
  tick: () => {
    const { activeDetails } = get();
    if (activeDetails && !activeDetails.session.endTime) {
      const startMs = new Date(activeDetails.session.startTime).getTime();
      const nowMs = Date.now();
      const seconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      set({ elapsedSeconds: seconds });
    }
  },

  initTimer: async () => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      const active = await container.timerService.getActiveSessionDetails();

      if (active) {
        // App started with an open active session: prompt user for crash recovery
        set({
          interruptedDetails: active,
          isCrashModalOpen: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nel recupero sessione timer',
        isLoading: false,
      });
    }
  },

  startTimer: async (taskId: EntityId) => {
    set({ isLoading: true, error: null });
    try {
      const container = await getServiceContainer();
      await container.timerService.startTimer(taskId);
      const details = await container.timerService.getActiveSessionDetails();

      // Start ticker
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        get().tick();
      }, 1000);

      const startMs = details ? new Date(details.session.startTime).getTime() : Date.now();
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));

      set({
        activeDetails: details,
        elapsedSeconds: elapsed,
        isLoading: false,
      });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nell\'avvio del timer',
        isLoading: false,
      });
      throw err;
    }
  },

  pauseTimer: async () => {
    const { isPause, activeDetails, pausedTaskId } = get();

    if (!isPause) {
      // Metti in pausa: memorizza l'attività corrente
      if (!activeDetails) return;

      set({ pausedTaskId: activeDetails.session.taskId });

      await get().stopTimer(true);
    } else {
      // Riprendi: crea una nuova sessione per la stessa attività
      if (!pausedTaskId) return;

      const container = await getServiceContainer();
      await container.timerService.startTimer(pausedTaskId);

      const details = await container.timerService.getActiveSessionDetails();

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        get().tick();
      }, 1000);

      set({
        activeDetails: details,
        elapsedSeconds: 0,
        isPause: false,
        isLoading: false,
        error: null,
      });
    }
  },

  stopTimer: async (isPause: boolean = false, note?: string) => {
    set({ isLoading: true, error: null });
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    try {
      const container = await getServiceContainer();
      await container.timerService.stopActiveTimer(note);
      if (!isPause) {
        set({
          activeDetails: null,
          elapsedSeconds: 0,
          isLoading: false,
          pausedTaskId: null,
          isPause: false

        });
      } else {
        set({
          isPause: true
        })
      }
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nell\'arresto del timer',
        isLoading: false,
      });
      throw err;
    }
  },

  resolveCrashRecovery: async (action: 'keep' | 'resume' | 'discard') => {
    const { interruptedDetails } = get();
    if (!interruptedDetails) {
      set({ isCrashModalOpen: false });
      return;
    }

    try {
      const container = await getServiceContainer();
      await container.timerService.resolveInterruptedSession(
        interruptedDetails.session.id,
        action
      );

      if (action === 'resume') {
        // Continue tracking
        const details = await container.timerService.getActiveSessionDetails();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          get().tick();
        }, 1000);

        const startMs = details ? new Date(details.session.startTime).getTime() : Date.now();
        const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));

        set({
          activeDetails: details,
          elapsedSeconds: elapsed,
          interruptedDetails: null,
          isCrashModalOpen: false,
        });
      } else {
        // 'keep' or 'discard': session stopped or removed
        set({
          activeDetails: null,
          elapsedSeconds: 0,
          interruptedDetails: null,
          isCrashModalOpen: false,
        });
      }
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : 'Errore nella risoluzione del timer interrotto',
      });
    }
  },
}));
