import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, PlusCircle, CheckCircle2 } from 'lucide-react';
import { submitIncident, Location } from '@/lib/api';
import { toast } from 'sonner';

interface IncidentDialogProps {
  locations: Location[];
  onIncidentLogged: () => void;
}

const defaultForm = {
  locationCode: '',
  severity: 'medium' as string,
  latitude: 52.2348,
  longitude: -0.5234,
  reporter: 'DSL',
  description: '',
  concernType: 'bullying',
};

const CONCERN_TYPE_OPTIONS = [
  { value: 'physical_threat',  label: 'Physical Threat' },
  { value: 'physical_harm',    label: 'Physical Harm / Assault' },
  { value: 'verbal_abuse',     label: 'Verbal Abuse / Harassment' },
  { value: 'weapons',          label: 'Weapon / Armed Threat' },
  { value: 'substance',        label: 'Drugs / Alcohol' },
  { value: 'self_harm',        label: 'Welfare / Self-Harm' },
  { value: 'cyber',            label: 'Cyber / Online Threat' },
  { value: 'lone_worker',      label: 'Lone Worker Concern' },
  { value: 'theft',            label: 'Theft / Property Crime' },
  { value: 'other',            label: 'Other Concern' },
];

export function IncidentDialog({ locations, onIncidentLogged, children }: IncidentDialogProps & { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ ...defaultForm });

  const handleLocationChange = (code: string) => {
    const loc = locations.find(l => l.code === code);
    setFormData(f => ({
      ...f,
      locationCode: code,
      latitude: loc?.lat ?? f.latitude,
      longitude: loc?.lng ?? f.longitude,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const taggedDescription = `[${formData.concernType.toUpperCase()}] ${formData.description}`;
      await submitIncident({ ...formData, description: taggedDescription, status: 'pending' });
      setSubmitted(true);
      toast.success('Incident logged to Case Vault');
      onIncidentLogged();
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({ ...defaultForm });
      }, 1500);
    } catch {
      toast.error('Failed to log concern. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => { setOpen(v); if (!v) { setSubmitted(false); setFormData({ ...defaultForm }); } }}>
      <Dialog.Trigger asChild>
        {children ? children : (
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#050505] text-white text-xs font-black rounded-full hover:bg-slate-800 transition-all shadow-xl shadow-black/10 active:scale-95 uppercase tracking-[0.15em]">
            <PlusCircle size={14} /> Log Incident
          </button>
        )}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#1A1C23] rounded-xl shadow-2xl z-50 animate-in zoom-in-95 duration-200 overflow-hidden border border-transparent dark:border-white/10">
          <Dialog.Close className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors z-10">
            <X size={18} />
          </Dialog.Close>

          {submitted ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">Incident Logged</h3>
              <p className="text-sm text-neutral-500 dark:text-slate-400">Added to the Case Vault. ARIA is analysing for risk patterns across all zones.</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-white/10">
                <Dialog.Title className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Log Incident / Concern
                </Dialog.Title>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Safety Lead / staff report — logged to the Case Vault immediately and in confidence.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Concern Type</label>
                    <select
                      value={formData.concernType}
                      onChange={e => setFormData({ ...formData, concernType: e.target.value })}
                      className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 bg-white dark:bg-[#12141A]"
                    >
                      {CONCERN_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Urgency</label>
                    <select
                      value={formData.severity}
                      onChange={e => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 bg-white dark:bg-[#12141A]"
                    >
                      <option value="low">Low — Not urgent</option>
                      <option value="medium">Medium — Review today</option>
                      <option value="high">High — Urgent</option>
                      <option value="critical">Critical — Immediate</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">What was observed?</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 resize-none placeholder:text-neutral-300 dark:placeholder:text-slate-600 bg-white dark:bg-[#12141A]"
                    rows={3}
                    placeholder="Record what was seen, heard, or reported — include any context that may be relevant..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Zone / Location</label>
                  {locations.length > 0 ? (
                    <select
                      required
                      value={formData.locationCode}
                      onChange={e => handleLocationChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 bg-white dark:bg-[#12141A]"
                    >
                      <option value="">Select area...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.code}>{loc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      value={formData.locationCode}
                      onChange={e => setFormData({ ...formData, locationCode: e.target.value })}
                      className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm font-mono text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 bg-white dark:bg-[#12141A]"
                      placeholder="GFA-CORR-B"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Reported By (Safety Lead / Staff)</label>
                  <input
                    type="text"
                    value={formData.reporter}
                    onChange={e => setFormData({ ...formData, reporter: e.target.value })}
                    className="w-full px-3 py-2.5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-[#00E5FF]/50 bg-white dark:bg-[#12141A]"
                    placeholder="Your name or role"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Dialog.Close asChild>
                    <button type="button" className="flex-1 py-2.5 text-sm text-neutral-600 dark:text-slate-400 border border-neutral-200 dark:border-white/10 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors font-medium">
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-neutral-900 dark:bg-[#00E5FF] dark:text-[#0F1117] rounded-lg hover:bg-neutral-800 dark:hover:bg-[#33EEFF] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Logging…' : 'Log Concern'}
                  </button>
                </div>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
