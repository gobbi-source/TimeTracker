import { useState, useEffect } from 'react';
import './ui/styles/theme.css';
import './i18n';
import { AppLayout, NavView } from './ui/layouts/AppLayout';
import { ClientsView } from './ui/views/ClientsView';
import { useClientStore } from './stores/clientStore';
import { useProjectStore } from './stores/projectStore';
import { getServiceContainer } from './services/container';
import { useTranslation } from 'react-i18next';
import { KanbanSquare } from 'lucide-react';

export function App() {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<NavView>('clients');
  const [initialized, setInitialized] = useState(false);

  const { loadClients } = useClientStore();
  const { loadProjects } = useProjectStore();

  useEffect(() => {
    async function init() {
      try {
        await getServiceContainer();
        await Promise.all([loadClients(false), loadProjects(false)]);
      } catch (err) {
        console.error('Failed to initialize database or stores:', err);
      } finally {
        setInitialized(true);
      }
    }
    init();
  }, [loadClients, loadProjects]);

  if (!initialized) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
          fontSize: '1.1rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  return (
    <AppLayout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'clients' && <ClientsView />}

      {currentView === 'kanban' && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <KanbanSquare size={48} style={{ color: 'var(--accent-blue)', margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {t('nav.kanban')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              I clienti e i progetti sono configurati con successo!
              Nello <strong>Step 4</strong> attiveremo la lavagna Kanban interattiva con colonne personalizzabili e drag & drop dei task.
            </p>
            <button className="btn btn-primary" onClick={() => setCurrentView('clients')}>
              {t('clients.title')}
            </button>
          </div>
        </div>
      )}

      {currentView === 'reports' && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {t('reports.title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              I report per cliente, progetto e giorno verranno implementati nello Step 7.
            </p>
          </div>
        </div>
      )}

      {currentView === 'settings' && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {t('settings.title')}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Il backup JSON, lo snapshot SQLite e il ripristino verranno integrati nello Step 8.
            </p>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
