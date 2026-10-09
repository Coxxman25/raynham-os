import React, { useState } from 'react';
import { Library, Upload, FileText, Wand2, ToggleLeft, ToggleRight, Trash2, BookOpen, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface KnowledgeDoc {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  activeForAria: boolean;
  category: 'policy' | 'procedure' | 'training' | 'legal';
}

// Knowledge base for SafeGuard Absolute Defence OS
const SEED_DOCS: KnowledgeDoc[] = [
  {
    id: 'doc-001',
    name: 'Absolute Defence OS — Safety & Incident Response Policy 2025-26.pdf',
    size: '2.4 MB',
    uploadedAt: '2026-01-08',
    activeForAria: true,
    category: 'policy',
  },
  {
    id: 'doc-002',
    name: 'UK Conflict Management & Use of Force — Legal Framework 2024.pdf',
    size: '3.1 MB',
    uploadedAt: '2026-01-08',
    activeForAria: true,
    category: 'legal',
  },
  {
    id: 'doc-003',
    name: 'Lone Worker Protection — Procedures & Escalation Protocol.pdf',
    size: '1.2 MB',
    uploadedAt: '2026-02-01',
    activeForAria: true,
    category: 'procedure',
  },
  {
    id: 'doc-004',
    name: 'Safety Lead — Role, Responsibilities & Escalation Guide.pdf',
    size: '0.9 MB',
    uploadedAt: '2026-01-15',
    activeForAria: true,
    category: 'procedure',
  },
  {
    id: 'doc-005',
    name: 'Cyber Threat & Online Harassment Response Policy.pdf',
    size: '1.1 MB',
    uploadedAt: '2026-02-10',
    activeForAria: true,
    category: 'policy',
  },
  {
    id: 'doc-006',
    name: 'Health & Safety at Work Act 1974 — Employer Duty of Care.pdf',
    size: '4.2 MB',
    uploadedAt: '2025-12-20',
    activeForAria: false,
    category: 'legal',
  },
  {
    id: 'doc-007',
    name: 'Safety Lead Training Record & CPD Log 2025-26.pdf',
    size: '0.6 MB',
    uploadedAt: '2026-01-20',
    activeForAria: false,
    category: 'training',
  },
];

const CATEGORY_COLORS: Record<KnowledgeDoc['category'], string> = {
  policy: 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
  procedure: 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
  training: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
  legal: 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30',
};

interface KnowledgeVaultProps {
  search?: string;
  onOpenAria: (context: string) => void;
}

export function KnowledgeVault({ search = '', onOpenAria }: KnowledgeVaultProps) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(SEED_DOCS);
  const [dragOver, setDragOver] = useState(false);

  const activeCount = docs.filter(d => d.activeForAria).length;
  const filteredDocs = search.trim()
    ? docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))
    : docs;

  const toggleActive = (id: string) => {
    setDocs(prev => prev.map(d =>
      d.id === id ? { ...d, activeForAria: !d.activeForAria } : d
    ));
    const doc = docs.find(d => d.id === id);
    if (doc) {
      if (doc.activeForAria) {
        toast.info(`${doc.name} deactivated — ARIA will no longer reference this document`);
      } else {
        toast.success(`${doc.name} activated — ARIA is now trained on this document`);
      }
    }
  };

  const handleDelete = (id: string) => {
    const doc = docs.find(d => d.id === id);
    setDocs(prev => prev.filter(d => d.id !== id));
    if (doc) toast.success(`${doc.name} removed from Knowledge Vault`);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const newDoc: KnowledgeDoc = {
          id: `doc-${Date.now()}`,
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          uploadedAt: new Date().toISOString().slice(0, 10),
          activeForAria: false,
          category: 'policy',
        };
        setDocs(prev => [newDoc, ...prev]);
        toast.success(`${file.name} added to Knowledge Vault — toggle Active for ARIA to train`);
      } else {
        toast.error('Only PDF files are supported');
      }
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const newDoc: KnowledgeDoc = {
        id: `doc-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString().slice(0, 10),
        activeForAria: false,
        category: 'policy',
      };
      setDocs(prev => [newDoc, ...prev]);
      toast.success(`${file.name} uploaded`);
    });
    e.target.value = '';
  };

  return (
    <div className="h-full w-full bg-[#F4F7F9] dark:bg-transparent overflow-auto z-10 animate-in fade-in duration-500 ease-surgical">
      <div className="p-8 pt-10 max-w-[1200px] mx-auto w-full">

        {/* Top action row */}
        <div className="flex items-center justify-end gap-3 mb-8">
          <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-[#1A1C23] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
            <Wand2 size={13} className="text-[#00E5FF]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              <span className="text-slate-900 dark:text-white">{activeCount}</span> Active
            </span>
          </div>
          <button
            onClick={() => onOpenAria('You are the AI safety intelligence assistant for Absolute Defence OS. You have access to the Knowledge Vault which contains the organisation\'s safety policies, legal frameworks, and operational protocols. Please summarise the key safety and incident response duties for the Safety Lead team and highlight any areas where current documentation may need updating or strengthening.')}
            className="flex items-center gap-2 px-5 py-2 bg-[#00E5FF] text-[#12141A] text-xs font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] uppercase tracking-widest"
          >
            <Wand2 size={14} /> Ask ARIA
          </button>
        </div>

        {/* ARIA status banner */}
        <div className={cn(
          'flex items-center gap-5 p-6 rounded-[2rem] border mb-8 transition-all',
          activeCount >= 2 ? 'bg-[#00E5FF]/5 border-[#00E5FF]/20' : 'bg-amber-500/5 border-amber-500/20'
        )}>
          <div className={cn(
            'w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border shadow-inner',
            activeCount >= 2 ? 'bg-[#00E5FF]/20 border-[#00E5FF]/30 text-[#00E5FF]' : 'bg-amber-500/20 border-amber-500/30 text-amber-500'
          )}>
            {activeCount >= 2 ? (
              <Shield size={20} />
            ) : (
              <AlertTriangle size={20} />
            )}
          </div>
          <div>
            <p className={cn(
              'text-sm font-bold tracking-tight',
              activeCount >= 2 ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'
            )}>
              {activeCount >= 2
                ? `ARIA is fully trained — ${activeCount} policy documents active`
                : activeCount === 0
                  ? 'ARIA has no knowledge base — activate at least one document'
                  : `ARIA partially trained — activate more documents for better responses`
              }
            </p>
            <p className={cn(
              'text-xs mt-1 font-medium',
              activeCount >= 2 ? 'text-slate-500 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'
            )}>
              {activeCount >= 2
                ? 'When a risk cluster is detected, ARIA will cite the relevant section of your uploaded policies.'
                : 'Upload safety policies and legal frameworks, then toggle "Active for ARIA" to enable intelligent, policy-aware incident responses.'
              }
            </p>
          </div>
        </div>

        {/* Upload dropzone */}
        <label
          className={cn(
            'flex flex-col items-center justify-center w-full py-16 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all duration-300 mb-8',
            dragOver
              ? 'border-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_30px_rgba(0,200,83,0.1)]'
              : 'border-slate-300 dark:border-white/10 bg-white/50 dark:bg-[#1A1C23]/30 backdrop-blur-md hover:border-[#00E5FF]/50 dark:hover:border-[#00E5FF]/50'
          )}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
        >
          <input type="file" accept=".pdf" multiple onChange={handleFileInput} className="hidden" />
          <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-[#12141A] shadow-inner flex items-center justify-center mb-6">
            <Upload size={32} className="text-slate-400" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Upload Safety Policies & Legal Guidance
          </p>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Drag &amp; drop PDF or DOCX files to train the intelligence agent. <span className="text-[#00E5FF] ml-1 underline underline-offset-4 decoration-[#00E5FF]/30 hover:decoration-[#00E5FF] transition-colors">Browse files</span>
          </p>
        </label>

        {/* Documents list */}
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-5 bg-white dark:bg-[#1A1C23]/50 backdrop-blur-xl border rounded-[1.5rem] p-5 transition-all duration-300 group',
                doc.activeForAria ? 'border-slate-300 dark:border-white/10 shadow-lg' : 'border-slate-200 dark:border-white/5'
              )}
            >
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all',
                doc.activeForAria ? 'bg-[#00E5FF] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.3)]' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10'
              )}>
                {doc.activeForAria
                  ? <BookOpen size={20} className="text-[#12141A]" />
                  : <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.name}</p>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-[9px] font-bold border capitalize shrink-0 uppercase tracking-widest',
                    CATEGORY_COLORS[doc.category]
                  )}>
                    {doc.category}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{doc.size} · Uploaded {doc.uploadedAt}</p>
              </div>

              {/* ARIA toggle */}
              <div className="flex items-center gap-4 shrink-0">
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-widest hidden sm:block transition-colors",
                  doc.activeForAria ? "text-[#00E5FF]" : "text-slate-400 dark:text-slate-500"
                )}>
                  {doc.activeForAria ? "ARIA Active" : "Inactive"}
                </span>
                <button
                  onClick={() => toggleActive(doc.id)}
                  className={cn(
                    "w-11 h-6 rounded-full relative cursor-pointer shadow-inner transition-colors duration-300 focus:outline-none",
                    doc.activeForAria ? "bg-[#00E5FF]" : "bg-slate-200 dark:bg-[#12141A] border border-slate-300 dark:border-white/10"
                  )}
                  title={doc.activeForAria ? 'Deactivate for ARIA' : 'Activate for ARIA'}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300",
                    doc.activeForAria ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              {/* Delete */}
              <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-2" />
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                title="Remove from vault"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {docs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <Library className="mb-4 opacity-20" size={48} />
              <p className="text-sm font-bold uppercase tracking-[0.2em]">No documents yet. Upload your first safety policy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
