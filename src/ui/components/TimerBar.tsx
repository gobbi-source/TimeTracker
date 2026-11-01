import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTimerStore } from '../../stores/timerStore';
import { ClientBadge } from './ClientBadge';
import { Play, Pause, Square, ExternalLink } from 'lucide-react';

export function formatHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface TimerBarProps {
  onOpenMiniTimer?: () => void;
}

export const TimerBar: React.FC<TimerBarProps> = ({ onOpenMiniTimer }) => {
  const { t } = useTranslation();
  const { activeDetails, elapsedSeconds, pauseTimer, stopTimer } = useTimerStore();

  if (!activeDetails) {
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
        <style>{`
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
          }
        `}</style>

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
          onClick={() => stopTimer()}
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
