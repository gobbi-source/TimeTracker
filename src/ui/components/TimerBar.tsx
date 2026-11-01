import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerStore } from '../../stores/timerStore';
import { ClientBadge } from './ClientBadge';
import { Pause, Square, ExternalLink, Play } from 'lucide-react';

export function formatHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface TimerBarProps {
  onOpenMiniTimer?: () => void;
  /** Se true, mostra una versione compatta per la sidebar */
  compact?: boolean;
}

export const TimerBar: React.FC<TimerBarProps> = ({ onOpenMiniTimer, compact = false }) => {
  const { t } = useTranslation();
  const { activeDetails, elapsedSeconds, pauseTimer, stopTimer, isPause } = useTimerStore();

  /* ── IDLE STATE ── */
  if (!activeDetails) {
    if (compact) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#475569',
              flexShrink: 0,
            }}
          />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('timer.noActiveTask')}
          </span>
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: 'var(--text-muted)',
          fontSize: '0.825rem',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#64748b',
          }}
        />
        <span>{t('timer.noActiveTask')}</span>
      </div>
    );
  }

  const { task, project, client } = activeDetails;

  /* ── COMPACT (SIDEBAR) ACTIVE STATE ── */
  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.35rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.1)',
          animation: 'fadeIn 0.2s ease',
          minWidth: 0,
        }}
      >
        {/* Pulse dot */}
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 6px #10b981',
            animation: 'pulse 1.5s infinite',
            flexShrink: 0,
          }}
        />
        <style>{`
          @keyframes pulse {
            0%   { transform: scale(0.95); opacity: 0.8; }
            50%  { transform: scale(1.2);  opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
        `}</style>

        {/* Task title — truncated */}
        <span
          style={{
            fontSize: '0.775rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={`${task.title} — ${project.name}`}
        >
          {task.title}
        </span>

        {/* Counter */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#34d399',
            flexShrink: 0,
          }}
        >
          {formatHms(elapsedSeconds)}
        </span>

        {/* Pause / Stop buttons */}
        <button
          className="btn-icon"
          onClick={() => pauseTimer()}
          title={t('timer.pause')}
          style={{ width: '22px', height: '22px', padding: 0, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}
        >
          {isPause ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button
          className="btn-icon"
          onClick={() => stopTimer()}
          title={t('timer.stop')}
          style={{ width: '22px', height: '22px', padding: 0, background: 'rgba(244,63,94,0.2)', color: '#fda4af', flexShrink: 0 }}
        >
          <Square size={12} />
        </button>
      </div>
    );
  }

  /* ── FULL (HEADER) ACTIVE STATE ── */
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        background: 'rgba(15, 23, 42, 0.85)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        padding: '0.4rem 0.85rem',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Running pulse animation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10b981',
            boxShadow: '0 0 8px #10b981',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Task Title */}
        <span
          style={{
            fontWeight: 600,
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            maxWidth: '180px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={task.title}
        >
          {task.title}
        </span>
      </div>

      {/* Project & Client Badge (Always visible next to task) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {project.name}
        </span>
        <ClientBadge client={client} size="sm" />
      </div>

      {/* Counter */}
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: '1rem',
          fontWeight: 700,
          color: '#34d399',
          padding: '0.1rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(16, 185, 129, 0.1)',
          minWidth: '85px',
          textAlign: 'center',
        }}
      >
        {formatHms(elapsedSeconds)}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          className="btn-icon"
          onClick={() => pauseTimer()}
          title={t('timer.pause')}
          style={{
            width: '28px',
            height: '28px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-primary)',
          }}
        >
          <Pause size={14} />
        </button>

        <button
          className="btn-icon"
          onClick={() => stopTimer(false)}
          title={t('timer.stop')}
          style={{
            width: '28px',
            height: '28px',
            background: 'rgba(244, 63, 94, 0.2)',
            color: '#fda4af',
          }}
        >
          <Square size={14} />
        </button>

        {onOpenMiniTimer && (
          <button
            className="btn-icon"
            onClick={onOpenMiniTimer}
            title={t('timer.openMiniTimer')}
            style={{
              width: '28px',
              height: '28px',
              color: 'var(--text-secondary)',
            }}
          >
            <ExternalLink size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
