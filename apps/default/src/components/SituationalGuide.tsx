import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ChevronLeft,
  Zap,
  Siren,
  Sword,
  MessageSquareWarning,
  CrosshairIcon,
  HeartPulse,
  UserX,
  ShoppingBag,
  BadgeAlert,
  Flame,
  MessageCircle,
  Scale,
  FileWarning,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AriaGuideDrawer } from './AriaGuideDrawer';

// ─── Types ───────────────────────────────────────────────────────────────────

type Urgency = 'critical' | 'high' | 'medium';

interface Situation {
  id: string;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  urgency: Urgency;
  /** Tailwind colour tokens — border, glow, icon, badge */
  palette: {
    border: string;
    glow: string;
    icon: string;
    badge: string;
    badgeText: string;
    cardBg: string;
  };
}

// ─── Response Content Types ──────────────────────────────────────────────────

interface ResponseContent {
  immediate: string[];          // Numbered action steps
  deEscalate: {
    phrases: string[];          // Exact scripted phrases (quoted)
    tips: string[];             // Coaching notes
  };
  legal: {
    statutes: { name: string; detail: string }[];
    reasonableForce: string;
    doNot: string[];
  };
}

// ─── Response Content Data ───────────────────────────────────────────────────

const RESPONSE_CONTENT: Record<string, ResponseContent> = {
  'physical-threat': {
    immediate: [
      'Stay calm — do not match their aggression or make sudden movements.',
      'Create distance. Move to a position with at least 2 metres between you.',
      'Alert a colleague or supervisor immediately — do not face this alone.',
      'Call 999 if you believe violence is imminent or you cannot safely retreat.',
      'Do not block exits — keep your escape route open at all times.',
      'Note the person\'s description: clothing, height, direction of travel.',
      'Do not attempt physical restraint unless trained and it is absolutely necessary.',
    ],
    deEscalate: {
      phrases: [
        '"I can see you\'re upset — I want to help you."',
        '"Let\'s take a moment. No one needs to get hurt here."',
        '"Tell me what you need and I\'ll do my best to sort it."',
        '"I\'m not here to argue — I\'m here to resolve this with you."',
        '"Can we step somewhere quieter to talk this through?"',
      ],
      tips: [
        'Keep your voice low and steady — raised voices escalate tension.',
        'Use open body language: uncrossed arms, palms visible.',
        'Avoid direct staring — treat it as a challenge in tense situations.',
        'Never laugh, smirk or dismiss their grievance, however unreasonable.',
        'If you feel unsafe, signal a colleague or trigger your lone worker device.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Criminal Justice Act 1988 s.39', detail: 'Common assault — intentional or reckless threatening behaviour is an arrestable offence.' },
        { name: 'Public Order Act 1986 s.4', detail: 'Using threatening, abusive or insulting words likely to cause another person to fear immediate violence.' },
        { name: 'Protection from Harassment Act 1997', detail: 'A course of threatening conduct that causes alarm or distress may constitute harassment.' },
      ],
      reasonableForce: 'You may use reasonable, proportionate force to defend yourself if violence becomes imminent. "Reasonable" means no more than is necessary to protect yourself or others. Do not pre-empt or pursue.',
      doNot: [
        'Do not make physical contact unless you are being attacked.',
        'Do not issue threats of your own — this can escalate and may itself be unlawful.',
        'Do not detain the person unless a citizen\'s arrest is legally justified.',
        'Do not follow them if they leave — let them go and brief police.',
      ],
    },
  },

  'assault-fight': {
    immediate: [
      'Call 999 immediately — this is an emergency.',
      'Clear bystanders from the area. Shout clearly: "Everyone move back — call for help."',
      'Do NOT physically intervene unless someone\'s life is in immediate danger and you are trained.',
      'Identify and secure any weapons within reach if it is safe to do so.',
      'Stay on the line with 999 and narrate what you are seeing.',
      'Preserve the scene once the incident ends — do not move anything.',
      'Identify witnesses and ask them to remain nearby for police.',
    ],
    deEscalate: {
      phrases: [
        '"Stop! Everyone stop — the police are on their way."',
        '"You need to walk away right now. This is not worth it."',
        '"I\'m not taking sides — I need everyone to calm down."',
        '"Someone is going to get seriously hurt. Please stop."',
      ],
      tips: [
        'Only attempt verbal de-escalation from a safe distance.',
        'Use a loud, authoritative voice — not angry, but commanding.',
        'Direct one person at a time — crowds respond to individual address.',
        'Do not position yourself between fighters — you will be struck.',
        'Your safety is the priority. Withdraw if you cannot de-escalate safely.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Offences Against the Person Act 1861 s.47', detail: 'Assault occasioning actual bodily harm (ABH) — carries up to 5 years imprisonment.' },
        { name: 'OAPA 1861 s.20 / s.18', detail: 'Grievous bodily harm (GBH) — serious injury; up to life imprisonment for s.18.' },
        { name: 'Criminal Law Act 1967 s.3', detail: 'Any person may use such force as is reasonable in the prevention of crime.' },
      ],
      reasonableForce: 'You may intervene physically only if someone\'s life is in immediate peril and you cannot otherwise prevent serious injury. Any force must stop the moment the threat ends. Continuing after the person is subdued may itself be assault.',
      doNot: [
        'Do not join in or take sides in any way.',
        'Do not use restraint holds unless you are trained and certified.',
        'Do not move injured persons — they may have spinal injuries.',
        'Do not post video to social media — preserve evidence for police.',
      ],
    },
  },

  'verbal-abuse': {
    immediate: [
      'Stay composed — do not respond with aggression or personal remarks.',
      'Signal to a colleague to witness the exchange.',
      'If in a public setting, ask the person to lower their voice calmly.',
      'Begin a mental log: exact words used, time, witnesses present.',
      'If the abuse is targeted (racist, sexist, homophobic) treat as a hate incident.',
      'Offer a change of environment: "Let\'s step to a quieter space."',
      'If it continues and you feel unsafe, withdraw and contact your manager or police.',
    ],
    deEscalate: {
      phrases: [
        '"I hear that you\'re frustrated. I want to resolve this."',
        '"I\'d appreciate it if we could keep this respectful."',
        '"Insulting me won\'t solve the problem — let me help you."',
        '"I understand you\'re angry. Can you tell me what went wrong?"',
        '"I need you to speak to me calmly or I\'ll need to end this conversation."',
      ],
      tips: [
        'Set clear, calm limits: say what you will and won\'t accept.',
        'Do not apologise simply to pacify — it can reinforce the behaviour.',
        'Acknowledge the emotion without endorsing the conduct.',
        'Give them an "exit ramp" — a way to back down without losing face.',
        'Document contemporaneously: time, exact words, witnesses.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Public Order Act 1986 s.5', detail: 'Using threatening, abusive or insulting words or behaviour within earshot of someone likely to be caused harassment, alarm or distress.' },
        { name: 'Equality Act 2010', detail: 'Harassment related to a protected characteristic (race, sex, disability etc.) is unlawful and a civil claim may follow.' },
        { name: 'Protection from Harassment Act 1997 s.1', detail: 'Repeated abusive conduct amounting to a course of behaviour causing distress.' },
      ],
      reasonableForce: 'Verbal abuse alone does not justify physical force. If threats are made that you reasonably believe will be immediately carried out, you may take proportionate steps to protect yourself.',
      doNot: [
        'Do not retaliate verbally with insults — it escalates and may itself breach s.5 POA.',
        'Do not dismiss or minimise hate-based language — record and report it.',
        'Do not conduct a formal disciplinary process without HR involvement.',
        'Do not make physical contact to remove the person — call security or police.',
      ],
    },
  },

  'weapon-sighted': {
    immediate: [
      'Do NOT approach the person. Move away immediately.',
      'Call 999 — state "weapon sighted" and give the exact location.',
      'Alert others quietly to evacuate the area. Avoid causing panic.',
      'Lock down the area if your venue has a lockdown protocol — activate it now.',
      'Do not attempt to disarm the person under any circumstances.',
      'Observe and remember: description, direction of travel, weapon type.',
      'Stay behind cover, low and out of sight, until police arrive.',
    ],
    deEscalate: {
      phrases: [
        '"Nobody wants anyone to get hurt here. Please put it down."',
        '"The police are coming. Putting it down now is the best thing you can do."',
        '"I\'m not a threat to you. Let\'s both stay calm."',
        '"Tell me what you need — I\'m listening."',
      ],
      tips: [
        'Only attempt verbal contact if you are at a safe distance and behind cover.',
        'Keep your hands visible and open — signal you are not a threat.',
        'Speak slowly and clearly. Short sentences.',
        'Do not issue ultimatums — give the person a way to comply.',
        'Your priority is to evacuate others — do not attempt to be a hero.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Prevention of Crime Act 1953', detail: 'Carrying an offensive weapon in a public place is a criminal offence regardless of intent.' },
        { name: 'Criminal Justice Act 1988 s.139', detail: 'Possession of a bladed article in a public place — strict liability offence.' },
        { name: 'Firearms Act 1968', detail: 'Possession of a firearm without a certificate is an arrestable offence with up to 10 years imprisonment.' },
      ],
      reasonableForce: 'Facing an armed person, any force you use in self-defence must be judged in the heat of the moment. Courts apply the "householder" standard: you are not expected to weigh your response precisely when in fear of serious injury. Retreat first if you can.',
      doNot: [
        'Do not attempt to grab or disarm the weapon — fatalities occur this way.',
        'Do not corner the person — they will feel they have no choice.',
        'Do not put yourself between the person and others unnecessarily.',
        'Do not give chase if they flee — let police pursue.',
      ],
    },
  },

  'medical-emergency': {
    immediate: [
      'Call 999 immediately. State the nature of the emergency and exact location.',
      'Do not move the person unless they are in immediate danger (e.g. fire).',
      'Check for responsiveness: tap shoulders, shout "Are you OK?"',
      'If unconscious and not breathing normally — begin CPR if trained.',
      'Place in recovery position if breathing but unconscious (unless spinal injury suspected).',
      'Control severe bleeding: apply firm, continuous pressure with a clean cloth.',
      'Stay on the line with 999 and follow the dispatcher\'s instructions precisely.',
      'Send someone to meet the ambulance at the entrance.',
    ],
    deEscalate: {
      phrases: [
        '"Help is on the way — you\'re not alone."',
        '"Stay with me. Focus on my voice."',
        '"You\'re doing well. Keep breathing slowly."',
        '"I\'m staying right here with you until the paramedics arrive."',
        '"Don\'t try to get up — just stay still and calm."',
      ],
      tips: [
        'A calm, reassuring voice reduces shock and panic.',
        'Keep bystanders back to allow the person to breathe.',
        'Keep the person warm — shock causes rapid heat loss.',
        'Note any medications or medical ID they are wearing.',
        'Be honest but calm — avoid alarming phrases like "it\'s really bad".',
      ],
    },
    legal: {
      statutes: [
        { name: 'Health & Safety at Work Act 1974 s.2', detail: 'Employers must provide adequate first aid provision and trained first aiders.' },
        { name: 'Social Action, Responsibility and Heroism Act 2015', detail: 'Protects Good Samaritans who act heroically in an emergency — courts must consider good faith when assessing liability.' },
        { name: 'Reporting of Injuries, Diseases and Dangerous Occurrences Regs 2013 (RIDDOR)', detail: 'Serious workplace injuries must be reported to the HSE.' },
      ],
      reasonableForce: 'No force consideration applies. Your legal duty is to summon help promptly and not to leave a vulnerable person without assistance if doing so would endanger life.',
      doNot: [
        'Do not give food, water or medication unless trained and instructed by 999.',
        'Do not remove a helmet or restrictive clothing without paramedic guidance.',
        'Do not leave the person alone unless absolutely unavoidable.',
        'Do not assume they are intoxicated — the symptoms overlap with serious medical events.',
      ],
    },
  },

  'lone-worker': {
    immediate: [
      'Attempt contact immediately via radio, phone and messaging — all channels.',
      'Check their last known location and scheduled check-in time.',
      'If no response within your protocol window — escalate to supervisor immediately.',
      'Dispatch a colleague or manager to their last known location to do a welfare check.',
      'Call 999 if you have reason to believe they are injured or in danger.',
      'Preserve any communications logs — exact timestamps matter.',
      'Activate your lone worker monitoring system if not already triggered.',
    ],
    deEscalate: {
      phrases: [
        '"[Name], this is [your name] — please confirm you\'re safe."',
        '"We\'re sending someone to check on you now — if you can hear this, stay where you are."',
        '"Don\'t worry, we\'re coming to you. Just stay calm and stay put."',
      ],
      tips: [
        'Remain composed — panic impairs decision-making.',
        'Follow your lone worker policy precisely — document every step.',
        'If they are found safe, debrief them: why did contact fail?',
        'If found injured, do not move them unless in immediate danger.',
        'Review and update lone worker risk assessments after any incident.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Health & Safety at Work Act 1974 s.2', detail: 'Employers have a duty to protect lone workers as far as reasonably practicable.' },
        { name: 'Management of Health & Safety at Work Regs 1999 Reg.16', detail: 'Risk assessment must specifically address lone working risks.' },
        { name: 'HSE Lone Working Guidance (HSG73)', detail: 'Employers should implement a system for monitoring lone workers and responding when contact is lost.' },
      ],
      reasonableForce: 'No force consideration applies to a lone worker welfare check. Your obligation is a prompt welfare response and accurate record-keeping.',
      doNot: [
        'Do not wait until the end of the shift before escalating a missed check-in.',
        'Do not send a lone worker to check on another lone worker without informing control.',
        'Do not assume they are simply ignoring their device.',
        'Do not destroy communications logs — they are evidence.',
      ],
    },
  },

  'theft': {
    immediate: [
      'Do not physically intervene or attempt to stop the person yourself.',
      'Observe and note: description, number of individuals, items taken, direction of exit.',
      'Activate CCTV review if available — note the timestamp.',
      'Call 999 if the theft involves violence, a weapon, or the offender is still on site.',
      'Otherwise, report to police via 101 or online reporting and retain your notes.',
      'Secure the scene — do not disturb areas where fingerprints may be present.',
      'Notify your manager and complete an internal incident report.',
    ],
    deEscalate: {
      phrases: [
        '"I think there may have been a misunderstanding. Can we speak privately?"',
        '"I\'m not accusing you — I just need to resolve this calmly."',
        '"I need you to stay here while I get my manager."',
        '"This is all captured on CCTV. Let\'s sort this out sensibly."',
      ],
      tips: [
        'Never accuse without evidence — a wrongful accusation exposes you to liability.',
        'Do not use emotive language — keep it factual and calm.',
        'If the person becomes aggressive, withdraw and call police.',
        'Have a colleague present whenever possible when challenging someone.',
        'Do not block exits — false imprisonment is a civil and criminal offence.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Theft Act 1968 s.1', detail: 'Dishonest appropriation of property belonging to another with intent to permanently deprive.' },
        { name: 'Robbery — Theft Act 1968 s.8', detail: 'Theft involving force or threat of force — a serious arrestable offence.' },
        { name: 'Criminal Law Act 1967 s.3 (Citizen\'s arrest)', detail: 'You may detain a person if an indictable offence is in the act of being committed AND force used is reasonable. This is a high legal bar — use with extreme caution.' },
      ],
      reasonableForce: 'A citizen\'s arrest for theft is legally permitted only while the offence is actively occurring and the person is identified with certainty. Any force must be minimal and proportionate. Wrongful detention is false imprisonment — a serious offence.',
      doNot: [
        'Do not physically grab or restrain unless you meet the citizen\'s arrest threshold.',
        'Do not search the person — only a constable has that power.',
        'Do not accuse publicly without evidence — defamation risk.',
        'Do not pursue the person off-site or into traffic.',
      ],
    },
  },

  'harassment': {
    immediate: [
      'Document the behaviour immediately: date, time, what was said or done, witnesses.',
      'Report to your manager or designated safeguarding lead.',
      'If you feel unsafe, remove yourself from the situation.',
      'Do not engage or respond to further contact from the harasser.',
      'Preserve evidence: save messages, emails, voicemails — do not delete.',
      'If the harassment is criminal in nature (threats, stalking), report to police on 101 or 999 if urgent.',
      'Consider requesting a Personal Safety Order or Non-Molestation Order if the pattern is sustained.',
    ],
    deEscalate: {
      phrases: [
        '"I need you to stop contacting me. This is my final request."',
        '"Your behaviour is unwelcome and I\'ve recorded it. Please leave."',
        '"I am not going to respond to this. If it continues I will involve the police."',
        '"This conversation is over. Please respect that."',
      ],
      tips: [
        'A clear, single statement of refusal is more effective than repeated explanations.',
        'Continued engagement — even to say stop — can reinforce stalking behaviour.',
        'Never meet alone to "resolve" the issue — use a formal setting with witnesses.',
        'Self-help apps (e.g. Bright Sky, Hollie Guard) can record evidence automatically.',
        'Vary your routine if you believe you are being physically followed.',
      ],
    },
    legal: {
      statutes: [
        { name: 'Protection from Harassment Act 1997 s.1 & s.2', detail: 'A course of conduct that amounts to harassment — at least two occasions. Civil and criminal remedies available.' },
        { name: 'Stalking — PHA 1997 s.2A & s.4A', detail: 'Stalking is a specific offence. Acts include monitoring online activity, following, loitering near home or work.' },
        { name: 'Equality Act 2010 s.26', detail: 'Workplace harassment related to a protected characteristic (sex, race, disability etc.) is unlawful.' },
      ],
      reasonableForce: 'Physical force is not appropriate in response to harassment unless you are in immediate physical danger. Your remedies are legal and procedural: injunctions, restraining orders, police reports.',
      doNot: [
        'Do not retaliate — this can undermine your legal case.',
        'Do not assume one incident is insufficient — document from the very first occurrence.',
        'Do not tell the harasser about the evidence you are collecting.',
        'Do not feel obliged to manage this alone — involve HR, police or a solicitor.',
      ],
    },
  },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const SITUATIONS: Situation[] = [
  {
    id: 'physical-threat',
    label: 'Physical Threat',
    sublabel: 'Aggression / intimidation',
    Icon: Siren,
    urgency: 'critical',
    palette: {
      border: 'border-red-500/60',
      glow: 'shadow-red-500/20',
      icon: 'text-red-400',
      badge: 'bg-red-500/20',
      badgeText: 'text-red-300',
      cardBg: 'bg-red-950/30',
    },
  },
  {
    id: 'assault-fight',
    label: 'Assault / Fight',
    sublabel: 'Active physical violence',
    Icon: Sword,
    urgency: 'critical',
    palette: {
      border: 'border-red-600/60',
      glow: 'shadow-red-600/20',
      icon: 'text-red-500',
      badge: 'bg-red-600/20',
      badgeText: 'text-red-300',
      cardBg: 'bg-red-950/30',
    },
  },
  {
    id: 'verbal-abuse',
    label: 'Verbal Abuse',
    sublabel: 'Threats / harassment by speech',
    Icon: MessageSquareWarning,
    urgency: 'high',
    palette: {
      border: 'border-orange-500/60',
      glow: 'shadow-orange-500/20',
      icon: 'text-orange-400',
      badge: 'bg-orange-500/20',
      badgeText: 'text-orange-300',
      cardBg: 'bg-orange-950/30',
    },
  },
  {
    id: 'weapon-sighted',
    label: 'Weapon Sighted',
    sublabel: 'Knife, firearm or blunt object',
    Icon: CrosshairIcon,
    urgency: 'critical',
    palette: {
      border: 'border-red-500/70',
      glow: 'shadow-red-500/25',
      icon: 'text-red-400',
      badge: 'bg-red-500/20',
      badgeText: 'text-red-300',
      cardBg: 'bg-red-950/40',
    },
  },
  {
    id: 'medical-emergency',
    label: 'Medical Emergency',
    sublabel: 'Injury, collapse or seizure',
    Icon: HeartPulse,
    urgency: 'critical',
    palette: {
      border: 'border-rose-400/60',
      glow: 'shadow-rose-400/20',
      icon: 'text-rose-400',
      badge: 'bg-rose-500/20',
      badgeText: 'text-rose-300',
      cardBg: 'bg-rose-950/30',
    },
  },
  {
    id: 'lone-worker',
    label: 'Lone Worker Alert',
    sublabel: 'Unresponsive / no contact',
    Icon: UserX,
    urgency: 'high',
    palette: {
      border: 'border-amber-500/60',
      glow: 'shadow-amber-500/20',
      icon: 'text-amber-400',
      badge: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      cardBg: 'bg-amber-950/30',
    },
  },
  {
    id: 'theft',
    label: 'Theft',
    sublabel: 'Shoplifting / robbery in progress',
    Icon: ShoppingBag,
    urgency: 'high',
    palette: {
      border: 'border-yellow-500/60',
      glow: 'shadow-yellow-500/20',
      icon: 'text-yellow-400',
      badge: 'bg-yellow-500/20',
      badgeText: 'text-yellow-300',
      cardBg: 'bg-yellow-950/30',
    },
  },
  {
    id: 'harassment',
    label: 'Harassment',
    sublabel: 'Stalking / repeated unwanted contact',
    Icon: BadgeAlert,
    urgency: 'medium',
    palette: {
      border: 'border-purple-500/60',
      glow: 'shadow-purple-500/20',
      icon: 'text-purple-400',
      badge: 'bg-purple-500/20',
      badgeText: 'text-purple-300',
      cardBg: 'bg-purple-950/30',
    },
  },
];

