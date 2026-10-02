import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { inquiryService } from '@/features/inquiries/services/inquiryService';
import { useNotification } from '@/shared/context/NotificationContext';
import { ContactInquiry, InquiryStatus } from '@/types';
import { 
  MessageSquare, 
  Search, 
  Mail, 
  Trash2, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  X
} from 'lucide-react';

export const AdminInquiries: React.FC = () => {
  useDocumentTitle('MUETY Admin | Customer Inquiries');
  const { success } = useNotification();

  const [inquiries, setInquiries] = useState<ContactInquiry[]>(() => inquiryService.getInquiries());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null);
  const [adminReplyNotes, setAdminReplyNotes] = useState('');

  const refreshInquiries = () => {
    setInquiries(inquiryService.getInquiries());
  };

  useEffect(() => {
    window.addEventListener('muety_inquiries_updated', refreshInquiries);
    return () => {
      window.removeEventListener('muety_inquiries_updated', refreshInquiries);
    };
  }, []);

  const handleStatusChange = (id: string, newStatus: InquiryStatus) => {
    const updated = inquiryService.updateStatus(id, newStatus);
    if (updated) {
      refreshInquiries();
      if (selectedInquiry && selectedInquiry.id === id) {
        setSelectedInquiry(updated);
      }
      success(`Inquiry #${updated.inquiryNumber} marked as ${newStatus.toUpperCase()}.`, 'Status Updated');
    }
  };

  const handleSaveNotes = (id: string) => {
    const updated = inquiryService.updateStatus(id, selectedInquiry?.status || 'replied', adminReplyNotes);
    if (updated) {
      refreshInquiries();
      setSelectedInquiry(updated);
      success('Internal concierge notes saved.', 'Notes Saved');
    }
  };

  const handleDelete = (id: string, num: string) => {
    if (window.confirm(`Are you sure you want to delete Inquiry #${num}?`)) {
      inquiryService.deleteInquiry(id);
      refreshInquiries();
      if (selectedInquiry?.id === id) {
        setSelectedInquiry(null);
      }
      success(`Inquiry #${num} removed from records.`, 'Deleted');
    }
  };

  const openWhatsAppReply = (inquiry: ContactInquiry) => {
    const cleanPhone = (inquiry.phone || '').replace(/[^0-9]/g, '');
    const phoneToUse = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '919385791540';
    const text = encodeURIComponent(`Namaste ${inquiry.name}, This is the MUETY Concierge desk replying to your Inquiry #${inquiry.inquiryNumber} regarding: "${inquiry.subject}". `);
    window.open(`https://wa.me/${phoneToUse}?text=${text}`, '_blank');
    handleStatusChange(inquiry.id, 'replied');
  };

  const openEmailReply = (inquiry: ContactInquiry) => {
    const mailto = `mailto:${inquiry.email}?subject=${encodeURIComponent(`[${inquiry.inquiryNumber}] MUETY Concierge Reply: ${inquiry.subject}`)}&body=${encodeURIComponent(`Dear ${inquiry.name},\n\nThank you for contacting the MUETY Atelier.\n\nIn response to your inquiry regarding:\n"${inquiry.message}"\n\n`)}`;
    window.location.href = mailto;
    handleStatusChange(inquiry.id, 'replied');
  };

  const filteredInquiries = inquiries.filter(i => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (i.name || '').toLowerCase().includes(q) ||
      (i.email || '').toLowerCase().includes(q) ||
      (i.inquiryNumber || '').toLowerCase().includes(q) ||
      (i.subject || '').toLowerCase().includes(q) ||
      (i.message || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const unreadCount = inquiries.filter(i => i.status === 'unread').length;
  const repliedCount = inquiries.filter(i => i.status === 'replied').length;
  const resolvedCount = inquiries.filter(i => i.status === 'resolved').length;

  return (
    <div className="admin-inquiries-page animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', color: '#d4af37', textTransform: 'uppercase' }}>
              CUSTOMER DESK
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--font-heading)' }}>
            Patron Inquiries & Messages
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
            Review, reply, and manage direct inquiries submitted through the contact form.
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Total Inquiries</span>
            <MessageSquare size={18} color="#0f172a" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{inquiries.length}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Unread Messages</span>
            <AlertCircle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>{unreadCount}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Replied</span>
            <Clock size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{repliedCount}</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Resolved</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>{resolvedCount}</div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem', backgroundColor: '#ffffff' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by customer name, email, subject, or #ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '38px', margin: 0 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ margin: 0, width: 'auto', minWidth: '140px' }}
            >
              <option value="all">All Statuses</option>
              <option value="unread">🔴 Unread Only</option>
              <option value="read">👁️ Read</option>
              <option value="replied">💬 Replied</option>
              <option value="resolved">✅ Resolved</option>
            </select>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="form-input"
              style={{ margin: 0, width: 'auto', minWidth: '160px' }}
            >
              <option value="all">All Categories</option>
              <option value="custom_order">Custom Saree & Bridal</option>
              <option value="order">Order Tracking</option>
              <option value="product_inquiry">Product & Fabric</option>
              <option value="general">General Concierge</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {filteredInquiries.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <MessageSquare size={44} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '4px' }}>No Inquiries Found</h4>
            <p style={{ fontSize: '0.9rem' }}>Try adjusting your search criteria or filter options.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '14px 16px' }}>Ref #</th>
                  <th style={{ padding: '14px 16px' }}>Patron</th>
                  <th style={{ padding: '14px 16px' }}>Category</th>
                  <th style={{ padding: '14px 16px' }}>Subject & Message</th>
                  <th style={{ padding: '14px 16px' }}>Status</th>
                  <th style={{ padding: '14px 16px' }}>Date</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inq) => {
                  const isUnread = inq.status === 'unread';

                  let statusBg = '#e2e8f0';
                  let statusColor = '#475569';
                  if (inq.status === 'unread') {
                    statusBg = '#fee2e2';
                    statusColor = '#b91c1c';
                  } else if (inq.status === 'replied') {
                    statusBg = '#dbeafe';
                    statusColor = '#1d4ed8';
                  } else if (inq.status === 'resolved') {
                    statusBg = '#d1fae5';
                    statusColor = '#047857';
                  }

                  return (
                    <tr 
                      key={inq.id} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isUnread ? '#fffbf0' : 'transparent',
                        fontWeight: isUnread ? 600 : 400
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace', color: '#b45309', fontWeight: 700 }}>
                        {inq.inquiryNumber}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ color: '#0f172a', fontWeight: 700 }}>{inq.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{inq.email}</div>
                        {inq.phone && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{inq.phone}</div>}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {inq.category.replace('_', ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                        <div style={{ color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inq.subject}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {inq.message}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <select
                          value={inq.status}
                          onChange={(e) => handleStatusChange(inq.id, e.target.value as InquiryStatus)}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: statusBg,
                            color: statusColor,
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="unread">UNREAD</option>
                          <option value="read">READ</option>
                          <option value="replied">REPLIED</option>
                          <option value="resolved">RESOLVED</option>
                        </select>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#64748b' }}>
                        {new Date(inq.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => {
                              setSelectedInquiry(inq);
                              setAdminReplyNotes(inq.adminNotes || '');
                              if (inq.status === 'unread') {
                                handleStatusChange(inq.id, 'read');
                              }
                            }}
                            className="btn btn-sm btn-outline"
                            title="View Full Inquiry"
                          >
                            View
                          </button>

                          <button
                            onClick={() => openWhatsAppReply(inq)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#059669', color: '#ffffff', padding: '4px 8px' }}
                            title="Reply on WhatsApp"
                          >
                            WhatsApp
                          </button>

                          <button
                            onClick={() => openEmailReply(inq)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '4px 8px' }}
                            title="Reply via Email"
                          >
                            Email
                          </button>

                          <button
                            onClick={() => handleDelete(inq.id, inq.inquiryNumber)}
                            style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedInquiry && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="animate-fade-in card" style={{
            maxWidth: '680px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 800, fontFamily: 'monospace' }}>
                  {selectedInquiry.inquiryNumber}
                </span>
                <h3 style={{ fontSize: '1.35rem', color: '#0f172a', fontWeight: 800, marginTop: '2px' }}>
                  {selectedInquiry.subject}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Patron Name</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{selectedInquiry.name}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Email Address</span>
                <a href={`mailto:${selectedInquiry.email}`} style={{ color: '#2563eb', fontWeight: 600 }}>{selectedInquiry.email}</a>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Phone / WhatsApp</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedInquiry.phone || 'Not provided'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Received On</span>
                <span style={{ color: '#475569' }}>{new Date(selectedInquiry.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Customer Message:
              </label>
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: '#1e293b',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedInquiry.message}
              </div>
            </div>

            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                Concierge Internal Notes:
              </label>
              <textarea
                rows={3}
                value={adminReplyNotes}
                onChange={e => setAdminReplyNotes(e.target.value)}
                placeholder="Add notes about phone calls, WhatsApp messages, or order resolutions..."
                className="form-textarea"
                style={{ marginBottom: '8px' }}
              />
              <button 
                onClick={() => handleSaveNotes(selectedInquiry.id)}
                className="btn btn-sm btn-outline"
              >
                Save Notes
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <button
                onClick={() => openWhatsAppReply(selectedInquiry)}
                className="btn btn-accent"
                style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageSquare size={16} />
                <span>Chat on WhatsApp</span>
              </button>

              <button
                onClick={() => openEmailReply(selectedInquiry)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Mail size={16} />
                <span>Reply via Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
