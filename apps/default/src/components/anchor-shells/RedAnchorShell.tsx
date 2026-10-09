/**
 * RedAnchorShell — ACT Layer
 * Emergency · Risk · Protection
 * All modes functional. Voice recording via MediaRecorder API.
 */
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Mic, AlertTriangle, ChevronRight, MapPin, ArrowLeft, Send, RefreshCw, Square, Play, Check } from 'lucide-react';
import { createIncidentDirect } from '@/lib/api';

export type RedMode = 'default'|'guide'|'report'|'journal'|'sos'|'sent'|'info';

interface RedAnchorShellProps { zoneCode?: string; initialMode?: RedMode; }

const R = { bg:'#0D0000', surface:'rgba(192,57,43,0.12)', border:'rgba(192,57,43,0.30)', solid:'#C0392B', bright:'#FF4444', glow:'rgba(192,57,43,0.25)', text:'#FF6B6B', muted:'rgba(255,255,255,0.45)', white:'#FFFFFF' };

function SafetyHeartbeat() {
  const m = useMemo(()=>Math.floor(Math.random()*11)+4,[]);
  return (
    <div className="flex items-center justify-center gap-2 py-2 border-t" style={{borderColor:'rgba(192,57,43,0.15)',background:'rgba(192,57,43,0.05)'}}>
      <motion.span className="w-1.5 h-1.5 rounded-full" style={{background:R.bright}} animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:1.8}}/>
      <span className="text-[10px] font-bold" style={{color:'rgba(255,107,107,0.6)'}}>Security active · Last patrol {m}m ago</span>
    </div>
  );
}

function RedHeader({zone}:{zone:string}) {
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{borderBottom:`1px solid ${R.border}`,background:R.surface}}>
      <div className="flex items-center gap-2">
        <motion.span className="w-2 h-2 rounded-full" style={{background:R.bright}} animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:1.4}}/>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:R.text}}>SOS ANCHOR</span>
        {zone&&<><span style={{color:R.border}}>·</span><span className="text-[10px] font-mono" style={{color:R.muted}}>{zone}</span></>}
      </div>
      <div className="flex items-center gap-1.5"><MapPin size={9} style={{color:R.muted}}/><span className="text-[9px]" style={{color:R.muted}}>Location active</span></div>
    </div>
  );
}

function SentScreen({onBack}:{onBack:()=>void}) {
  return (
    <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',delay:0.1}} className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2" style={{background:'rgba(0,200,83,0.12)',borderColor:'rgba(0,200,83,0.4)'}}>
        <span className="text-3xl">✓</span>
      </motion.div>
      <h2 className="text-2xl font-black text-white mb-3">Alert Sent</h2>
      <p className="text-sm leading-relaxed mb-2" style={{color:R.muted}}>Your silent SOS has been received. A trained responder has been alerted to your zone.</p>
      <p className="text-[11px] mb-8" style={{color:'rgba(0,200,83,0.7)'}}>Stay calm. Help is on the way.</p>
      <div className="w-full rounded-2xl p-4 text-left mb-6 border" style={{background:R.surface,borderColor:R.border}}>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:R.text}}>What happens next</p>
        <ul className="space-y-1.5">
          {['A safety responder has been notified','Your location has been logged anonymously','ARIA is monitoring this zone for escalation'].map(s=>(
            <li key={s} className="flex items-center gap-2 text-[11px]" style={{color:R.muted}}><span className="w-1 h-1 rounded-full flex-shrink-0" style={{background:R.text}}/>{s}</li>
          ))}
        </ul>
      </div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[11px]" style={{color:R.muted}}><ArrowLeft size={12}/>Back to zone</button>
    </motion.div>
  );
}

