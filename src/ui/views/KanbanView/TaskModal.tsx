import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KanbanColumn } from '../../../domain/entities/KanbanColumn';
import { TaskWithTrackedTime } from '../../../services/kanbanService';
import { X } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    columnId: string;
    title: string;
    description?: string | null;
    estimatedMinutes?: number | null;
  }) => Promise<void>;
  columns: KanbanColumn[];
  defaultColumnId?: string;
  initialData?: TaskWithTrackedTime | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  columns,
  defaultColumnId,
  initialData,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [columnId, setColumnId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description || '');
      setEstimatedMinutes(initialData.estimatedMinutes ? String(initialData.estimatedMinutes) : '');
      setColumnId(initialData.columnId);
    } else {
      setTitle('');
      setDescription('');
      setEstimatedMinutes('');
      setColumnId(defaultColumnId || (columns.length > 0 ? columns[0].id : ''));
    }
    setError(null);
  }, [initialData, defaultColumnId, columns, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('common.required'));
      return;
    }
    if (!columnId) {
      setError(t('common.required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const parsedEst = estimatedMinutes.trim() ? parseInt(estimatedMinutes.trim(), 10) : null;
      await onSave({
        columnId,
        title: title.trim(),
        description: description.trim() || null,
        estimatedMinutes: isNaN(parsedEst as number) ? null : parsedEst,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {initialData ? t('kanban.editTask') : t('kanban.addTask')}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#fda4af', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              {t('kanban.taskTitle')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('kanban.taskTitlePlaceholder')}
              autoFocus
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              {t('kanban.columnName')} *
            </label>
            <select value={columnId} onChange={(e) => setColumnId(e.target.value)}>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              {t('kanban.taskDescription')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('kanban.taskDescriptionPlaceholder')}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              {t('kanban.taskEstimate')}
            </label>
            <input
              type="number"
              min="0"
              step="5"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder={t('kanban.taskEstimatePlaceholder')}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
