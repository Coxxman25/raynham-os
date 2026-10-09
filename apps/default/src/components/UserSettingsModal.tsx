import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Bell, Monitor, Shield, LogOut, ChevronRight,
  Building2, Moon, Sun, Sunset, Volume2, VolumeX, Mail, Smartphone,
  Check, AlertTriangle, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserSettingsModalProps {
  open: boolean;
  onClose: () => void;
  theme: string;
  onToggleTheme: (theme: 'night' | 'dusk' | 'light') => void;
}

type SettingsTab = 'profile' | 'notifications' | 'display' | 'security';

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'display',       label: 'Display',       icon: Monitor },
  { id: 'security',      label: 'Security',      icon: Shield },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-10 h-5.5 rounded-full transition-colors duration-300 flex-shrink-0',
        enabled ? 'bg-green-500' : 'bg-slate-700'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300',
          enabled ? 'translate-x-4.5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  sub,
  children,
  border = true,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between py-3.5', border && 'border-b border-white/5')}>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="ml-4 flex-shrink-0">{children}</div>
    </div>
  );
}

export function UserSettingsModal({ open, onClose, theme, onToggleTheme }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  // Profile state
  const [name, setName] = useState('Sarah Jenkins');
  const [role, setRole] = useState('Welfare Officer');
  const [email, setEmail] = useState('s.jenkins@wilsonjones.aero');

  // Notification state
  const [notifIncident, setNotifIncident] = useState(true);
  const [notifSound, setNotifSound] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifDigest, setNotifDigest] = useState(true);
  const [notifHighOnly, setNotifHighOnly] = useState(false);

  // Display state
  const [sidebarDefault, setSidebarDefault] = useState<'expanded' | 'collapsed'>('expanded');
  const [defaultView, setDefaultView] = useState<'monitor' | 'respond' | 'publish'>('monitor');
  const [compactMode, setCompactMode] = useState(false);

  // Security state
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [sessionTimeout, setSessionTimeout] = useState('never');

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-2xl mx-4 bg-[#0F1117] border border-white/8 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col"
              style={{ maxHeight: '85vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 flex-shrink-0">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Account Settings</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Manage your profile, alerts and preferences</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/8 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Sidebar Tabs */}
                <div className="w-44 border-r border-white/5 p-4 flex-shrink-0 bg-white/[0.02]">
                  <nav className="space-y-1">
                    {TABS.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                            isActive
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                          )}
                        >
                          <Icon size={13} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Sign Out */}
                  <div className="mt-auto pt-4 border-t border-white/5 mt-6">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all duration-200">
                      <LogOut size={13} />
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-8">
                    <AnimatePresence mode="wait">
                      {/* ── PROFILE ── */}
                      {activeTab === 'profile' && (
                        <motion.div
                          key="profile"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Your Profile</h3>

                          {/* Avatar */}
                          <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/30 to-slate-700 border border-white/10 flex items-center justify-center text-lg font-black text-white">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{role}</p>
                              <button className="text-[10px] text-green-500 hover:text-green-400 mt-1.5 font-semibold transition-colors">
                                Change photo
                              </button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Full Name</label>
                              <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Role / Title</label>
                              <input
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Email Address</label>
                              <input
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 focus:bg-white/8 transition-all"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Venue</label>
                              <div className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-300 flex items-center gap-2">
                                <Building2 size={13} className="text-slate-500" />
                                Wilson Jones — Aviation & Logistics
                                <span className="ml-auto text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Primary</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── NOTIFICATIONS ── */}
                      {activeTab === 'notifications' && (
                        <motion.div
                          key="notifications"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Alert Preferences</h3>

                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-5 divide-y divide-white/5">
                            <SettingRow label="Live Incident Alerts" sub="Pop-up notifications for new reports" border={false}>
                              <Toggle enabled={notifIncident} onToggle={() => setNotifIncident(v => !v)} />
                            </SettingRow>
                            <SettingRow label="Alert Sound" sub="Play sound when incident arrives">
                              <Toggle enabled={notifSound} onToggle={() => setNotifSound(v => !v)} />
                            </SettingRow>
                            <SettingRow label="High Severity Only" sub="Suppress low-priority notifications">
                              <Toggle enabled={notifHighOnly} onToggle={() => setNotifHighOnly(v => !v)} />
                            </SettingRow>
                            <SettingRow label="Email Notifications" sub="Send alerts to your email address">
                              <Toggle enabled={notifEmail} onToggle={() => setNotifEmail(v => !v)} />
                            </SettingRow>
                            <SettingRow label="Daily Digest" sub="Morning summary of all reports" border={false}>
                              <Toggle enabled={notifDigest} onToggle={() => setNotifDigest(v => !v)} />
                            </SettingRow>
                          </div>

                          <div className="mt-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                            <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Critical incidents (Severity 1) always generate an alert regardless of your preferences.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* ── DISPLAY ── */}
                      {activeTab === 'display' && (
                        <motion.div
                          key="display"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Display Preferences</h3>

                          {/* Theme */}
                          <div className="mb-6">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Interface Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                              {(['night', 'dusk', 'light'] as const).map(t => {
                                const Icon = t === 'night' ? Moon : t === 'dusk' ? Sunset : Sun;
                                return (
                                  <button
                                    key={t}
                                    onClick={() => { if (t !== theme) onToggleTheme(t); }}
                                    className={cn(
                                      'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all relative',
                                      theme === t
                                        ? 'border-green-500/40 bg-green-500/5 text-green-400'
                                        : 'border-white/8 bg-white/[0.02] text-slate-500 hover:border-white/15'
                                    )}
                                  >
                                    <Icon size={18} />
                                    <span className="text-xs font-semibold capitalize">{t}</span>
                                    {theme === t && (
                                      <div className="absolute top-2 right-2">
                                        <Check size={12} className="text-green-400" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Default View */}
                          <div className="mb-6">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Default View on Launch</label>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { id: 'anchor', label: 'Anchor Control' },
                                { id: 'monitor',  label: 'Monitor' },
                                { id: 'respond',  label: 'Respond' },
                                { id: 'publish',  label: 'Publish' },
                              ].map(v => (
                                <button
                                  key={v.id}
                                  onClick={() => setDefaultView(v.id as typeof defaultView)}
                                  className={cn(
                                    'py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all',
                                    defaultView === v.id
                                      ? 'border-green-500/40 bg-green-500/5 text-green-400'
                                      : 'border-white/8 bg-white/[0.02] text-slate-500 hover:border-white/15 hover:text-slate-300'
                                  )}
                                >
                                  {v.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-5 divide-y divide-white/5">
                            <SettingRow label="Sidebar Expanded by Default" sub="Keep navigation open on load" border={false}>
                              <Toggle enabled={sidebarDefault === 'expanded'} onToggle={() => setSidebarDefault(v => v === 'expanded' ? 'collapsed' : 'expanded')} />
                            </SettingRow>
                            <SettingRow label="Compact Mode" sub="Reduce spacing for more data density" border={false}>
                              <Toggle enabled={compactMode} onToggle={() => setCompactMode(v => !v)} />
                            </SettingRow>
                          </div>
                        </motion.div>
                      )}

                      {/* ── SECURITY ── */}
                      {activeTab === 'security' && (
                        <motion.div
                          key="security"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                        >
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Access & Security</h3>

                          <div className="bg-white/[0.02] border border-white/5 rounded-2xl px-5 mb-6 divide-y divide-white/5">
                            <SettingRow label="Enable Session PIN" sub="Require PIN to access sensitive views" border={false}>
                              <Toggle enabled={pinEnabled} onToggle={() => setPinEnabled(v => !v)} />
                            </SettingRow>
                          </div>

                          <AnimatePresence>
                            {pinEnabled && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mb-6"
                              >
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">4-Digit PIN</label>
                                <div className="relative">
                                  <input
                                    type={showPin ? 'text' : 'password'}
                                    maxLength={4}
                                    value={pin}
                                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white tracking-widest placeholder:text-slate-600 focus:outline-none focus:border-green-500/50 transition-all pr-12"
                                  />
                                  <button
                                    onClick={() => setShowPin(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                  >
                                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="mb-6">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Session Timeout</label>
                            <div className="grid grid-cols-4 gap-2">
                              {['15m', '1h', '8h', 'never'].map(t => (
                                <button
                                  key={t}
                                  onClick={() => setSessionTimeout(t)}
                                  className={cn(
                                    'py-2.5 rounded-xl border text-xs font-semibold transition-all',
                                    sessionTimeout === t
                                      ? 'border-green-500/40 bg-green-500/5 text-green-400'
                                      : 'border-white/8 bg-white/[0.02] text-slate-500 hover:border-white/15 hover:text-slate-300'
                                  )}
                                >
                                  {t === 'never' ? 'Never' : t}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Trusted Devices</p>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center">
                                <Smartphone size={13} className="text-slate-400" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-300">This device</p>
                                <p className="text-[10px] text-slate-600">Last active: just now</p>
                              </div>
                              <button className="ml-auto text-[10px] font-bold text-rose-500 hover:text-rose-400 transition-colors">
                                Revoke
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-white/5 flex items-center justify-between flex-shrink-0 bg-white/[0.01]">
                <p className="text-[10px] text-slate-600">GuardLink Risk OS · v2.4.1</p>
                <div className="flex items-center gap-3">
                  <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className={cn(
                      'px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
                      saved
                        ? 'bg-emerald-500 text-white'
                        : 'bg-green-500 hover:bg-green-400 text-slate-900'
                    )}
                  >
                    {saved ? <><Check size={12} /> Saved</> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
