import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../stores/projectStore';
import { useClientStore } from '../../stores/clientStore';
import { ClientBadge } from '../components/ClientBadge';
import { ProjectModal } from '../components/ProjectModal';
import { CreateProjectInput, UpdateProjectInput } from '../../domain/entities/Project';
import {
  Kanban,
  Users,
  BarChart3,
  Settings,
  Plus,
  Clock,
  FolderKanban,
} from 'lucide-react';

export type NavView = 'kanban' | 'clients' | 'reports' | 'settings';

interface AppLayoutProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  onNavigate,
  children,
}) => {
  const { t } = useTranslation();
  const { projects, selectedProjectId, setSelectedProjectId, createProject } = useProjectStore();
  const { clients } = useClientStore();

  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const selectedProjectClient = selectedProject?.clientId
    ? clients.find((c) => c.id === selectedProject.clientId)
    : null;

  const handleCreateProject = async (data: CreateProjectInput | UpdateProjectInput) => {
    await createProject(data as CreateProjectInput);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          {/* App Branding */}
          <div
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.4)',
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                {t('app.name')}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav style={{ padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              onClick={() => onNavigate('kanban')}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: currentView === 'kanban' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: currentView === 'kanban' ? '#60a5fa' : 'var(--text-secondary)',
                borderColor: currentView === 'kanban' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              }}
            >
              <Kanban size={18} />
              {t('nav.kanban')}
            </button>

            <button
              onClick={() => onNavigate('clients')}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: currentView === 'clients' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: currentView === 'clients' ? '#60a5fa' : 'var(--text-secondary)',
                borderColor: currentView === 'clients' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              }}
            >
              <Users size={18} />
              {t('nav.clients')}
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: currentView === 'reports' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: currentView === 'reports' ? '#60a5fa' : 'var(--text-secondary)',
                borderColor: currentView === 'reports' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              }}
            >
              <BarChart3 size={18} />
              {t('nav.reports')}
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: currentView === 'settings' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: currentView === 'settings' ? '#60a5fa' : 'var(--text-secondary)',
                borderColor: currentView === 'settings' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
              }}
            >
              <Settings size={18} />
              {t('nav.settings')}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Project Quick Switcher */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0, 0, 0, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {t('projects.title')}
            </span>
            <button
              className="btn-icon"
              onClick={() => setProjectModalOpen(true)}
              title={t('projects.addNew')}
              style={{ padding: '0.2rem' }}
            >
              <Plus size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
            {projects.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('projects.noProjects')}
              </p>
            ) : (
              projects.map((p) => {
                const client = p.clientId ? clients.find((c) => c.id === p.clientId) : null;
                const isSelected = p.id === selectedProjectId;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      if (currentView !== 'kanban') onNavigate('kanban');
                    }}
                    style={{
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: p.color || '#3b82f6',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </span>
                    </div>
                    {/* Always visible Client Badge next to project */}
                    <div style={{ marginLeft: '1rem' }}>
                      <ClientBadge client={client} size="sm" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header
          style={{
            height: '60px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            flexShrink: 0,
          }}
        >
          {/* Project & Client indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {selectedProject ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FolderKanban size={18} style={{ color: selectedProject.color || 'var(--accent-blue)' }} />
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedProject.name}</span>
                {/* Mandatory client visible badge */}
                <ClientBadge client={selectedProjectClient} />
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {t('projects.noProjectsPrompt')}
              </span>
            )}
          </div>

          <div>
            <button className="btn btn-secondary" onClick={() => setProjectModalOpen(true)}>
              <Plus size={16} />
              {t('projects.addNew')}
            </button>
          </div>
        </header>

        {/* View container */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {children}
        </main>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleCreateProject}
      />
    </div>
  );
};
