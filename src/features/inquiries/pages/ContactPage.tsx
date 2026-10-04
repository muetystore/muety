import React, { useState } from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { useNotification } from '@/shared/context/NotificationContext';
import { inquiryService } from '@/features/inquiries/services/inquiryService';
import { ContactInquiry, InquiryCategory } from '@/types';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  useDocumentTitle('Contact Concierge');
  const { success, warning, error } = useNotification();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<InquiryCategory>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState<ContactInquiry | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      warning('Please fill in all required fields (Name, Email, and Message).');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      warning('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Swift responsiveness
      await new Promise(resolve => setTimeout(resolve, 300));

      const created = await inquiryService.submitInquiry({
        name,
        email,
        phone,
        category,
        subject: subject || `${category.replace('_', ' ').toUpperCase()} Inquiry`,
        message
      });

      setSubmittedInquiry(created);
      success(`Enquiry #${created.inquiryNumber} registered with MUETY Concierge!`, 'Enquiry Submitted');

      // Clear fields
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
      setCategory('general');
    } catch (err: any) {
      error(err?.message || 'Failed to transmit inquiry. Please contact directly via WhatsApp or email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedInquiry(null);
  };

  // WhatsApp click handler
  const openWhatsApp = (inquiryNum?: string) => {
    const text = inquiryNum
      ? encodeURIComponent(`Namaste MUETY Team, I submitted inquiry #${inquiryNum} regarding ${subject || 'a saree order'}. Could you assist me?`)
      : encodeURIComponent('Namaste MUETY Team, I would like to inquire about your festive silk sarees and custom orders.');
    window.open(`https://wa.me/919385791540?text=${text}`, '_blank');
  };

  return (
    <div className="contact-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      
      {/* Hero Banner */}
      <div style={{
        backgroundColor: '#090d16',
        color: '#ffffff',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
      }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            padding: '4px 14px',
            borderRadius: '20px',
            marginBottom: '1rem'
          }}>
            <Sparkles size={14} color="#d4af37" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
              MUETY CUSTOMER SUPPORT
            </span>
          </div>

          <h1 style={{
            color: '#ffffff',
            fontSize: 'clamp(2rem, 4vw, 2.75rem)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            marginBottom: '0.75rem'
          }}>
            Customer Support & Assistance
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Whether you need saree weaving guidance, order tracking, returns, or styling advice, our dedicated support team is at your service.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '3rem' }} className="contact-grid">
          
          {/* Left Column: Authentic Atelier Info & Direct WhatsApp Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* WhatsApp Priority Card */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
              color: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              padding: '2rem',
              boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.35)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={22} color="#ffffff" />
                </div>
                <div>
                  <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700 }}>Instant WhatsApp Concierge</h4>
                  <span style={{ fontSize: '0.78rem', color: '#a7f3d0' }}>Average response: &lt; 5 minutes</span>
                </div>
              </div>
              
              <p style={{ fontSize: '0.9rem', color: '#e6fffa', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Chat live directly with our handloom saree weaving specialists and support managers on WhatsApp.
              </p>

              <button 
                onClick={() => openWhatsApp()}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'transform var(--transition-fast)'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span>Chat on WhatsApp (+91 9385791540)</span>
                <ExternalLink size={15} />
              </button>
            </div>

            {/* Atelier Details Card */}
            <div className="card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
                Atelier Location & Direct Channels
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Address */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    color: '#d4af37',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    flexShrink: 0
                  }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: '2px' }}>
                      Registered Address
                    </h5>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      2/32B Ramireddypatti, Palikadu, Salem – 636501, Tamil Nadu, India
                    </p>
                  </div>
                </div>

                {/* Phone & WhatsApp */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    color: '#d4af37',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    flexShrink: 0
                  }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: '2px' }}>
                      Phone & WhatsApp Support
                    </h5>
                    <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <a href="tel:+919385791540" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Phone: +91 9385791540
                      </a>
                      <a href="https://wa.me/919940668095" target="_blank" rel="noreferrer" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                        WhatsApp: +91 9940668095
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email Channels */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    color: '#d4af37',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    flexShrink: 0
                  }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: '2px' }}>
                      Official Email Inquiries
                    </h5>
                    <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <a href="mailto:support@muety.in" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Support: support@muety.in
                      </a>
                      <a href="mailto:orders@muety.in" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none' }}>
                        Orders: orders@muety.in
                      </a>
                    </div>
                  </div>
                </div>

                {/* Instagram & Operating Hours */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{
                    padding: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    color: '#d4af37',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    flexShrink: 0
                  }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '0.95rem', color: 'var(--brand-primary)', fontWeight: 700, marginBottom: '2px' }}>
                      Instagram & Operating Hours
                    </h5>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Instagram: <a href="https://instagram.com/Themuety" target="_blank" rel="noreferrer" style={{ color: 'var(--brand-accent)', fontWeight: 600, textDecoration: 'none' }}>@Themuety</a><br />
                      Mon – Sun: 9:00 AM – 9:00 PM IST (Online Store 24/7)
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Quality Commitment Trust Box */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ShieldCheck size={24} color="#d4af37" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Every inquiry is assigned a unique reference ID and addressed by a dedicated concierge advisor.
              </p>
            </div>

          </div>

          {/* Right Column: Real Contact Inquiry Form or Success Receipt */}
          <div className="card" style={{ padding: '2.5rem', position: 'relative' }}>
            
            {submittedInquiry ? (
              /* REAL SUCCESS CONFIRMATION RECEIPT */
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid #10b981',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
                }}>
                  <CheckCircle2 size={38} />
                </div>

                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  ENQUIRY SUBMITTED SUCCESSFULLY
                </span>

                <h3 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', marginTop: '6px', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>
                  Thank You, {submittedInquiry.name}
                </h3>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '440px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                  Your message has been logged into our Concierge dispatch system and sent to <strong>muetystore@gmail.com</strong>.
                </p>

                {/* Inquiry Reference Badge Box */}
                <div style={{
                  backgroundColor: '#090d16',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  textAlign: 'left',
                  marginBottom: '2rem',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inquiry Reference ID</span>
                    <span style={{ fontSize: '0.92rem', color: '#d4af37', fontWeight: 800, fontFamily: 'monospace' }}>
                      {submittedInquiry.inquiryNumber}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Email Address</span>
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{submittedInquiry.email}</span>
                    </div>
                    {submittedInquiry.phone && (
                      <div>
                        <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contact Phone</span>
                        <span style={{ color: '#f8fafc', fontWeight: 500 }}>{submittedInquiry.phone}</span>
                      </div>
                    )}
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Subject</span>
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>{submittedInquiry.subject}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={handleResetForm}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
                  >
                    <RefreshCw size={16} />
                    <span>Send Another Enquiry</span>
                  </button>
                </div>
              </div>
            ) : (
              /* THE REAL FORM */
              <>
                <div style={{ marginBottom: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.45rem', marginBottom: '0.4rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)' }}>
                    Send an Atelier Message
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                    Fill in your requirements below and our team will get in touch with you promptly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Name and Email */}
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Your Full Name *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="e.g. Meenakshi Sundaram" 
                        className="form-input" 
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Email Address *
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        placeholder="e.g. client@example.com" 
                        className="form-input" 
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Phone & Category */}
                  <div className="grid-2" style={{ gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Phone / WhatsApp (Optional)
                      </label>
                      <input 
                        type="tel" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        placeholder="+91 93857 91540" 
                        className="form-input" 
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        Inquiry Category
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as InquiryCategory)}
                        className="form-input"
                        disabled={isSubmitting}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="general">General Concierge Question</option>
                        <option value="custom_order">Custom Saree & Bridal Weaving</option>
                        <option value="order">Order Status & Delivery Tracking</option>
                        <option value="product_inquiry">Silk Fabric & Product Consultation</option>
                        <option value="feedback">Feedback & Suggestions</option>
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Subject / Order Reference (Optional)
                    </label>
                    <input 
                      type="text" 
                      value={subject} 
                      onChange={e => setSubject(e.target.value)} 
                      placeholder="e.g. Order #MT-882109 Inquiry or Bridal Consultation" 
                      className="form-input" 
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Message Details */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 0 }}>
                        Message Details *
                      </label>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {message.length} characters
                      </span>
                    </div>
                    <textarea 
                      required 
                      rows={5} 
                      value={message} 
                      onChange={e => setMessage(e.target.value)} 
                      placeholder="How may our MUETY concierge assist you today? Please share your requirements or questions in detail..." 
                      className="form-textarea" 
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg" 
                    disabled={isSubmitting}
                    style={{ 
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 700
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Submitting Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Submit Enquiry</span>
                      </>
                    )}
                  </button>

                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
                    🔒 Submitted securely with instant logging to MUETY Concierge.
                  </p>
                </form>
              </>
            )}

          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .contact-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
