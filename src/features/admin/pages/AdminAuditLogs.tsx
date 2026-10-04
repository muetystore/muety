import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { auditService } from '@/shared/services/auditService';
import { AdminAuditLog } from '@/shared/types';
import { ROLE_LABELS } from '@/shared/utils/permissions';
import { History, Shield, Filter, Search, RefreshCw } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  useDocumentTitle('Audit Logs');
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs(150);
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const handleUpdate = () => fetchLogs();
    window.addEventListener('muety_audit_logs_updated', handleUpdate);
    return () => window.removeEventListener('muety_audit_logs_updated', handleUpdate);
  }, []);

  const filtered = logs.filter(l => {
    const q = searchQuery.toLowerCase();
    const matchQuery = l.action.toLowerCase().includes(q) || l.actorEmail.toLowerCase().includes(q) || l.entityId.toLowerCase().includes(q);
    const matchEntity = entityFilter === 'all' || l.entityType === entityFilter;
    return matchQuery && matchEntity;
  });

  return (
    <div className="admin-audit-logs-page animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            Immutable Executive Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '2px' }}>
            System activity log tracking all sensitive administrative actions, price adjustments, and configuration changes.
          </p>
        </div>

        <button 
          onClick={fetchLogs} 
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Filter by action, admin email, or entity ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '38px', margin: 0 }}
          />
        </div>

        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="form-input"
          style={{ width: '220px', margin: 0 }}
        >
          <option value="all">All Entity Types</option>
          <option value="PRODUCT">PRODUCT</option>
          <option value="CATEGORY">CATEGORY</option>
          <option value="ORDER">ORDER</option>
          <option value="CUSTOMER">CUSTOMER</option>
          <option value="ADMIN">ADMIN</option>
          <option value="SETTINGS">SETTINGS</option>
          <option value="INVENTORY">INVENTORY</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Timestamp</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Actor / Executive</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Role</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Action</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Entity</th>
                <th style={{ padding: '14px 18px', fontWeight: 700 }}>Details / Reason</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    Loading MUETY Audit History...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <History size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No audit records log found matching current filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => (
                  <tr key={l.logId} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--brand-primary)' }}>
                      {l.actorEmail}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        border: '1px solid #cbd5e1'
                      }}>
                        {ROLE_LABELS[l.actorRole] || l.actorRole}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#d4af37',
                        backgroundColor: '#090d16',
                        padding: '3px 8px',
                        borderRadius: '4px'
                      }}>
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569', fontWeight: 600 }}>
                      {l.entityType} ({l.entityId.substring(0, 10)})
                    </td>
                    <td style={{ padding: '14px 18px', color: 'var(--text-secondary)' }}>
                      {l.reason || 'Standard administrative mutation logged.'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
