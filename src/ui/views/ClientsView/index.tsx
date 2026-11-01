import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useClientStore } from '../../../stores/clientStore';
import { useProjectStore } from '../../../stores/projectStore';
import { Client, CreateClientInput, UpdateClientInput } from '../../../domain/entities/Client';
import { ClientModal } from './ClientModal';
import { Plus, Edit2, Archive, Search, Briefcase } from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { t } = useTranslation();
  const { clients, loadClients, createClient, updateClient, archiveClient } = useClientStore();
  const { projects, loadProjects } = useProjectStore();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadClients(showArchived);
    loadProjects(true);
  }, [showArchived, loadClients, loadProjects]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleSave = async (data: CreateClientInput | UpdateClientInput) => {
    if (editingClient) {
      await updateClient(editingClient.id, data);
    } else {
      await createClient(data as CreateClientInput);
    }
  };

  const handleArchive = async (client: Client) => {
    if (window.confirm(t('clients.confirmArchive'))) {
      await archiveClient(client.id);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            {t('clients.title')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
            {t('clients.subtitle')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} />
          {t('clients.addNew')}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ width: 'auto' }}
          />
          {t('clients.showArchived')}
        </label>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', marginTop: '1rem' }}>
          <Briefcase size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {t('clients.noClients')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            {t('clients.noClientsPrompt')}
          </p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            <Plus size={18} />
            {t('clients.addNew')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredClients.map((client) => {
            const clientProjects = projects.filter((p) => p.clientId === client.id);
            const isArchived = Boolean(client.deletedAt);
            const clientColor = client.color || '#6366f1';

            return (
              <div
                key={client.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isArchived ? 0.6 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Color accent line on top of the card */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: clientColor,
                  }}
                />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: clientColor,
                          boxShadow: `0 0 10px ${clientColor}80`,
                          flexShrink: 0,
                        }}
                      />
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {client.name}
                      </h3>
                    </div>

                    {isArchived && (
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                        {t('clients.archived')}
                      </span>
                    )}
                  </div>

                  {client.notes && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {client.notes}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                    <Briefcase size={15} />
                    <span>{clientProjects.length} {t('clients.activeProjects')}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenEdit(client)}
                      title={t('common.edit')}
                    >
                      <Edit2 size={16} />
                    </button>
                    {!isArchived && (
                      <button
                        className="btn-icon"
                        onClick={() => handleArchive(client)}
                        title={t('clients.archiveClient')}
                        style={{ color: '#fda4af' }}
                      >
                        <Archive size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Edit/Add Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingClient}
      />
    </div>
  );
};
