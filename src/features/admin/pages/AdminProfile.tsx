import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useNotification } from '@/shared/context/NotificationContext';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { adminProfileService } from '@/features/admin/services/adminProfileService';
import { getUserRoles, ROLE_LABELS } from '@/shared/utils/permissions';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Lock, 
  Upload, 
  Save, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  FileText,
  Camera,
  Loader2,
  ShieldAlert,
  Info
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.157 4.228 4.228-1.157zm11.332-6.576c-.287-.143-1.696-.837-1.959-.933-.263-.095-.455-.143-.647.143-.191.287-.741.933-.909 1.125-.168.192-.335.215-.622.072-.287-.143-1.213-.447-2.311-1.427-.855-.763-1.432-1.705-1.6-1.993-.168-.287-.018-.442.126-.585.13-.129.287-.335.431-.503.144-.168.192-.287.287-.479.096-.192.048-.359-.024-.503-.072-.143-.647-1.556-.886-2.128-.233-.558-.47-.482-.647-.491l-.551-.01c-.192 0-.503.072-.766.359s-1.006.982-1.006 2.395 1.03 2.777 1.173 2.969c.144.192 2.029 3.099 4.916 4.344.687.296 1.224.473 1.642.606.69.22 1.319.189 1.816.115.554-.083 1.696-.694 1.935-1.364.239-.67.239-1.244.168-1.364-.072-.12-.263-.192-.55-.335z"/>
  </svg>
);