const URGENCY_LABEL: Record<Urgency, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  medium: 'MEDIUM',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    loc: p.get('loc') ?? '',
    ctx: p.get('ctx') ?? '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SituationCardProps {
  situation: Situation;
  onSelect: (s: Situation) => void;
}

function SituationCard({ situation, onSelect }: SituationCardProps) {
  const { Icon, label, sublabel, urgency, palette } = situation;
  const isCritical = urgency === 'critical';

  return (
    <motion.button
      onClick={() => onSelect(situation)}
      className={[
        'relative flex flex-col items-start justify-between',
        'rounded-2xl border p-4 text-left w-full min-h-[120px]',
        'active:scale-95 transition-transform',
        palette.border,
        palette.cardBg,
        'shadow-lg',
        palette.glow,
      ].join(' ')}
      whileTap={{ scale: 0.94 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      {/* Urgency badge */}
      <span
        className={[
          'text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full mb-2',
          palette.badge,
          palette.badgeText,
        ].join(' ')}
      >
        {URGENCY_LABEL[urgency]}
      </span>

      {/* Icon */}
      <Icon className={['w-6 h-6 mb-auto', palette.icon].join(' ')} strokeWidth={2} />

      {/* Label */}
      <div className="mt-3">
        <p className="text-sm font-bold text-white leading-tight">{label}</p>
        <p className="text-[11px] text-white/40 mt-0.5 leading-tight">{sublabel}</p>
      </div>

      {/* Critical pulse ring */}
      {isCritical && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className={['animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', palette.badge].join(' ')} />
          <span className={['relative inline-flex rounded-full h-2.5 w-2.5', palette.badge].join(' ')} />
        </span>
      )}
    </motion.button>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type ResponseTab = 'immediate' | 'deescalate' | 'legal';

const TABS: { id: ResponseTab; label: string; Icon: React.ElementType }[] = [
  { id: 'immediate', label: 'Immediate', Icon: Flame },
  { id: 'deescalate', label: 'De-escalate', Icon: MessageCircle },
  { id: 'legal', label: 'Legal', Icon: Scale },
];

// ─── ResponseCard ─────────────────────────────────────────────────────────────

interface ResponseCardProps {
  situation: Situation;
  loc: string;
  onBack: () => void;
  isLandscape?: boolean;
}

function ResponseCard({ situation, loc, onBack, isLandscape = false }: ResponseCardProps) {
  const [activeTab, setActiveTab] = useState<ResponseTab>('immediate');
  const [ariaOpen, setAriaOpen] = useState(false);
  const content = RESPONSE_CONTENT[situation.id];
  const { Icon, label, palette } = situation;

  const handleReport = () => {
    const params = new URLSearchParams({ view: 'report' });
    if (loc) params.set('loc', loc);
    window.location.href = `?${params.toString()}`;
  };

  // ── Tab content renderer ─────────────────────────────────────────────────
  const tabContent = (
    <AnimatePresence mode="wait">

      {activeTab === 'immediate' && (
        <motion.div
          key="immediate"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2.5"
        >
          <p className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-1">
            Action Steps — follow in order
          </p>
          {content.immediate.map((step, i) => (
            <div key={i} className="flex gap-3 bg-white/5 rounded-xl p-3.5 border border-white/8">
              <span className={[
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black',
                palette.badge, palette.badgeText,
              ].join(' ')}>
                {i + 1}
              </span>
              <p className="text-sm text-white/85 leading-snug pt-0.5">{step}</p>
            </div>
          ))}
        </motion.div>
      )}

      {activeTab === 'deescalate' && (
        <motion.div
          key="deescalate"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-4"
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-2">Say exactly this</p>
            <div className="flex flex-col gap-2">
              {content.deEscalate.phrases.map((phrase, i) => (
                <div key={i} className="bg-white/5 rounded-xl px-4 py-3 border border-white/8">
                  <p className="text-sm text-white leading-snug italic">{phrase}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-2">Coaching notes</p>
            <div className="flex flex-col gap-2">
              {content.deEscalate.tips.map((tip, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-sm text-white/70 leading-snug">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'legal' && (
        <motion.div
          key="legal"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-4"
        >
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-2">Relevant legislation</p>
            <div className="flex flex-col gap-2">
              {content.legal.statutes.map((s, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3.5 border border-white/8">
                  <p className="text-xs font-bold text-amber-300 mb-1">{s.name}</p>
                  <p className="text-xs text-white/60 leading-snug">{s.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-amber-400" strokeWidth={2} />
              <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Reasonable Force</p>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">{content.legal.reasonableForce}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-white/30 mb-2">Do not</p>
            <div className="flex flex-col gap-2">
              {content.legal.doNot.map((item, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  <p className="text-sm text-white/70 leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-white/20 leading-relaxed border-t border-white/8 pt-3">
            This information is a general guide only and does not constitute legal advice. Always seek professional legal advice for your specific circumstances.
          </p>
        </motion.div>
      )}

    </AnimatePresence>
  );

  // ── CTA block ────────────────────────────────────────────────────────────
  const ctaBlock = (
    <div className="flex flex-col gap-2.5 pt-2">
      {/* ARIA trigger */}
      <motion.button
        onClick={() => setAriaOpen(true)}
        className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-amber-500/30 rounded-xl px-4 py-3 transition-all text-left group min-h-[52px]"
        whileTap={{ scale: 0.97 }}
      >
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center group-hover:border-amber-500/60 transition-colors">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-none">Ask ARIA</p>
          <p className="text-[11px] text-white/40 mt-0.5 truncate">
            AI guidance · {situation.label}{loc ? ` · Zone ${loc}` : ''}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-amber-400 transition-colors flex-shrink-0" />
      </motion.button>

      {/* Report CTA — 52px height for easy tap */}
      <button
        onClick={handleReport}
        className="w-full flex items-center justify-between gap-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-xl px-5 min-h-[52px] transition-colors text-sm shadow-lg shadow-amber-500/20"
      >
        <div className="flex items-center gap-2.5">
          <FileWarning className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
          <span>Report This Incident</span>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
      </button>

      {/* Back — clearly labelled, 48px */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 active:bg-white/5 transition-all text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Choose different situation</span>
      </button>
    </div>
  );

  // ── Portrait layout ──────────────────────────────────────────────────────
  if (!isLandscape) {
    return (
      <motion.div
        className="flex-1 flex flex-col px-4 pb-10"
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -32 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        {/* Situation banner */}
        <div className={['rounded-2xl border p-4 mb-4 flex items-center gap-3', palette.border, palette.cardBg].join(' ')}>
          <div className={['w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', palette.badge].join(' ')}>
            <Icon className={['w-5 h-5', palette.icon].join(' ')} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={['text-[9px] font-black tracking-widest uppercase mb-0.5', palette.badgeText].join(' ')}>
              {URGENCY_LABEL[situation.urgency]}
            </p>
            <p className="text-sm font-bold text-white truncate">{label}</p>
            {loc && <p className="text-[11px] text-white/40 font-mono">Zone {loc}</p>}
          </div>
          {situation.urgency === 'critical' && (
            <span className="flex h-2.5 w-2.5 flex-shrink-0 relative">
              <span className={['animate-ping absolute inline-flex h-full w-full rounded-full opacity-70', palette.badge].join(' ')} />
              <span className={['relative inline-flex rounded-full h-2.5 w-2.5', palette.badge].join(' ')} />
            </span>
          )}
        </div>

        {/* Tab bar — 48px rows */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-4 gap-1">
          {TABS.map(({ id, label: tabLabel, Icon: TabIcon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-xs font-bold transition-all duration-200',
                  isActive ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white/70',
                ].join(' ')}
              >
                <TabIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>{tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tabContent}

        {/* CTAs */}
        <div className="mt-5">{ctaBlock}</div>

        <AriaGuideDrawer
          open={ariaOpen}
          situationLabel={situation.label}
          loc={loc}
          onClose={() => setAriaOpen(false)}
          accentClass={palette.icon}
        />
      </motion.div>
    );
  }

  // ── Landscape layout — side-by-side ──────────────────────────────────────
  return (
    <motion.div
      className="flex-1 flex flex-row px-4 pb-4 gap-3 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Left column: tabs + content */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {/* Compact banner */}
        <div className={['rounded-xl border px-3 py-2 mb-3 flex items-center gap-2', palette.border, palette.cardBg].join(' ')}>
          <div className={['w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', palette.badge].join(' ')}>
            <Icon className={['w-4 h-4', palette.icon].join(' ')} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black tracking-widest uppercase text-white/40">{URGENCY_LABEL[situation.urgency]}</p>
            <p className="text-xs font-bold text-white truncate">{label}</p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex rounded-lg bg-white/5 p-0.5 mb-3 gap-0.5">
          {TABS.map(({ id, label: tabLabel, Icon: TabIcon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={[
                  'flex-1 flex items-center justify-center gap-1 min-h-[40px] rounded-md text-[11px] font-bold transition-all',
                  isActive ? 'bg-white text-black shadow-sm' : 'text-white/40 hover:text-white/70',
                ].join(' ')}
              >
                <TabIcon className="w-3 h-3" strokeWidth={2.5} />
                <span>{tabLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1">{tabContent}</div>
      </div>

      {/* Right column: CTAs (fixed width, vertically centred) */}
      <div className="w-[220px] flex-shrink-0 flex flex-col justify-center gap-2.5 py-2">
        {/* ARIA */}
        <motion.button
          onClick={() => setAriaOpen(true)}
          className="w-full flex items-center gap-2.5 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-amber-500/30 rounded-xl px-3 py-2.5 transition-all text-left group min-h-[52px]"
          whileTap={{ scale: 0.97 }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Ask ARIA</p>
            <p className="text-[10px] text-white/35 truncate">AI guidance</p>
          </div>
        </motion.button>

        {/* Report */}
        <button
          onClick={handleReport}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-xl px-4 min-h-[52px] transition-colors text-xs shadow-lg shadow-amber-500/25"
        >
          <FileWarning className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
          <span>Report Incident</span>
        </button>

        {/* Back */}
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Situations</span>
        </button>
      </div>

      <AriaGuideDrawer
        open={ariaOpen}
        situationLabel={situation.label}
        loc={loc}
        onClose={() => setAriaOpen(false)}
        accentClass={palette.icon}
      />
    </motion.div>
  );
}

// ─── Progress Stepper ────────────────────────────────────────────────────────

type GuideStep = 'select' | 'guide' | 'report';

const STEPS: { id: GuideStep; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'guide',  label: 'Guide'  },
  { id: 'report', label: 'Report' },
];

function ProgressStepper({ current }: { current: GuideStep }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);

  return (
    <div className="flex items-center justify-center gap-0 px-5 py-2.5" role="progressbar" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        const future  = i > currentIdx;

        return (
          <React.Fragment key={step.id}>
            {/* Step node */}
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className={[
                  'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all',
                  done   ? 'bg-amber-500 text-black'       : '',
                  active ? 'bg-amber-500 text-black ring-2 ring-amber-400/40 ring-offset-1 ring-offset-black' : '',
                  future ? 'bg-white/8 text-white/25 border border-white/10' : '',
                ].join(' ')}
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </motion.div>
              <span className={[
                'text-[9px] font-bold uppercase tracking-widest transition-colors',
                active ? 'text-amber-400' : done ? 'text-amber-500/60' : 'text-white/20',
              ].join(' ')}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="relative flex-1 mx-2 mb-4">
                <div className="h-px bg-white/10 w-full" />
                <motion.div
                  className="absolute inset-y-0 left-0 h-px bg-amber-500"
                  initial={{ width: '0%' }}
                  animate={{ width: done ? '100%' : active ? '50%' : '0%' }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

type GuideView = 'selector' | 'response';

interface SituationalGuideProps {
  /** Called when the user wants to go back past the selector (e.g. to SosEntryGate) */
  onBack?: () => void;
}

export function SituationalGuide({ onBack }: SituationalGuideProps = {}) {
  const { loc } = getParams();
  const [selected, setSelected]   = useState<Situation | null>(null);
  const [view, setView]           = useState<GuideView>('selector');
  const [isLandscape, setIsLandscape] = useState(false);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Track orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight && window.innerHeight < 500);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scroll to top on view change
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleSelect = (s: Situation) => {
    setSelected(s);
    setView('response');
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (view === 'response') {
      setView('selector');
      setSelected(null);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Back from selector → go to SosEntryGate if callback provided
    if (onBack) {
      onBack();
      return;
    }
    if (document.referrer === '') {
      window.close();
    } else {
      window.history.back();
    }
  };

  // Current stepper step
  const currentStep: GuideStep = view === 'selector' ? 'select' : 'guide';

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-black text-white flex flex-col select-none overflow-x-hidden"
    >

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-white/8">

        {/* Top bar */}
        <div className="flex items-center justify-between px-3 pt-safe-top">
          {/* Back — full 48px tap target */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-white/50 hover:text-white active:text-amber-400 transition-colors min-h-[48px] min-w-[72px] pr-3"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-sm font-semibold">
              {view === 'response' ? 'Situations' : 'Back'}
            </span>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-black tracking-[0.2em] uppercase text-white/60">
              SafeGuard
            </span>
          </div>

          {/* Zone pill — or spacer */}
          {loc ? (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1 min-h-[32px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
              <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider max-w-[80px] truncate">
                {loc}
              </span>
            </div>
          ) : (
            <div className="min-w-[72px]" />
          )}
        </div>

        {/* Progress stepper — hidden in landscape to save vertical space */}
        {!isLandscape && <ProgressStepper current={currentStep} />}
      </header>

      {/* ── Landscape compact stepper strip ── */}
      {isLandscape && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-white/3 border-b border-white/8">
          {STEPS.map((step, i) => {
            const currentIdx = STEPS.findIndex(s => s.id === currentStep);
            const done   = i < currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={step.id}>
                <div className={[
                  'flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest',
                  active ? 'text-amber-400' : done ? 'text-amber-500/50' : 'text-white/20',
                ].join(' ')}>
                  <span className={[
                    'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black',
                    active ? 'bg-amber-500 text-black' : done ? 'bg-amber-500/50 text-black/70' : 'bg-white/10 text-white/30',
                  ].join(' ')}>
                    {done ? '✓' : i + 1}
                  </span>
                  {step.label}
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Hero ── */}
      <AnimatePresence mode="wait">
        {view === 'selector' && !isLandscape && (
          <motion.div
            key="hero-selector"
            className="px-5 pt-5 pb-4"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                Staff Response Tool
              </span>
            </div>
            <h1 className="text-[1.6rem] font-bold leading-tight text-white font-display">
              What's happening?
            </h1>
            <p className="text-sm text-white/45 mt-1">
              Select the situation — get an immediate action plan.
            </p>
          </motion.div>
        )}

        {view === 'selector' && isLandscape && (
          <motion.div
            key="hero-selector-ls"
            className="px-5 pt-3 pb-2 flex items-baseline gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h1 className="text-xl font-bold text-white font-display">What's happening?</h1>
            <p className="text-xs text-white/40">Select a situation</p>
          </motion.div>
        )}

        {view === 'response' && selected && !isLandscape && (
          <motion.div
            key="hero-response"
            className="px-5 pt-5 pb-4"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={[
                'text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full',
                selected.palette.badge, selected.palette.badgeText,
              ].join(' ')}>
                {URGENCY_LABEL[selected.urgency]}
              </span>
            </div>
            <h1 className="text-[1.6rem] font-bold leading-tight text-white font-display">{selected.label}</h1>
            <p className="text-sm text-white/45 mt-1">Your immediate action plan</p>
          </motion.div>
        )}

        {view === 'response' && selected && isLandscape && (
          <motion.div
            key="hero-response-ls"
            className="px-5 pt-2 pb-1 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className={[
              'text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full flex-shrink-0',
              selected.palette.badge, selected.palette.badgeText,
            ].join(' ')}>
              {URGENCY_LABEL[selected.urgency]}
            </span>
            <h1 className="text-lg font-bold text-white truncate">{selected.label}</h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <AnimatePresence mode="wait">

        {/* SELECTOR VIEW */}
        {view === 'selector' && (
          <motion.main
            key="selector"
            className="flex-1 px-4 pb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Landscape: 4-column grid; portrait: 2-column */}
            <div className={['grid gap-3', isLandscape ? 'grid-cols-4' : 'grid-cols-2'].join(' ')}>
              {SITUATIONS.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.04 }}
                >
                  <SituationCard situation={s} onSelect={handleSelect} />
                </motion.div>
              ))}
            </div>

            <p className="text-center text-[11px] text-white/20 mt-5">
              Tap the situation that best matches what you are seeing
            </p>
          </motion.main>
        )}

        {/* RESPONSE VIEW */}
        {view === 'response' && selected && (
          <ResponseCard
            key="response"
            situation={selected}
            loc={loc}
            isLandscape={isLandscape}
            onBack={() => { setView('selector'); setSelected(null); }}
          />
        )}

      </AnimatePresence>

      {/* ── Footer ── */}
      {view === 'selector' && !isLandscape && (
        <footer className="px-5 pb-6 pt-2 text-center">
          <p className="text-[10px] tracking-wide">
            <span className="font-black text-green-400">ABSOLUTE DEFENCE OS</span>
            <span className="text-white/35"> · For authorised use only</span>
          </p>
        </footer>
      )}

    </div>
  );
}
