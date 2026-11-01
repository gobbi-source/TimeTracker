import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KanbanColumn } from '../../../domain/entities/KanbanColumn';
import { TaskWithTrackedTime } from '../../../services/kanbanService';
import { TaskCard } from './TaskCard';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface KanbanColumnComponentProps {
  column: KanbanColumn;
  tasks: TaskWithTrackedTime[];
  onAddTask: (columnId: string) => void;
  onEditColumn: (column: KanbanColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditTask: (task: TaskWithTrackedTime) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string, newOrderIndex: number) => void;
}

export const KanbanColumnComponent: React.FC<KanbanColumnComponentProps> = ({
  column,
  tasks,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onEditTask,
  onDeleteTask,
  onMoveTask,
}) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set false if left column container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      const taskId = data.taskId;
      if (!taskId) return;

      // Drop at the end of the column
      const newOrderIndex = tasks.length;
      onMoveTask(taskId, column.id, newOrderIndex);
    } catch (err) {
      console.error('Failed to parse drag data:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        width: '320px',
        minWidth: '320px',
        background: isDragOver ? 'rgba(30, 41, 59, 0.95)' : 'var(--bg-card)',
        border: isDragOver ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 160px)',
        transition: 'all 0.15s ease',
        boxShadow: isDragOver ? '0 0 15px rgba(59, 130, 246, 0.3)' : 'var(--shadow-sm)',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '1rem 1.1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <h3 style={{ fontSize: '0.975rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {column.name}
          </h3>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
            }}
          >
            {tasks.length}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button
            className="btn-icon"
            onClick={() => onAddTask(column.id)}
            title={t('kanban.addTask')}
            style={{ padding: '0.25rem' }}
          >
            <Plus size={18} />
          </button>

          <div style={{ position: 'relative' }}>
            <button
              className="btn-icon"
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ padding: '0.25rem' }}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  background: '#1e293b',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 20,
                  minWidth: '140px',
                  padding: '0.35rem 0',
                }}
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  className="btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onEditColumn(column);
                  }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 0,
                    fontSize: '0.8rem',
                  }}
                >
                  <Edit2 size={14} />
                  {t('common.edit')}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(t('kanban.confirmDeleteColumn'))) {
                      onDeleteColumn(column.id);
                    }
                  }}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    padding: '0.45rem 0.85rem',
                    borderRadius: 0,
                    color: '#fda4af',
                    fontSize: '0.8rem',
                  }}
                >
                  <Trash2 size={14} />
                  {t('common.delete')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div
        style={{
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          overflowY: 'auto',
          flex: 1,
          minHeight: '120px',
        }}
      >
        {tasks.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-muted)',
              fontSize: '0.825rem',
            }}
          >
            {t('kanban.noTasks')}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
};
