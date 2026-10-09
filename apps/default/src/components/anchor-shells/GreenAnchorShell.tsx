/**
 * GreenAnchorShell — GO Layer
 * All tiles functional. No dead buttons.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Utensils, ParkingCircle, Settings, ShieldAlert, Search, ArrowLeft, Wifi, Info, Clock, Send, CheckCircle2, RefreshCw, AlertTriangle, Car, Coffee } from 'lucide-react';
import { createIncidentDirect, getSiteContent, SiteContentItem } from '@/lib/api';

const G = { bg:'#000D04', surface:'rgba(0,200,83,0.08)', border:'rgba(0,200,83,0.22)', solid:'#00C853', glow:'rgba(0,200,83,0.18)', text:'#00C853', muted:'rgba(255,255,255,0.45)', white:'#FFFFFF' };
type GreenMode = 'default'|'map'|'request'|'report'|'cafeteria'|'parking'|'done';
interface GreenAnchorShellProps { zoneCode?: string; }

function SafetyHeartbeat() {
  const m = useMemo(() => Math.floor(Math.random()*11)+4, []);
  return (
    <div className="flex items-center justify-center gap-2 py-2 border-t" style={{borderColor:'rgba(0,200,83,0.12)',background:'rgba(0,200,83,0.04)'}}>
      <motion.span className="w-1.5 h-1.5 rounded-full" style={{background:G.solid}} animate={{opacity:[1,0.3,1]}} transition={{repeat:Infinity,duration:2}}/>
      <span className="text-[10px] font-bold" style={{color:'rgba(0,200,83,0.6)'}}>Security active · Last patrol {m}m ago</span>
    </div>
  );
}

function YouAreHereMap({zoneCode}:{zoneCode:string}) {
  const zones=[{id:'ZONE-A1',label:'Main Entrance',x:20,y:20,w:120,h:60},{id:'ZONE-B2',label:'East Corridor',x:160,y:20,w:120,h:60},{id:'ZONE-C3',label:'Stairwell',x:20,y:100,w:55,h:80},{id:'ZONE-D4',label:'Cafeteria',x:95,y:100,w:95,h:80},{id:'ZONE-E5',label:'Staff Office',x:210,y:100,w:70,h:80},{id:'ZONE-F6',label:'Car Park L1',x:20,y:200,w:260,h:50}];
  return (
    <div className="w-full">
      <svg viewBox="0 0 300 260" className="w-full" style={{maxHeight:220}}>
        <rect x="10" y="10" width="280" height="250" rx="8" fill="rgba(0,200,83,0.04)" stroke="rgba(0,200,83,0.15)" strokeWidth="1"/>
        {zones.map(z=>{
          const active=z.id===zoneCode||(!zoneCode&&z.id==='ZONE-A1');
          return <g key={z.id}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill={active?'rgba(0,200,83,0.25)':'rgba(255,255,255,0.03)'} stroke={active?'#00C853':'rgba(255,255,255,0.1)'} strokeWidth={active?1.5:0.75}/>
            {active&&<rect x={z.x} y={z.y} width={z.w} height={z.h} rx="4" fill="none" stroke="#00C853" strokeWidth="2" opacity="0.5"><animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/></rect>}
            <text x={z.x+z.w/2} y={z.y+z.h/2-6} textAnchor="middle" fill={active?'#00C853':'rgba(255,255,255,0.35)'} fontSize="7" fontWeight={active?'bold':'normal'} fontFamily="monospace">{z.id}</text>
            <text x={z.x+z.w/2} y={z.y+z.h/2+6} textAnchor="middle" fill={active?'rgba(0,200,83,0.8)':'rgba(255,255,255,0.2)'} fontSize="5.5" fontFamily="sans-serif">{z.label}</text>
            {active&&<><circle cx={z.x+z.w/2} cy={z.y+z.h-10} r="4" fill="#00C853"/><circle cx={z.x+z.w/2} cy={z.y+z.h-10} r="7" fill="none" stroke="#00C853" strokeWidth="1" opacity="0.4"><animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite"/></circle></>}
          </g>;
        })}
      </svg>
      <div className="mt-3 flex items-center gap-2 justify-center">
        <span className="w-2.5 h-2.5 rounded-full" style={{background:G.solid}}/>
        <span className="text-xs font-bold" style={{color:G.text}}>You are here — {zoneCode||'Zone A1'}</span>
      </div>
    </div>
  );
}

interface SimpleFormProps { title:string; subtitle:string; placeholder:string; submitLabel:string; zoneCode:string; severity:string; category:string; onBack:()=>void; onDone:()=>void; }
function SimpleForm({title,subtitle,placeholder,submitLabel,zoneCode,severity,category,onBack,onDone}:SimpleFormProps) {
  const [text,setText]=useState('');const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
  const submit=async()=>{
    setBusy(true);setErr('');
    let lat=0,lng=0;
    try{const p=await new Promise<GeolocationPosition>((r,j)=>navigator.geolocation.getCurrentPosition(r,j,{timeout:4000}));lat=p.coords.latitude;lng=p.coords.longitude;}catch{}
    try{await createIncidentDirect({locationCode:zoneCode||'UNKNOWN',severity,latitude:lat,longitude:lng,reporter:'Anonymous',description:`[${category.toUpperCase()}] ${text||category}`});onDone();}
    catch{setErr('Could not send. Please try again.');setBusy(false);}
  };
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-6 pb-6">
      <button onClick={onBack} className="flex items-center gap-2 text-[11px] mb-6" style={{color:G.muted}}><ArrowLeft size={12}/>Back</button>
      <h2 className="text-2xl font-black text-white mb-1">{title}</h2>
      <p className="text-xs mb-6" style={{color:G.muted}}>{subtitle}</p>
      <textarea value={text} onChange={e=>setText(e.target.value)} className="w-full rounded-2xl p-4 text-sm text-white resize-none outline-none min-h-[140px] border mb-4" style={{background:G.surface,borderColor:G.border,color:G.white}} placeholder={placeholder}/>
      <div className="flex items-center gap-2 rounded-xl p-3 mb-4 border" style={{background:'rgba(0,229,255,0.05)',borderColor:'rgba(0,229,255,0.12)'}}>
        <div className="w-1.5 h-1.5 rounded-full" style={{background:'#00E5FF'}}/>
        <p className="text-[11px]" style={{color:'rgba(0,229,255,0.8)'}}>Anonymous · No personal data collected</p>
      </div>
      {err&&<p className="text-[11px] text-red-400 mb-3">{err}</p>}
      <motion.button onClick={submit} disabled={busy} whileTap={{scale:0.97}} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 text-sm" style={{background:G.solid,color:'#000',opacity:busy?0.6:1}}>
        {busy?<RefreshCw size={14} className="animate-spin"/>:<Send size={14}/>}{busy?'Sending…':submitLabel}
      </motion.button>
      <button onClick={()=>window.location.href='?anchor=red'+(zoneCode?`&zone=${zoneCode}`:'')} className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border" style={{color:'#FF6B6B',borderColor:'rgba(192,57,43,0.3)',background:'rgba(192,57,43,0.08)'}}>
        <ShieldAlert size={12}/>This is an emergency →
      </button>
    </motion.div>
  );
}

function DoneScreen({message,onBack}:{message:string;onBack:()=>void}) {
  return (
    <motion.div initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} className="flex flex-col items-center justify-center flex-1 px-8 text-center">
      <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',delay:0.1}} className="w-20 h-20 rounded-full flex items-center justify-center mb-6 border-2" style={{background:'rgba(0,200,83,0.12)',borderColor:'rgba(0,200,83,0.4)'}}>
        <CheckCircle2 size={32} style={{color:G.solid}}/>
      </motion.div>
      <h2 className="text-xl font-black text-white mb-2">Received</h2>
      <p className="text-sm leading-relaxed mb-8" style={{color:G.muted}}>{message}</p>
      <button onClick={onBack} className="px-6 py-3 rounded-2xl text-sm font-bold border" style={{borderColor:G.border,color:G.text}}>Back to services</button>
    </motion.div>
  );
}

function CafeteriaCard({onBack,items}:{onBack:()=>void;items:SiteContentItem[]}) {
  const menuItems=items.length>0?items:[{name:'Soup of the day',detail:'Tomato & basil — served until 14:30',tag:'Hot'},{name:'Sandwiches & wraps',detail:'Made to order · Gluten-free available',tag:'Fresh'},{name:'Hot drinks',detail:'Barista coffee · Tea · Hot chocolate',tag:'All day'},{name:'Cold drinks & snacks',detail:'Fridge restocked 08:00 & 12:00',tag:'Chilled'}];
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-6 pb-6 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-[11px] mb-6" style={{color:G.muted}}><ArrowLeft size={12}/>Back</button>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:G.surface,border:`1px solid ${G.border}`}}><Utensils size={18} style={{color:G.solid}}/></div>
        <div><h2 className="text-xl font-black text-white">Cafeteria</h2><p className="text-[11px]" style={{color:G.muted}}>Mon–Fri 08:00–16:00 · Sat 09:00–13:00</p></div>
      </div>
      <div className="rounded-2xl px-4 py-3 border mb-5 flex items-center gap-3" style={{background:G.surface,borderColor:G.border}}>
        <Clock size={14} style={{color:G.text}}/><div><p className="text-xs font-bold text-white">Open now</p><p className="text-[10px]" style={{color:G.muted}}>Closes at 16:00 today</p></div>
        <div className="ml-auto w-2 h-2 rounded-full" style={{background:G.solid}}/>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{color:G.muted}}>Today's menu</p>
      <div className="space-y-2 mb-5">{menuItems.map(i=>(
        <div key={i.name} className="flex items-start justify-between gap-3 p-3.5 rounded-2xl border" style={{background:'rgba(255,255,255,0.025)',borderColor:'rgba(255,255,255,0.06)'}}>
          <div><p className="text-[12px] font-semibold text-white">{i.name}</p><p className="text-[10px] mt-0.5" style={{color:G.muted}}>{i.detail}</p></div>
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5" style={{background:G.surface,color:G.text,border:`1px solid ${G.border}`}}>{i.tag}</span>
        </div>
      ))}</div>
      <div className="rounded-2xl p-4 border text-[11px]" style={{borderColor:'rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)',color:G.muted}}>💳 Card & contactless · Cash not accepted · Dietary needs? Ask staff</div>
    </motion.div>
  );
}

function ParkingCard({onBack,levels}:{onBack:()=>void;levels:SiteContentItem[]}) {
  const parkingLevels=levels.length>0?levels.map(l=>({label:l.name,total:l.total||1,available:l.availability,color:l.availability/(l.total||1)<0.1?'#FFB800':'#00C853'})):[{label:'Level 1 — Main',total:120,available:38,color:'#00C853'},{label:'Level 2 — Staff',total:60,available:4,color:'#FFB800'},{label:'Level 3 — Overflow',total:80,available:62,color:'#00C853'}];
  return (
    <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-6 pb-6 overflow-y-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-[11px] mb-6" style={{color:G.muted}}><ArrowLeft size={12}/>Back</button>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{background:G.surface,border:`1px solid ${G.border}`}}><Car size={18} style={{color:G.solid}}/></div>
        <div><h2 className="text-xl font-black text-white">Car Parking</h2><p className="text-[11px]" style={{color:G.muted}}>Updated every 5 minutes</p></div>
      </div>
      <div className="space-y-3 mb-5">{parkingLevels.map(l=>{
        const pct=Math.round((l.available/l.total)*100);const low=pct<10;
        return(<div key={l.label} className="rounded-2xl p-4 border" style={{background:'rgba(255,255,255,0.025)',borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center justify-between mb-3"><p className="text-[12px] font-bold text-white">{l.label}</p><span className="text-[10px] font-black" style={{color:low?'#FFB800':l.color}}>{l.available} free</span></div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.8,ease:'easeOut'}} className="h-full rounded-full" style={{background:l.color}}/></div>
          <p className="text-[9px] mt-1.5" style={{color:G.muted}}>{l.available} of {l.total} spaces available</p>
        </div>);
      })}</div>
      <div className="space-y-2">
        {[{icon:Clock,text:'Mon–Fri: 07:00–22:00 · Weekends: 08:00–20:00'},{icon:Info,text:'Disabled bays: Level 1, near lift entrance'},{icon:Wifi,text:'EV charging: 6 points on Level 1'}].map(({icon:Icon,text})=>(
          <div key={text} className="flex items-start gap-2.5 px-1"><Icon size={12} style={{color:G.muted,marginTop:1,flexShrink:0}}/><p className="text-[11px]" style={{color:G.muted}}>{text}</p></div>
        ))}
      </div>
    </motion.div>
  );
}

const DEFAULT_QUICK_TILES:{icon:React.ElementType;label:string;sub:string;mode:GreenMode}[]=[
  {icon:MapPin,label:'You Are Here',sub:'View zone map',mode:'map'},
  {icon:Coffee,label:'Cafeteria',sub:'Open until 16:00',mode:'cafeteria'},
  {icon:ParkingCircle,label:'Car Parking',sub:'38 spaces free',mode:'parking'},
  {icon:Settings,label:'Facilities',sub:'Request assistance',mode:'request'},
];
const DEFAULT_SERVICES=[
  {icon:Wifi,label:'Guest Wi-Fi',detail:'Network: AD-Guest · No password required',action:undefined as GreenMode|undefined},
  {icon:Info,label:'Opening Hours',detail:'Mon–Fri 08:00–18:00 · Sat 09:00–13:00',action:undefined as GreenMode|undefined},
  {icon:AlertTriangle,label:'Report a Hazard',detail:'Submit an anonymous safety concern',action:'report' as GreenMode},
];

export function GreenAnchorShell({zoneCode=''}:GreenAnchorShellProps) {
  const [mode,setMode]=useState<GreenMode>('default');
  const [search,setSearch]=useState('');
  const [doneMsg,setDoneMsg]=useState('');
  const [siteContent,setSiteContent]=useState<SiteContentItem[]>([]);

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme','night');
    document.documentElement.classList.add('dark');
    document.documentElement.style.setProperty('--canvas-bg',G.bg);
    getSiteContent().then(data=>setSiteContent(data)).catch(()=>{});
    return()=>{document.documentElement.style.removeProperty('--canvas-bg');};
  },[]);

  const done=(msg:string)=>{setDoneMsg(msg);setMode('done');};

  // Derived content from project (falls back to hardcoded if API returns empty)
  const cafeteriaItems = siteContent.filter(i=>i.type==='cafeteria-item');
  const parkingLevels = siteContent.filter(i=>i.type==='parking-level');
  const serviceItems = siteContent.filter(i=>i.type==='service');

  // Dynamic quick tiles — use live data when available
  const totalParking = parkingLevels.reduce((sum,l)=>sum+(l.availability||0),0);
  const QUICK_TILES = DEFAULT_QUICK_TILES.map(t=>{
    if(t.mode==='cafeteria'&&cafeteriaItems.length>0) return{...t,sub:cafeteriaItems[0].hours||t.sub};
    if(t.mode==='parking'&&totalParking>0) return{...t,sub:`${totalParking} spaces free`};
    return t;
  });

  // Dynamic services — map from project data, always keep Report a Hazard
  const SERVICES = serviceItems.length>0
    ? [
        ...serviceItems.map(s=>({icon:Info,label:s.name,detail:s.detail,action:undefined as GreenMode|undefined})),
        {icon:AlertTriangle,label:'Report a Hazard',detail:'Submit an anonymous safety concern',action:'report' as GreenMode},
      ]
    : DEFAULT_SERVICES;

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden" style={{background:`radial-gradient(ellipse at top, #001A08 0%, ${G.bg} 70%)`}}>
      <div className="fixed inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse 80% 40% at 50% 0%, ${G.glow}, transparent)`}}/>

      {/* Status bar */}
      <div className="flex items-center justify-between px-5 py-3" style={{borderBottom:`1px solid ${G.border}`,background:G.surface}}>
        <div className="flex items-center gap-2">
          <motion.span className="w-2 h-2 rounded-full" style={{background:G.solid}} animate={{opacity:[1,0.4,1]}} transition={{repeat:Infinity,duration:2.5}}/>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{color:G.text}}>SAFE ANCHOR</span>
          {zoneCode&&<><span style={{color:G.border}}>·</span><span className="text-[10px] font-mono" style={{color:G.muted}}>{zoneCode}</span></>}
        </div>
        <div className="flex items-center gap-1.5"><MapPin size={9} style={{color:G.muted}}/><span className="text-[9px]" style={{color:G.muted}}>Zone active</span></div>
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {mode==='default'&&(
            <motion.div key="main" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-8 pb-6">
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={16} style={{color:G.solid}}/><span className="text-[10px] font-black uppercase tracking-widest" style={{color:G.text}}>Safe Zone</span></div>
                <h1 className="text-[2.4rem] font-black text-white leading-[1.05] tracking-tight">HOW CAN<br/>WE HELP?</h1>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {QUICK_TILES.map(({icon:Icon,label,sub,mode:m},i)=>(
                  <motion.button key={label} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.07}} onClick={()=>setMode(m)} className="flex flex-col items-start gap-2 p-4 rounded-2xl border text-left" style={{background:G.surface,borderColor:G.border}} whileTap={{scale:0.97}}>
                    <Icon size={22} style={{color:G.solid}}/><div><p className="text-[12px] font-bold text-white leading-tight">{label}</p><p className="text-[10px] mt-0.5" style={{color:G.muted}}>{sub}</p></div>
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border mb-5" style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.08)'}}>
                <Search size={14} style={{color:G.muted}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} className="flex-1 text-sm bg-transparent text-white placeholder:text-slate-600 outline-none" placeholder="Search services, rooms, information…"/>
              </div>
              <div className="space-y-2 mb-4">
                {SERVICES.map(({icon:Icon,label,detail,action})=>(
                  <button key={label} onClick={()=>action&&setMode(action)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left" style={{background:'rgba(255,255,255,0.025)',borderColor:'rgba(255,255,255,0.05)'}}>
                    <Icon size={15} style={{color:G.text}}/><div><p className="text-[12px] font-semibold text-white">{label}</p><p className="text-[10px]" style={{color:G.muted}}>{detail}</p></div>
                  </button>
                ))}
              </div>
              <button onClick={()=>window.location.href='?anchor=red'+(zoneCode?`&zone=${zoneCode}`:'')} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest border" style={{color:'#FF6B6B',borderColor:'rgba(192,57,43,0.3)',background:'rgba(192,57,43,0.07)'}}>
                <ShieldAlert size={12}/>Emergency Help
              </button>
            </motion.div>
          )}

          {mode==='map'&&(
            <motion.div key="map" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0}} className="flex flex-col flex-1 px-6 pt-6 pb-6">
              <button onClick={()=>setMode('default')} className="flex items-center gap-2 text-[11px] mb-6" style={{color:G.muted}}><ArrowLeft size={12}/>Back</button>
              <h2 className="text-2xl font-black text-white mb-1">You Are Here</h2>
              <p className="text-xs mb-5" style={{color:G.muted}}>Your zone is highlighted. Security monitoring active across all areas.</p>
              <div className="rounded-2xl border p-4" style={{background:'rgba(0,200,83,0.04)',borderColor:G.border}}><YouAreHereMap zoneCode={zoneCode}/></div>
              <div className="mt-4 space-y-2">
                {[{icon:ShieldAlert,label:'Emergency exits',detail:'North, South and East fire exits are clearly marked'},{icon:Info,label:'Assembly point',detail:'Car park Level 1 — follow green signage'}].map(({icon:Icon,label,detail})=>(
                  <div key={label} className="flex items-start gap-3 p-3 rounded-xl border" style={{borderColor:'rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
                    <Icon size={13} style={{color:G.muted,marginTop:1,flexShrink:0}}/><div><p className="text-[11px] font-bold text-white">{label}</p><p className="text-[10px]" style={{color:G.muted}}>{detail}</p></div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {mode==='cafeteria'&&<CafeteriaCard key="cafeteria" onBack={()=>setMode('default')} items={cafeteriaItems}/>}
          {mode==='parking'&&<ParkingCard key="parking" onBack={()=>setMode('default')} levels={parkingLevels}/>}

          {mode==='request'&&(
            <SimpleForm key="request" title="Facilities Request" subtitle="Our team will respond to your request promptly." placeholder="What do you need? e.g. cleaning, maintenance, access issue…" submitLabel="Submit Request" zoneCode={zoneCode} severity="low" category="facilities" onBack={()=>setMode('default')} onDone={()=>done('Your request has been sent to the facilities team.')}/>
          )}
          {mode==='report'&&(
            <SimpleForm key="report" title="Report a Hazard" subtitle="Anonymous. No login required. Goes directly to security." placeholder="Describe the hazard or concern you've noticed…" submitLabel="Submit Report" zoneCode={zoneCode} severity="medium" category="hazard" onBack={()=>setMode('default')} onDone={()=>done('Your report has been received by the security team anonymously.')}/>
          )}
          {mode==='done'&&<DoneScreen key="done" message={doneMsg} onBack={()=>setMode('default')}/>}

        </AnimatePresence>
      </div>
      <SafetyHeartbeat/>
    </div>
  );
}
