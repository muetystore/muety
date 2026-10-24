import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { campaignService } from '@/features/email/services/campaignService';
import { Mail, CheckCircle2, ShieldCheck, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

export const UnsubscribePage: React.FC = () => {
  useDocumentTitle('Patron Email Preferences — MUETY Atelier');
  const [searchParams] = useSearchParams();

  const urlEmail = searchParams.get('email') || '';
  const urlToken = searchParams.get('token') || '';

  const [email, setEmail] = useState(urlEmail);
  const [reason, setReason] = useState('Frequency too high');
  const [processing, setProcessing] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
    }
  }, [urlEmail]);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setProcessing(true);
    setErrorMsg(null);

    try {
      await campaignService.publicUnsubscribe(email, urlToken, reason);
      setUnsubscribed(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred processing your preference. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-serif font-bold text-[#090d16] tracking-widest">
              MUETY
            </span>
          </Link>
          <div className="text-xs uppercase tracking-[0.2em] text-[#8c827a] font-sans mt-1">
            Royal Indian Handlooms &bull; Banaras Atelier
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#e7ded0] overflow-hidden p-8">
          {unsubscribed ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h1 className="text-2xl font-serif font-bold text-[#090d16]">
                You have been unsubscribed
              </h1>

              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                The address <strong className="text-slate-900 font-mono">{email}</strong> has been immediately added to our suppression list. You will no longer receive marketing communications or promotional showcases from MUETY.
              </p>

              <div className="p-3.5 bg-[#faf7f2] rounded-xl border border-[#e7ded0] text-xs text-slate-500 text-left space-y-1">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Transactional Notice:
                </div>
                <div>
                  You will still receive authoritative order receipts and shipment tracking notices for any active or future atelier purchases you make.
                </div>
              </div>

              <div className="pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#090d16] text-[#f4c430] text-xs font-serif font-bold tracking-widest uppercase hover:bg-slate-900 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Storefront
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-serif font-bold text-[#090d16]">
                  Manage Patron Email Preferences
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  We respect your inbox and patron autonomy. You can instantly opt out of promotional newsletters and special edition previews below.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="patron@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-[#c99a16]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Unsubscribing (Optional)
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:border-[#c99a16]"
                >
                  <option value="Frequency too high">I receive too many emails</option>
                  <option value="Content not relevant">Content is no longer relevant to me</option>
                  <option value="Never signed up">I do not recall opting in</option>
                  <option value="Other preference">Other personal preference</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 px-4 rounded-lg bg-[#090d16] text-[#f4c430] font-serif font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Processing Request...
                    </>
                  ) : (
                    'Unsubscribe from Promotional Emails'
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <Link to="/" className="text-xs text-slate-500 hover:text-slate-800 transition">
                  Keep my subscription and return to storefront
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          MUETY Atelier Pvt Ltd &bull; Handcrafted Banarasi Silk Sarees &bull; Varanasi
        </div>
      </div>
    </div>
  );
};