export const AdminProfile: React.FC = () => {
  useDocumentTitle('MUETY Admin | My Profile');
  const { user, sendPasswordReset } = useAuth();
  const { success, error, info } = useNotification();

  // Profile Form States
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [bio, setBio] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form with current admin user data
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.displayName || '');
      setDisplayName(user.displayName || '');
      setPhone(user.phone || user.phoneNumber || '');
      setAlternatePhone(user.whatsappNumber || user.alternatePhone || '');
      setJobTitle(user.jobTitle || '');
      setBio(user.bio || '');
      setProfilePhotoUrl(user.profilePhotoUrl || user.photoURL || '');
    }
  }, [user]);

  const getWhatsAppUrl = (raw: string): string => {
    if (!raw || !raw.trim()) return '';
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const fullDigits = digits.length === 10 ? `91${digits}` : digits;
    return `https://wa.me/${fullDigits}`;
  };

  if (!user) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#d4af37' }} />
        <p>Loading Admin Profile...</p>
      </div>
    );
  }

  const userRoles = getUserRoles(user);
  const primaryRoleSlug = user.roleSlug || userRoles[0] || 'admin';
  const roleLabel = user.roleName || ROLE_LABELS[primaryRoleSlug as keyof typeof ROLE_LABELS] || primaryRoleSlug;
  const deptLabel = user.departmentName || 'Management';
  const muetyEmail = user.muetyEmail || user.email || '';
  const personalEmail = user.personalEmail || muetyEmail;
  const isAccountActive = !user.isBlocked && user.status !== 'disabled';

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setPhoneError(null);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const uploadedUrl = await adminProfileService.uploadProfilePhoto(user.uid, file);
      setProfilePhotoUrl(uploadedUrl);
      success('Profile photo uploaded successfully.');
    } catch (err: any) {
      error(err?.message || 'Failed to upload profile photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    if (!displayName.trim()) {
      error('Display Name is required.');
      return;
    }

    // Validate phone number if provided
    if (phone.trim()) {
      const phoneCheck = adminProfileService.validatePhoneNumber(phone);
      if (!phoneCheck.valid) {
        setPhoneError(phoneCheck.error || 'Invalid phone number format.');
        error(phoneCheck.error || 'Please check your contact number format.');
        return;
      }
    }

    if (alternatePhone.trim()) {
      const altCheck = adminProfileService.validatePhoneNumber(alternatePhone);
      if (!altCheck.valid) {
        error(`Alternate phone error: ${altCheck.error}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await adminProfileService.updateAdminProfile(user.uid, {
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        profilePhotoUrl: profilePhotoUrl.trim(),
        jobTitle: jobTitle.trim(),
        bio: bio.trim()
      });

      success('Profile updated successfully.');
    } catch (err: any) {
      console.error('[AdminProfile] Save failed:', err);
      error(err?.message || 'Unable to update your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!muetyEmail) {
      error('No valid account email found for password reset.');
      return;
    }

    if (!window.confirm(`Dispatch password reset instructions to your login email (${muetyEmail})?`)) {
      return;
    }

    setIsSendingPasswordReset(true);
    try {
      await sendPasswordReset(muetyEmail);
      success(`Password reset link dispatched to ${muetyEmail}. Please check your inbox.`, 'Security Reset Dispatched');
    } catch (err: any) {
      error(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  return (
    <div className="admin-profile-page animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
          My Admin Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
          Manage your personal contact details, display preferences, and account security credentials.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Profile Card: Avatar & Personal Info */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} color="#d4af37" />
            <span>Personal Details</span>
          </h2>

          {/* Avatar / Profile Photo Upload Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.75rem',
            padding: '1.25rem',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #e2e8f0',
            marginBottom: '1.75rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                backgroundColor: '#090d16',
                color: '#d4af37',
                fontSize: '2.2rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px solid #d4af37',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)',
                overflow: 'hidden'
              }}>
                {profilePhotoUrl ? (
                  <img 
                    src={profilePhotoUrl} 
                    alt={displayName || 'Admin'} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setProfilePhotoUrl('')}
                  />
                ) : (
                  <span>{(displayName || user.email || 'A').charAt(0).toUpperCase()}</span>
                )}
              </div>

              {isUploadingPhoto && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(9, 13, 22, 0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff'
                }}>
                  <Loader2 size={24} className="animate-spin" />
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {displayName || fullName || 'MUETY Admin'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 12px 0' }}>
                {roleLabel}
              </p>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                >
                  <Camera size={15} />
                  <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                </button>

                {profilePhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setProfilePhotoUrl('')}
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.8rem', color: '#ef4444', borderColor: '#fca5a5' }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Mohan Kumar"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Display Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Mohan"
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Contact Number (India / Global)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="+91 9876543210 or 9876543210"
                  className="form-input"
                  style={{
                    borderColor: phoneError ? '#ef4444' : undefined,
                    paddingLeft: '2.4rem'
                  }}
                />
                <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              {phoneError && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {phoneError}
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                WhatsApp Number (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={alternatePhone}
                  onChange={e => setAlternatePhone(e.target.value)}
                  placeholder="+91 9876543210 or 9876543210"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', color: '#25D366' }}>
                  <WhatsAppIcon size={18} />
                </span>
              </div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Short Bio / Operational Notes
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Brief administrative bio or department notes..."
                className="form-input"
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        {/* Account Emails Section (Read Only) */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={20} color="#d4af37" />
            <span>Account Email Credentials</span>
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>MUETY Login Email</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} /> Read only
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {muetyEmail}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                Primary Firebase Authentication identity.
              </span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Personal Email</span>
                <span style={{ fontSize: '0.7rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={10} /> Read only
                </span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {personalEmail}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                Destination for onboarding setup invitations and security alerts.
              </span>
            </div>
          </div>
        </div>

        {/* Read-Only Organization Section */}
        <div className="card" style={{ padding: '1.75rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#d4af37" />
              <span>Organization & Authorization</span>
            </h2>

            <span style={{
              fontSize: '0.78rem',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Info size={14} color="#64748b" />
              Managed by MUETY Administrators
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                DEPARTMENT
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                {deptLabel}
              </span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                OPERATIONAL ROLE
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#d4af37' }}>
                {roleLabel}
              </span>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                ACCOUNT STATUS
              </span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: isAccountActive ? '#10b981' : '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {isAccountActive ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                {isAccountActive ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', marginBottom: 0, fontStyle: 'italic' }}>
            Note: Department assignment and operational roles are organization-controlled. To request role changes, contact a MUETY Super Admin.
          </p>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePasswordReset}
            disabled={isSendingPasswordReset}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#334155' }}
          >
            {isSendingPasswordReset ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            <span>{isSendingPasswordReset ? 'Sending Reset Email...' : 'Change Password'}</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-accent btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700, padding: '12px 28px' }}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