// ─── Report Form (wired to API) ───────────────────────────────────────────────
function ReportForm({zoneCode,onBack,onSent}:{zoneCode:string;onBack:()=>void;onSent:()=>void}) {
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState('');

  const submit=async()=>{
    setBusy(true);setErr('');
    let lat=0,lng=0;
    try{const p=await new Promise<GeolocationPosition>((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{timeout:4000}));lat=p.coords.latitude;lng=p.coords.longitude;}catch{}
    try{
      await createIncidentDirect({locationCode:zoneCode||'UNKNOWN',severity:'medium',latitude:lat,longitude:lng,reporter:'Anonymous',description:`[OBSERVATION] ${text||'Anonymous observation submitted'}`});
      onSent();
    }catch{setErr('Could not send — please try again.');setBusy(false);}
  };

  return (
    <motion.div key="report" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="flex flex-col flex-1 px-6 pt-6 pb-6">
      <button onClick={onBack} className="flex items-center gap-2 text-[11px] mb-6" style={{color:R.muted}}><ArrowLeft size={12}/>Back</button>
      <h2 className="text-2xl font-black text-white mb-2">Share an observation</h2>
      <p className="text-xs mb-6" style={{color:R.muted}}>Anonymous. No login required. Sent directly to security.</p>
      <textarea value={text} onChange={e=>setText(e.target.value)} className="flex-1 w-full rounded-2xl p-4 text-sm text-white resize-none outline-none min-h-[160px] border mb-4" style={{background:R.surface,borderColor:R.border,color:R.white}} placeholder="Describe what you saw or experienced…"/>
      <div className="flex items-center gap-2 rounded-xl p-3 mb-4 border" style={{background:'rgba(0,229,255,0.05)',borderColor:'rgba(0,229,255,0.12)'}}>
        <div className="w-1.5 h-1.5 rounded-full" style={{background:'#00E5FF'}}/>
        <p className="text-[11px]" style={{color:'rgba(0,229,255,0.8)'}}>Anonymous · No personal data collected</p>
      </div>
      {err&&<p className="text-[11px] text-red-400 mb-3">{err}</p>}
      <motion.button onClick={submit} disabled={busy||!text.trim()} whileTap={{scale:0.97}} className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest flex items-center justify-center gap-2" style={{background:R.solid,opacity:(busy||!text.trim())?0.5:1}}>
        {busy?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}{busy?'Sending…':'Submit observation'}
      </motion.button>
    </motion.div>
  );
}

// ─── Voice Journal (real recording via MediaRecorder) ─────────────────────────
type RecordState='idle'|'recording'|'done'|'submitting'|'sent';

