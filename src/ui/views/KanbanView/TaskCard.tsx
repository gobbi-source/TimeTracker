import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskWithTrackedTime } from '../../../services/kanbanService';
import { Clock, Timer, Edit2, Trash2, Play, Square } from 'lucide-react';
import { useTimerStore } from '../../../stores/timerStore';

interface TaskCardProps {
  task: TaskWithTrackedTime;
  onEdit: (task: TaskWithTrackedTime) => void;
  onDelete: (taskId: string) => void;
  onStartTimer?: (task: TaskWithTrackedTime) => void;
  isTimerRunning?: boolean;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return minutes > 0 ? `${minutes}m` : '< 1m';
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const { activeDetails, startTimer, stopTimer } = useTimerStore();
  const [isDragging, setIsDragging] = useState(false);

  const isThisTaskActive = activeDetails?.task.id === task.id;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        taskId: task.id,
        sourceColumnId: task.columnId,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{
        background: 'rgba(30, 41, 59, 0.75)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem',
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
        position: 'relative',
      }}
      className="task-card"
    >
      {/* Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
        <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {task.title}
        </h4>
        <div style={{ display: 'flex', gap: '0.15rem', opacity: 0.8 }} onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title={t('common.edit')}
            style={{ padding: '0.2rem' }}
          >
            <Edit2 size={14} />
          </button>
          <button
            className="btn-icon"
            onClick={() => {
              if (window.confirm(t('kanban.confirmDeleteTask'))) {
                onDelete(task.id);
              }
            }}
            title={t('common.delete')}
            style={{ padding: '0.2rem', color: '#fda4af' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Description Snippet */}
      {task.description && (
        <p
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '0.65rem',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Footer: Tracked Time, Estimate, Timer Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Total Tracked Time */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              padding: '0.15rem 0.45rem',
              borderRadius: 'var(--radius-sm)',
              background: task.totalTrackedSeconds > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: task.totalTrackedSeconds > 0 ? '#34d399' : '#94a3b8',
              border: task.totalTrackedSeconds > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(100, 116, 139, 0.2)',
            }}
            title={`${t('kanban.timeTracked')}: ${formatDuration(task.totalTrackedSeconds)}`}
          >
            <Timer size={12} />
            {formatDuration(task.totalTrackedSeconds)}
          </span>

          {/* Estimate */}
          {task.estimatedMinutes !== null && task.estimatedMinutes > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
              title={`${t('kanban.estimated')}: ${task.estimatedMinutes}m`}
            >
              <Clock size={12} />
              {task.estimatedMinutes}m
            </span>
          )}
        </div>

        {/* Timer start/stop button */}
        <button
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            if (isThisTaskActive) {
              stopTimer(false);
            } else {
              startTimer(task.id);
            }
          }}
          title={isThisTaskActive ? t('kanban.stopTimer') : t('kanban.startTimer')}
          style={{
            width: '26px',
            height: '26px',
            padding: '0',
            borderRadius: 'var(--radius-full)',
            background: isThisTaskActive
              ? 'rgba(244, 63, 94, 0.2)'
              : 'rgba(16, 185, 129, 0.15)',
            color: isThisTaskActive ? '#fda4af' : '#34d399',
            border: isThisTaskActive
              ? '1px solid rgba(244, 63, 94, 0.3)'
              : '1px solid rgba(16, 185, 129, 0.3)',
            flexShrink: 0,
          }}
        >
          {isThisTaskActive ? <Square size={13} /> : <Play size={13} />}
        </button>
      </div>
    </div>
  );
};
