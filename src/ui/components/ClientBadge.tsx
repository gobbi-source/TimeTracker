import React from 'react';
import { useTranslation } from 'react-i18next';
import { Client } from '../../domain/entities/Client';

interface ClientBadgeProps {
  client?: Client | null;
  clientName?: string | null;
  clientColor?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export const ClientBadge: React.FC<ClientBadgeProps> = ({
  client,
  clientName,
  clientColor,
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation();

  const name = client?.name ?? clientName;
  const color = client?.color ?? clientColor ?? '#6366f1';

  if (!name) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium border ${
          size === 'sm' ? 'text-xs' : 'text-xs'
        } ${className}`}
        style={{
          backgroundColor: 'rgba(100, 116, 139, 0.12)',
          borderColor: 'rgba(100, 116, 139, 0.25)',
          color: '#94a3b8',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#94a3b8' }}
        />
        {t('common.internal')}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium border transition-all ${
        size === 'sm' ? 'text-xs' : 'text-xs'
      } ${className}`}
      style={{
        backgroundColor: `${color}18`, // 10% opacity background
        borderColor: `${color}40`,     // 25% opacity border
        color: color,
      }}
      title={`${t('clients.title')}: ${name}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      <span className="truncate max-w-[140px]">{name}</span>
    </span>
  );
};