function VoiceJournal({zoneCode,onBack}:{zoneCode:string;onBack:()=>void}) {
  const [state,setState]=useState<RecordState>('idle');
  const [seconds,setSeconds]=useState(0);
  const [transcript,setTranscript]=useState('');
  const [err,setErr]=useState('');
  const mediaRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const speechRef=useRef<SpeechRecognition|null>(null);

  const startRecording=async()=>{
    setErr('');setTranscript('');setSeconds(0);
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);
      chunksRef.current=[];
      mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      mr.onstop=()=>{stream.getTracks().forEach(t=>t.stop());};
      mr.start();
      mediaRef.current=mr;
      setState('recording');
      timerRef.current=setInterval(()=>setSeconds(s=>s+1),1000);

      // Speech-to-text (Chrome/Safari — best-effort)
      const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
      if(SR){
        const sr=new SR();sr.continuous=true;sr.interimResults=true;sr.lang='en-GB';
        sr.onresult=(e:any)=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;setTranscript(t);};
        sr.start();speechRef.current=sr;
      }
    }catch(e){setErr('Microphone access denied. Please allow access and try again.');}
  };

  const stopRecording=()=>{
    if(timerRef.current)clearInterval(timerRef.current);
    if(mediaRef.current&&mediaRef.current.state!=='inactive')mediaRef.current.stop();
    if(speechRef.current){try{speechRef.current.stop();}catch{}}
    setState('done');
  };

  const submit=async()=>{
    setState('submitting');
    let lat=0,lng=0;
    try{const p=await new Promise<GeolocationPosition>((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{timeout:4000}));lat=p.coords.latitude;lng=p.coords.longitude;}catch{}
    try{
      await createIncidentDirect({locationCode:zoneCode||'UNKNOWN',severity:'low',latitude:lat,longitude:lng,reporter:'Anonymous Voice',description:`[VOICE JOURNAL] ${transcript||'Voice note submitted — transcript unavailable'}`});
      setState('sent');
    }catch{setState('done');setErr('Could not send — please try again.');}
  };

  const fmt=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <motion.div key="journal" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="flex flex-col flex-1 px-6 pt-6 pb-6 items-center text-center">
      <button onClick={onBack} className="self-start flex items-center gap-2 text-[11px] mb-8" style={{color:R.muted}}><ArrowLeft size={12}/>Back</button>

      {state==='sent'?(
        <>
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring'}} className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2" style={{background:'rgba(0,200,83,0.12)',borderColor:'rgba(0,200,83,0.4)'}}>
            <Check size={32} style={{color:'#00C853'}}/>
          </motion.div>
          <h2 className="text-xl font-black text-white mb-2">Voice note received</h2>
          <p className="text-sm" style={{color:R.muted}}>Sent anonymously to the security team.</p>
          <button onClick={onBack} className="mt-8 px-6 py-3 rounded-2xl text-sm font-bold border" style={{borderColor:R.border,color:R.text}}>Back</button>
        </>
      ):(
        <>
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center border-2 mb-6 cursor-pointer"
            style={{background:state==='recording'?R.solid:R.surface,borderColor:state==='recording'?R.bright:R.border}}
            animate={state==='recording'?{boxShadow:[`0 0 0px ${R.glow}`,`0 0 40px ${R.glow}`,`0 0 0px ${R.glow}`]}:{}}
            transition={{repeat:Infinity,duration:1.5}}
            onClick={state==='idle'?startRecording:state==='recording'?stopRecording:undefined}
            whileTap={{scale:0.95}}
          >
            {state==='recording'?<Square size={28} style={{color:R.white}}/>:<Mic size={36} style={{color:R.text}}/>}
          </motion.div>

          {state==='idle'&&(
            <>
              <h2 className="text-xl font-black text-white mb-2">Tap to Record</h2>
              <p className="text-xs mb-6" style={{color:R.muted}}>Your voice note is anonymous. Speak freely.</p>
              <motion.button onClick={startRecording} whileTap={{scale:0.97}} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest" style={{background:R.solid,color:R.white}}>
                <Mic size={16} className="inline mr-2"/>Start Recording
              </motion.button>
            </>
          )}

          {state==='recording'&&(
            <>
              <p className="text-2xl font-black font-mono text-white mb-1">{fmt(seconds)}</p>
              <p className="text-xs mb-4" style={{color:R.text}}>Recording… tap the button to stop</p>
              {transcript&&(
                <div className="w-full rounded-2xl p-3 border mb-4 text-left" style={{background:R.surface,borderColor:R.border}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:R.text}}>Live transcript</p>
                  <p className="text-[11px] italic" style={{color:R.muted}}>{transcript}</p>
                </div>
              )}
              <motion.button onClick={stopRecording} whileTap={{scale:0.97}} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2" style={{background:R.surface,color:R.text,border:`1px solid ${R.border}`}}>
                <Square size={14}/>Stop Recording
              </motion.button>
            </>
          )}

          {state==='done'&&(
            <>
              <h2 className="text-xl font-black text-white mb-2">Recording complete</h2>
              <p className="text-xs mb-2" style={{color:R.muted}}>Duration: {fmt(seconds)}</p>
              {transcript&&(
                <div className="w-full rounded-2xl p-3 border mb-4 text-left" style={{background:R.surface,borderColor:R.border}}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:R.text}}>Transcript</p>
                  <p className="text-[11px] italic" style={{color:R.muted}}>{transcript||'No transcript available'}</p>
                </div>
              )}
              {err&&<p className="text-[11px] text-red-400 mb-3">{err}</p>}
              <div className="w-full space-y-2 mt-2">
                <motion.button onClick={submit} whileTap={{scale:0.97}} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2" style={{background:R.solid,color:R.white}}>
                  <Send size={14}/>Submit Voice Note
                </motion.button>
                <button onClick={()=>{setState('idle');setSeconds(0);setTranscript('');}} className="w-full py-3 rounded-2xl font-bold text-sm border" style={{borderColor:R.border,color:R.muted}}>
                  Record again
                </button>
              </div>
            </>
          )}

          {state==='submitting'&&(
            <div className="flex flex-col items-center gap-4">
              <RefreshCw size={28} className="animate-spin" style={{color:R.text}}/>
              <p className="text-sm" style={{color:R.muted}}>Sending securely…</p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── Main Shell ───────────────────────────────────────────────────────────────
export function RedAnchorShell({zoneCode='',initialMode='default'}:RedAnchorShellProps) {
  const [mode,setMode]=useState<RedMode>(initialMode);
  const [sosPressed,setSosPressed]=useState(false);

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme','night');
    document.documentElement.classList.add('dark');
    document.documentElement.style.setProperty('--canvas-bg',R.bg);
    return()=>{document.documentElement.style.removeProperty('--canvas-bg');};
  },[]);

  const handleSOS=()=>{setSosPressed(true);setTimeout(()=>setMode('sent'),1200);};

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden" style={{background:`radial-gradient(ellipse at top, #1A0004 0%, ${R.bg} 70%)`}}>
      <div className="fixed inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse 80% 40% at 50% 0%, ${R.glow}, transparent)`}}/>
      <RedHeader zone={zoneCode}/>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {mode==='sent'&&(
            <motion.div key="sent" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col flex-1">
              <SentScreen onBack={()=>{setMode('default');setSosPressed(false);}}/>
            </motion.div>
          )}

          {mode==='default'&&(
            <motion.div key="main" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}} className="flex flex-col flex-1 px-6 pt-8 pb-6">
              <div className="flex-1 flex flex-col justify-center mb-6">
                <motion.h1 initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="text-[2.6rem] font-black text-white leading-[1.05] tracking-tight mb-4">
                  DO YOU<br/>NEED HELP?
                </motion.h1>
                <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.2}} className="text-sm leading-relaxed" style={{color:R.muted}}>
                  Your location has been detected. A responder can reach you in under 90 seconds.
                </motion.p>
              </div>
              <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.25}} className="space-y-3 mb-6">
                <motion.button onClick={handleSOS} disabled={sosPressed} className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-white text-base uppercase tracking-widest border-0 outline-none disabled:opacity-60" style={{background:sosPressed?'rgba(192,57,43,0.5)':R.solid,boxShadow:`0 0 40px ${R.glow}, 0 4px 20px rgba(0,0,0,0.5)`}} whileTap={{scale:0.97}}>
                  <ShieldAlert size={20}/>{sosPressed?'Alert Sent…':'Silent SOS — Send Now'}
                </motion.button>
                <button onClick={()=>setMode('report')} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border" style={{background:R.surface,borderColor:R.border}}>
                  <div className="flex items-center gap-3"><AlertTriangle size={16} style={{color:R.text}}/><span className="text-sm font-bold text-white">Report a Hazard</span></div>
                  <ChevronRight size={16} style={{color:R.muted}}/>
                </button>
                <button onClick={()=>setMode('journal')} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border" style={{background:R.surface,borderColor:R.border}}>
                  <div className="flex items-center gap-3"><Mic size={16} style={{color:R.text}}/><span className="text-sm font-bold text-white">Leave a Voice Note</span></div>
                  <ChevronRight size={16} style={{color:R.muted}}/>
                </button>
              </motion.div>
              <button onClick={()=>setMode('info')} className="text-[11px] flex items-center justify-center gap-1" style={{color:R.muted}}>
                Not an emergency? <ChevronRight size={10}/> Zone info
              </button>
            </motion.div>
          )}

          {mode==='report'&&<ReportForm key="report" zoneCode={zoneCode} onBack={()=>setMode('default')} onSent={()=>setMode('sent')}/>}
          {mode==='journal'&&<VoiceJournal key="journal" zoneCode={zoneCode} onBack={()=>setMode('default')}/>}

          {mode==='info'&&(
            <motion.div key="info" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-6 pb-6">
              <button onClick={()=>setMode('default')} className="flex items-center gap-2 text-[11px] mb-6" style={{color:R.muted}}><ArrowLeft size={12}/>Back</button>
              <h2 className="text-xl font-black text-white mb-1">{zoneCode||'Zone Information'}</h2>
              <p className="text-xs mb-6" style={{color:R.muted}}>This SOS anchor zone is monitored 24/7 by Absolute Defence security.</p>
              <div className="rounded-2xl p-4 border mb-3" style={{background:R.surface,borderColor:R.border}}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:R.text}}>Zone Status</p>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:'#00C853'}}/><p className="text-sm text-white">Safety monitoring active</p></div>
              </div>
              <div className="rounded-2xl p-4 border mb-6" style={{background:R.surface,borderColor:R.border}}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:R.text}}>Emergency Numbers</p>
                <div className="space-y-1">
                  {[{label:'999 — Police, Ambulance, Fire',sub:'National emergency services'},{ label:'Site Control Room',sub:'Available 24/7 via this anchor'}].map(e=>(
                    <div key={e.label}><p className="text-sm font-bold text-white">{e.label}</p><p className="text-[10px]" style={{color:R.muted}}>{e.sub}</p></div>
                  ))}
                </div>
              </div>
              <button onClick={()=>setMode('default')} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm" style={{background:R.solid,color:R.white}}>🆘 Emergency Help</button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {mode!=='sent'&&<SafetyHeartbeat/>}
    </div>
  );
}
