import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActiveSessionDetails } from '../../services/timerService';
import { AlertTriangle, Clock, CheckCircle, SkipForward, Trash2 } from 'lucide-react';

interface CrashRecoveryModalProps {
  isOpen: boolean;
  interruptedDetails: ActiveSessionDetails | null;
  onResolve: (action: 'keep' | 'resume' | 'discard') => Promise<void>;
}

export const CrashRecoveryModal: React.FC<CrashRecoveryModalProps> = ({
  isOpen,
  interruptedDetails,
  onResolve,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !interruptedDetails) return null;

  const { task, session } = interruptedDetails;
  const startTime = new Date(session.startTime).toLocaleString();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          maxWidth: '460px',
          width: '90%',
          boxShadow: '0 0 40px rgba(251, 191, 36, 0.15), var(--shadow-lg)',
          animation: 'slideUp 0.25s ease',
        }}
      >
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#fbbf24',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
              {t('timer.crashRecoveryTitle')}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t('timer.crashRecoveryMessage', {
                taskTitle: task.title,
                startTime,
              })}
            </p>
          </div>
        </div>

        {/* Session info pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 0.85rem',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1.5rem',
            fontSize: '0.825rem',
            color: 'var(--text-secondary)',
          }}
        >
          <Clock size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            {startTime}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => onResolve('keep')}
            style={{ justifyContent: 'flex-start', gap: '0.65rem', padding: '0.65rem 1rem' }}
          >
            <CheckCircle size={17} />
            {t('timer.crashKeepAndClose')}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => onResolve('resume')}
            style={{ justifyContent: 'flex-start', gap: '0.65rem', padding: '0.65rem 1rem' }}
          >
            <SkipForward size={17} />
            {t('timer.crashResume')}
          </button>

          <button
            className="btn"
            onClick={() => onResolve('discard')}
            style={{
              justifyContent: 'flex-start',
              gap: '0.65rem',
              padding: '0.65rem 1rem',
              color: '#fda4af',
              borderColor: 'rgba(244, 63, 94, 0.25)',
              background: 'rgba(244, 63, 94, 0.07)',
            }}
          >
            <Trash2 size={17} />
            {t('timer.crashDiscard')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};
