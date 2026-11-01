import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../../stores/projectStore';
import { useClientStore } from '../../../stores/clientStore';
import { useKanbanStore } from '../../../stores/kanbanStore';
import { KanbanColumnComponent } from './KanbanColumnComponent';
import { TaskModal } from './TaskModal';
import { ColumnModal } from './ColumnModal';
import { ClientBadge } from '../../components/ClientBadge';
import { TaskWithTrackedTime } from '../../../services/kanbanService';
import { KanbanColumn } from '../../../domain/entities/KanbanColumn';
import { Plus, Search, FolderKanban } from 'lucide-react';

export const KanbanView: React.FC = () => {
  const { t } = useTranslation();
  const { projects, selectedProjectId } = useProjectStore();
  const { clients } = useClientStore();
  const {
    columns,
    tasks,
    loadBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useKanbanStore();

  const [search, setSearch] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithTrackedTime | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const currentClient = currentProject?.clientId
    ? clients.find((c) => c.id === currentProject.clientId)
    : null;

  useEffect(() => {
    if (selectedProjectId) {
      loadBoard(selectedProjectId);
    }
  }, [selectedProjectId, loadBoard]);

  const handleOpenAddTask = (colId: string) => {
    setEditingTask(null);
    setTargetColumnId(colId);
    setTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: TaskWithTrackedTime) => {
    setEditingTask(task);
    setTargetColumnId(task.columnId);
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (data: {
    columnId: string;
    title: string;
    description?: string | null;
    estimatedMinutes?: number | null;
  }) => {
    if (!selectedProjectId) return;
    if (editingTask) {
      await updateTask(editingTask.id, data);
    } else {
      await createTask({
        projectId: selectedProjectId,
        columnId: data.columnId,
        title: data.title,
        description: data.description,
        estimatedMinutes: data.estimatedMinutes,
      });
    }
  };

  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: KanbanColumn) => {
    setEditingColumn(col);
    setColumnModalOpen(true);
  };

  const handleSaveColumn = async (name: string) => {
    if (!selectedProjectId) return;
    if (editingColumn) {
      await updateColumn(editingColumn.id, name);
    } else {
      await createColumn(selectedProjectId, name);
    }
  };

  if (!currentProject) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
        <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
          <FolderKanban size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {t('projects.noProjects')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t('projects.noProjectsPrompt')}
          </p>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', overflow: 'hidden' }}>
      {/* Board Top Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
          flexShrink: 0,
        }}
      >
        {/* Project Title + Client Badge (ALWAYS VISIBLE) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: currentProject.color || 'var(--accent-blue)',
              }}
            />
            {currentProject.name}
          </h1>

          {/* Client badge requirement: always visible next to project */}
          <ClientBadge client={currentClient} />
        </div>

        {/* Search & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', fontSize: '0.85rem' }}
            />
          </div>

          <button className="btn btn-secondary" onClick={handleOpenAddColumn}>
            <Plus size={16} />
            {t('kanban.addColumn')}
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll */}
      <div
        style={{
          display: 'flex',
          gap: '1.25rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          paddingBottom: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {columns.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.columnId === column.id);
          return (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              tasks={colTasks}
              onAddTask={handleOpenAddTask}
              onEditColumn={handleOpenEditColumn}
              onDeleteColumn={deleteColumn}
              onEditTask={handleOpenEditTask}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
            />
          );
        })}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
        columns={columns}
        defaultColumnId={targetColumnId}
        initialData={editingTask}
      />

      {/* Column Modal */}
      <ColumnModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        onSave={handleSaveColumn}
        initialData={editingColumn}
      />
    </div>
  );
};
