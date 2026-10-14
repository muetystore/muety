import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { auditService } from '@/shared/services/auditService';
import { AdminAuditLog } from '@/shared/types';
import { ROLE_LABELS } from '@/shared/utils/permissions';
import { AdminModal } from '@/features/admin/components/AdminModal';
import { 
  History, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  User, 
  Clock, 
  Shield,
  Loader2,
  FileText,
  Tag,
  Calendar,
  Layers,
  X
} from 'lucide-react';

const PAGE_SIZE = 15;

export const AdminAuditLogs: React.FC = () => {
  useDocumentTitle('Audit Logs');
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs(250);
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
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || 
      l.action.toLowerCase().includes(q) || 
      l.actorEmail.toLowerCase().includes(q) || 
      l.entityId.toLowerCase().includes(q) ||
      (l.reason || '').toLowerCase().includes(q);
    const matchEntity = entityFilter === 'all' || l.entityType === entityFilter;
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchQuery && matchEntity && matchAction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedLogs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Extract unique actions from actual logs for dynamic filter choices
  const availableActions = Array.from(new Set([
    'ADMIN_CREATED',
    'ADMIN_INVITATION_SENT',
    'ADMIN_ROLE_CHANGED',
    'CATEGORY_CREATED',
    'CATEGORY_UPDATED',
    'CATEGORY_DELETED',
    'PRODUCT_CREATED',
    'PRODUCT_UPDATED',
    'PRODUCT_DELETED',
    'ORDER_STATUS_CHANGED',
    'ORDER_FULFILLMENT_UPDATED',
    'STORE_SETTING_UPDATED',
    ...logs.map(l => l.action)
  ])).sort();

  const isFiltered = searchQuery.trim() !== '' || entityFilter !== 'all' || actionFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setEntityFilter('all');
    setActionFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="admin-audit-logs-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '4rem', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800, margin: 0 }}>
            Immutable Executive Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            System activity log tracking administrative mutations, inventory changes, price updates, and security events.
          </p>
        </div>

        <button 
          onClick={fetchLogs} 
          disabled={isLoading}
          className="btn btn-outline btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#475569' }}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Syncing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Responsive Filters Bar */}
      <div className="card" style={{ padding: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search action, actor email, or entity ID..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="form-input"
              style={{ paddingLeft: '38px', margin: 0, width: '100%' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Entity Filter */}
          <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
            <select
              value={entityFilter}
              onChange={e => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select"
              style={{ margin: 0, width: '100%' }}
            >
              <option value="all">All Entities</option>
              <option value="PRODUCT">PRODUCT</option>
              <option value="CATEGORY">CATEGORY</option>
              <option value="ORDER">ORDER</option>
              <option value="CUSTOMER">CUSTOMER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SETTINGS">SETTINGS</option>
            </select>
          </div>

          {/* Action Filter */}
          <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
            <select
              value={actionFilter}
              onChange={e => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="form-select"
              style={{ margin: 0, width: '100%' }}
            >
              <option value="all">All Audit Actions</option>
              {availableActions.map(actionName => (
                <option key={actionName} value={actionName}>{actionName}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters / Count indicator */}
          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#64748b' }}
            >
              Reset Filters ({filtered.length} found)
            </button>
          )}
        </div>
      </div>

      {/* DESKTOP & TABLET AUDIT LOGS TABLE (Shown on screens >= 768px) */}
      <div className="admin-audit-desktop-view">
        <div className="card" style={{ width: '100%', maxWidth: '100%', padding: 0, overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1150px', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#090d16', color: '#f8fafc', borderBottom: '1px solid #1e293b' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 700, width: '160px', minWidth: '160px', whiteSpace: 'nowrap' }}>Timestamp</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, width: '200px', minWidth: '180px' }}>Actor</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, width: '130px', minWidth: '120px' }}>Role</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, width: '190px', minWidth: '180px' }}>Action</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, width: '160px', minWidth: '140px' }}>Entity</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, minWidth: '380px' }}>Details / Reason</th>
                  <th style={{ padding: '14px 16px', fontWeight: 700, textAlign: 'center', width: '70px', minWidth: '70px' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                      <Loader2 className="animate-spin" size={32} color="var(--brand-accent)" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>Syncing immutable audit records...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
                      <History size={36} color="#cbd5e1" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#475569' }}>
                        No audit events recorded matching current filters.
                      </p>
                      {isFiltered && (
                        <button onClick={handleResetFilters} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }}>
                          Clear Search & Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(l => (
                    <tr key={l.logId} style={{ borderBottom: '1px solid var(--brand-border)' }}>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {new Date(l.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--brand-primary)', wordBreak: 'break-word' }}>
                        <div>{l.actorEmail}</div>
                        {l.actorUid && (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                            {l.actorUid.substring(0, 14)}...
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          display: 'inline-block',
                          whiteSpace: 'nowrap'
                        }}>
                          {ROLE_LABELS[l.actorRole] || l.actorRole}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#d4af37',
                          backgroundColor: '#090d16',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          wordBreak: 'break-all'
                        }}>
                          {l.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', fontWeight: 600, wordBreak: 'break-all' }}>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#64748b', display: 'block' }}>{l.entityType}</span>
                        <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e293b', backgroundColor: '#f8fafc', padding: '1px 4px', borderRadius: '3px' }}>
                          {l.entityId}
                        </code>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155', minWidth: '380px', lineHeight: 1.5, wordBreak: 'normal', overflowWrap: 'break-word', fontSize: '0.88rem' }}>
                        {l.reason || 'Standard administrative mutation logged.'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(l)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Inspect full audit payload"
                          aria-label={`Inspect audit event ${l.logId}`}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Desktop Pagination Bar */}
          {filtered.length > PAGE_SIZE && (
            <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} audit logs
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-outline btn-sm"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-outline btn-sm"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE AUDIT CARDS (Shown on screens < 768px) */}
      <div className="admin-audit-mobile-view">
        {isLoading ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <Loader2 className="animate-spin" size={28} color="var(--brand-accent)" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>Loading MUETY Audit History...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <History size={36} color="#cbd5e1" style={{ margin: '0 auto 0.5rem', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No audit events found.</p>
            {isFiltered && (
              <button onClick={handleResetFilters} className="btn btn-outline btn-sm" style={{ marginTop: '0.75rem' }}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          paginatedLogs.map(l => (
            <div key={l.logId} className="admin-audit-card-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: '#d4af37',
                  backgroundColor: '#090d16',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  wordBreak: 'break-all'
                }}>
                  {l.action}
                </span>

                <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <Clock size={12} /> {new Date(l.timestamp).toLocaleDateString()} {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <User size={14} color="#64748b" />
                  <strong style={{ color: '#0f172a', wordBreak: 'break-word' }}>{l.actorEmail}</strong>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                    {ROLE_LABELS[l.actorRole] || l.actorRole}
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  <strong>Target:</strong> <span style={{ textTransform: 'uppercase', color: '#64748b' }}>{l.entityType}</span> <code style={{ backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontSize: '0.76rem', wordBreak: 'break-all' }}>{l.entityId}</code>
                </div>

                {l.reason && (
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                    {l.reason}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedLog(l)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={14} /> View Details & Payload
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination Bar */}
        {filtered.length > PAGE_SIZE && (
          <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-outline btn-sm"
                style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '4px 8px' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-outline btn-sm"
                style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '4px 8px' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rebuilt Audit Event Payload Inspector Modal */}
      <AdminModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Payload"
        subtitle="Immutable event audit trail & mutation snapshot"
        headerIcon={<Shield size={20} />}
        maxWidth="720px"
      >
        {selectedLog && (
          <>
            <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem' }}>
              
              {/* Event Metadata Grid */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Event Action</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: '#d4af37',
                      backgroundColor: '#090d16',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      marginTop: '2px'
                    }}>
                      {selectedLog.action}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Timestamp</span>
                    <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 600 }}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Actor Identity</span>
                    <strong style={{ color: '#0f172a', display: 'block', wordBreak: 'break-word' }}>{selectedLog.actorEmail}</strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>UID: {selectedLog.actorUid}</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Actor Role</span>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#e2e8f0',
                      color: '#1e293b',
                      marginTop: '2px'
                    }}>
                      {ROLE_LABELS[selectedLog.actorRole] || selectedLog.actorRole}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Target Entity</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedLog.entityType}</span>: <code style={{ backgroundColor: '#ffffff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.78rem', wordBreak: 'break-all' }}>{selectedLog.entityId}</code>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Log ID</span>
                    <code style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>{selectedLog.logId}</code>
                  </div>
                </div>

                {selectedLog.reason && (
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>Audit Reason / Notes</span>
                    <p style={{ margin: '2px 0 0 0', color: '#334155', fontSize: '0.85rem', lineHeight: 1.45 }}>
                      {selectedLog.reason}
                    </p>
                  </div>
                )}
              </div>

              {/* JSON Mutation Payload */}
              {selectedLog.after && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="var(--brand-accent)" /> Snapshot Mutation Payload (JSON)
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>State after mutation</span>
                  </div>
                  <pre style={{
                    backgroundColor: '#090d16',
                    color: '#34d399',
                    padding: '1rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    border: '1px solid #1e293b',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button 
                type="button" 
                onClick={() => setSelectedLog(null)} 
                className="btn btn-primary"
                style={{ minWidth: '130px', fontWeight: 700 }}
              >
                Close Inspector
              </button>
            </div>
          </>
        )}
      </AdminModal>

    </div>
  );
};
