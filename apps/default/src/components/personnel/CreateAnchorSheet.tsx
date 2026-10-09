import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { createLocation, type EstateLocation } from '@/lib/estate-api';
import type { StaffProfile } from '@/lib/personnel-api';
import { PrimaryButton, SecondaryButton } from './ui.tsx';

export type DevicePosition = { lat: number; lng: number; accuracy: number; capturedAt: string };
type Workspace = 'farm' | 'property' | 'hospitality';

export function CreateAnchorSheet({ open, position, profile, onClose, onCreated }: {
  open: boolean;
  position: DevicePosition;
  profile: StaffProfile | null;
  onClose: () => void;
  onCreated: (location: EstateLocation) => void;
}) {
  const [name, setName] = useState('');
  const [workspace, setWorkspace] = useState<Workspace>(profile?.workspace ?? 'property');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setWorkspace(profile?.workspace ?? 'property');
      setSaving(false);
    }
  }, [open, profile]);

  if (!open) return null;
  const canSave = name.trim().length >= 3 && !saving;
  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const location = await createLocation({
        name: name.trim(),
        what3words: '',
        lat: position.lat,
        lng: position.lng,
        area: workspace,
        assetType: 'structure',
        status: 'operational',
        source: 'device',
        accuracyMeters: position.accuracy,
        createdAt: new Date().toISOString(),
        createdBy: profile?.name ?? 'Field user',
      });
      toast.success('Anchor added to the estate map');
      onCreated(location);
    } catch {
      toast.error('Could not save this anchor. Check your signal and try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby="anchor-title">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-md rounded-t-[20px] p-5 pb-8 overscroll-contain" style={{ background: 'var(--surface-raised)' }}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 w-11 h-11 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
        <h2 id="anchor-title" className="text-xl font-semibold">Create anchor here</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--p-text-secondary)' }}>This GPS point will appear on the main operating map.</p>
        <label className="block mt-5 mb-1.5 text-sm font-medium" htmlFor="anchor-name">Anchor name</label>
        <input id="anchor-name" autoComplete="off" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. North Paddock Gate" className="w-full h-12 px-3.5 rounded-[10px]" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)' }} />
        <label className="block mt-4 mb-1.5 text-sm font-medium" htmlFor="anchor-area">Estate area</label>
        <select id="anchor-area" value={workspace} onChange={event => setWorkspace(event.target.value as Workspace)} className="w-full h-12 px-3.5 rounded-[10px]" style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)' }}>
          <option value="farm">Farm & Land</option><option value="property">Property & Grounds</option><option value="hospitality">Hospitality</option>
        </select>
        <p className="mt-3 text-xs font-mono" style={{ color: 'var(--p-text-muted)' }}>{position.lat.toFixed(6)}, {position.lng.toFixed(6)} · GPS ±{Math.round(position.accuracy)} m</p>
        <div className="mt-6 space-y-3"><PrimaryButton disabled={!canSave} loading={saving} onClick={save}>Save anchor</PrimaryButton><SecondaryButton onClick={onClose}>Cancel</SecondaryButton></div>
      </div>
    </div>
  );
}
