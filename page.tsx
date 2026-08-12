"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type View = "mission" | "replay" | "console" | "defend" | "evidence" | "report";
type Defense = { id:string; name:string; note:string; impact:string; points:number; tag:string };
type ConsoleCommand = { command:string; label:string; domain:string; description:string; output:{tone:string;text:string}[] };

const events = [
  { time:"08:42:11", title:"Password accepted", note:"Valid credentials used from an unrecognized browser.", mitre:"T1078", level:"medium", category:"AUTH", source:"45.83.12.91", result:"Success" },
  { time:"08:42:19", title:"Impossible travel detected", note:"1,137 km of travel recorded in under four minutes.", mitre:"DET0400", level:"high", category:"AUTH", source:"Toronto → Ashburn", result:"Flagged" },
  { time:"08:42:34", title:"MFA prompt storm", note:"Seven push requests sent to the same user in 41 seconds.", mitre:"T1621", level:"critical", category:"MFA", source:"45.83.12.91", result:"7 prompts" },
  { time:"08:43:02", title:"MFA request approved", note:"The seventh push was accepted from the registered phone.", mitre:"T1621", level:"critical", category:"MFA", source:"Maya’s iPhone", result:"Approved" },
  { time:"08:44:17", title:"Session token replayed", note:"A valid web session appeared on a second unmanaged device.", mitre:"T1539", level:"critical", category:"SESSION", source:"Unknown Linux", result:"Session active" },
  { time:"08:45:03", title:"Rogue MFA method added", note:"A new authenticator was registered for persistence.", mitre:"T1098.005", level:"critical", category:"AUDIT", source:"45.83.12.91", result:"Method added" },
  { time:"08:46:26", title:"Sensitive data queried", note:"The payroll archive was opened and staged for download.", mitre:"T1213", level:"critical", category:"DATA", source:"Northstar Vault", result:"4.8 GB staged" },
] as const;

const defenses: Defense[] = [
  { id:"fido", name:"Require phishing-resistant MFA", note:"Replace push approval with a device-bound FIDO2 credential.", impact:"Stops the MFA-fatigue path before a cloud session is issued.", points:25, tag:"PREVENT" },
  { id:"conditional", name:"Enforce risk-based access", note:"Block high-risk sign-ins from unmanaged devices and unusual locations.", impact:"Denies the impossible-travel login and requires a compliant device.", points:20, tag:"PREVENT" },
  { id:"revoke", name:"Revoke active sessions", note:"Invalidate every refresh token and browser session for Maya Chen.", impact:"Cuts off the stolen session token immediately.", points:20, tag:"CONTAIN" },
  { id:"disable", name:"Temporarily disable account", note:"Suspend authentication while the incident is investigated.", impact:"Prevents new sessions and stops continued access.", points:15, tag:"CONTAIN" },
  { id:"remove", name:"Remove rogue MFA method", note:"Delete the newly registered authenticator and review all methods.", impact:"Eliminates the attacker’s persistence mechanism.", points:15, tag:"ERADICATE" },
  { id:"reset", name:"Reset password only", note:"Change Maya’s password without revoking existing sessions.", impact:"Useful, but the stolen session remains valid until revoked.", points:4, tag:"LIMITED" },
  { id:"ip", name:"Block observed source IP", note:"Deny 45.83.12.91 at the network edge.", impact:"Slows the actor, but they can rotate infrastructure.", points:3, tag:"LIMITED" },
];

const consoleCommands: ConsoleCommand[] = [
  { command:"phantom identity inspect --user mchen@northstar.lab --window 10m", label:"Inspect identity context", domain:"IDENTITY SECURITY", description:"Compare a technically valid sign-in with the device, location, and behavioral context surrounding it.", output:[{tone:"ok",text:"credential_validation=SUCCESS  principal=mchen@northstar.lab"},{tone:"danger",text:"impossible_travel=TRUE  Toronto→Ashburn  elapsed=04m"},{tone:"warn",text:"device_trust=UNMANAGED  sign_in_risk=HIGH  score=67"}] },
  { command:"phantom mfa analyze --user mchen@northstar.lab --correlate", label:"Analyze MFA pressure", domain:"MFA ATTACK", description:"Correlate repeated push requests and identify the precise challenge that the user approved.", output:[{tone:"info",text:"push_prompts=7  observation_window=41s  method=PUSH"},{tone:"danger",text:"challenge_07=APPROVED  source_session=sess-F09"},{tone:"warn",text:"ATT&CK=T1621  pattern=MFA_REQUEST_GENERATION"}] },
  { command:"phantom session correlate --principal mchen@northstar.lab --risk", label:"Correlate cloud sessions", domain:"CLOUD ACCESS", description:"Find session reuse across devices and determine whether an authenticated token was replayed.", output:[{tone:"ok",text:"sess-A21  Chrome/Windows  Toronto  trusted=TRUE"},{tone:"danger",text:"sess-F09  Firefox/Linux  Ashburn  trusted=FALSE"},{tone:"danger",text:"token_fingerprint=DUPLICATED  replay_confidence=96%  ATT&CK=T1539"}] },
  { command:"phantom cloud audit --event AddAuthenticationMethod --user mchen@northstar.lab", label:"Hunt identity persistence", domain:"CLOUD AUDIT", description:"Search administrative telemetry for a persistence mechanism added after the account compromise.", output:[{tone:"info",text:"08:45:03Z  event=AddAuthenticationMethod  result=SUCCESS"},{tone:"danger",text:"method=AuthenticatorApp  device=RAVEN-31  owner=UNKNOWN"},{tone:"warn",text:"persistence_suspected=TRUE  ATT&CK=T1098.005"}] },
  { command:"phantom zero-trust evaluate --principal mchen@northstar.lab --resource payroll-vault", label:"Evaluate Zero Trust policy", domain:"ZERO TRUST", description:"Recalculate the access decision using identity risk, device posture, session context, and resource sensitivity.", output:[{tone:"info",text:"policy=legacy-finance-access  resource_sensitivity=RESTRICTED"},{tone:"warn",text:"signals=HIGH_RISK,UNMANAGED_DEVICE,ANOMALOUS_LOCATION"},{tone:"danger",text:"decision=ALLOW  reason=RISK_SIGNALS_NOT_ENFORCED"},{tone:"warn",text:"control_gap=CONDITIONAL_ACCESS  blast_radius=PAYROLL_VAULT"}] },
  { command:"phantom response plan --case PA-042 --zero-trust --preserve-evidence", label:"Build response plan", domain:"INCIDENT RESPONSE", description:"Generate a safe containment sequence without executing changes against any real system.", output:[{tone:"ok",text:"01 REVOKE sessions  02 DISABLE identity  03 REMOVE rogue MFA"},{tone:"ok",text:"04 REQUIRE FIDO2  05 ENFORCE compliant device"},{tone:"info",text:"evidence_preservation=ENABLED  estimated_containment=43s"},{tone:"ok",text:"STATUS=RESPONSE_PLAN_READY  next=DEFENSE_CONSOLE"}] },
];

const nav: [View,string,string][] = [["mission","01","Mission brief"],["replay","02","Attack replay"],["console","03","Case console"],["defend","04","Defense console"],["evidence","05","Evidence room"],["report","06","After-action"]];
const viewTitle: Record<View,string> = {mission:"MISSION BRIEF",replay:"ATTACK REPLAY",console:"CASE CONSOLE",defend:"DEFENSE CONSOLE",evidence:"EVIDENCE ROOM",report:"AFTER-ACTION"};
const progressByView: Record<View,number> = {mission:8,replay:28,console:48,defend:68,evidence:85,report:100};

function Badge({level}:{level:string}) { return <em className={`badge ${level}`}>{level}</em>; }

export default function Home() {
  const [view,setView] = useState<View>("mission");
  const [step,setStep] = useState(1);
  const [playing,setPlaying] = useState(false);
  const [activeDefenses,setActiveDefenses] = useState<string[]>([]);
  const [evidenceFilter,setEvidenceFilter] = useState("ALL");
  const [selectedEvidence,setSelectedEvidence] = useState(2);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setStep(s => {
      if (s >= events.length) { setPlaying(false); return s; }
      return s + 1;
    }),1200);
    return () => window.clearInterval(timer);
  },[playing]);

  const score = useMemo(() => Math.min(100,activeDefenses.reduce((sum,id) => sum + (defenses.find(d => d.id === id)?.points ?? 0),0)),[activeDefenses]);
  const state = score >= 75 ? "CONTAINED" : score >= 45 ? "PARTIAL" : "EXPOSED";
  const protectedAt = activeDefenses.includes("fido") || activeDefenses.includes("conditional") ? 2 : activeDefenses.includes("revoke") || activeDefenses.includes("disable") ? 5 : activeDefenses.includes("remove") ? 6 : 8;

  const toggleDefense = (id:string) => setActiveDefenses(items => items.includes(id) ? items.filter(item => item !== id) : [...items,id]);
  const resetLab = () => { setPlaying(false); setStep(1); setActiveDefenses([]); setEvidenceFilter("ALL"); };
  const begin = () => { resetLab(); setView("replay"); setPlaying(true); };

  function downloadReport() {
    const selected = defenses.filter(d => activeDefenses.includes(d.id));
    const body = ["PHANTOM ACCESS — AFTER-ACTION REPORT","Case: PA-042 | User: Maya Chen",`Final score: ${score}/100 | Outcome: ${state}`,"", "Controls deployed:",...(selected.length ? selected.map(d => `- ${d.name}: ${d.impact}`) : ["- No controls deployed"]),"","MITRE ATT&CK: T1078, T1621, T1539, T1098.005, T1213","Finding: Password reset alone does not invalidate an active session token."].join("\n");
    const url = URL.createObjectURL(new Blob([body],{type:"text/plain"}));
    const link = document.createElement("a"); link.href=url; link.download="Phantom_Access_After_Action_Report.txt"; link.click(); URL.revokeObjectURL(url);
  }

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="shield">P</div><div><b>PHANTOM</b><small>ACCESS / LAB</small></div></div>
      <p className="case">CASE FILE · PA-042</p>
      <nav aria-label="Lab sections">{nav.map(([id,num,label]) => <button type="button" key={id} className={view===id?"active":""} onClick={() => setView(id)}><i>{num}</i><span>{label}</span>{id==="report"&&score>=75?<em className="nav-done">✓</em>:null}</button>)}</nav>
      <div className="case-progress"><div><span>LAB PROGRESS</span><b>{progressByView[view]}%</b></div><i><span style={{width:`${progressByView[view]}%`}}/></i></div>
      <div className="operator"><span>BT</span><div><small>ACTIVE OPERATOR</small><b>Blue Team Analyst</b></div><i/></div>
    </aside>

    <section className="workspace">
      <header><div className="crumb"><span>IDENTITY DEFENSE LAB</span><i>/</i><b>{viewTitle[view]}</b></div><div className="tools"><span className="live"><i/> SYSTEM LIVE</span><button type="button" onClick={resetLab} aria-label="Reset lab">↻</button><button type="button" onClick={() => setView("mission")}>LAB GUIDE ↗</button></div></header>
      <div className="content">
        {view==="mission"&&<Mission begin={begin}/>} 
        {view==="replay"&&<Replay step={step} setStep={setStep} playing={playing} setPlaying={setPlaying} next={() => setView("console")}/>} 
        {view==="console"&&<CaseConsole next={() => setView("defend")}/>} 
        {view==="defend"&&<DefenseConsole active={activeDefenses} toggle={toggleDefense} score={score} state={state} protectedAt={protectedAt} next={() => setView("evidence")}/>} 
        {view==="evidence"&&<Evidence filter={evidenceFilter} setFilter={setEvidenceFilter} selected={selectedEvidence} setSelected={setSelectedEvidence} next={() => setView("report")}/>} 
        {view==="report"&&<Report score={score} state={state} selected={activeDefenses} back={() => setView("defend")} download={downloadReport}/>} 
      </div>
    </section>
  </main>;
}

function Mission({begin}:{begin:()=>void}) {
  return <>
    <section className="mission-hero">
      <div className="mission-copy"><p className="eyebrow">— &nbsp; CLOUD IDENTITY INCIDENT</p><span className="case-chip">CASE PA-042 · NORTHSTAR FINANCIAL</span><h1>Trust was the<br/><strong>attack surface.</strong></h1><p>A finance administrator’s password has been exposed. Your job is to reconstruct the intrusion, contain the identity, preserve the evidence, and stop access to the company’s payroll vault.</p><div className="mission-actions"><button className="primary-button" type="button" onClick={begin}>BEGIN INVESTIGATION <span>→</span></button><button type="button" onClick={() => document.getElementById("objectives")?.scrollIntoView({behavior:"smooth"})}>VIEW OBJECTIVES</button></div></div>
      <div className="identity-card"><div className="id-head"><span>IDENTITY DOSSIER</span><i>HIGH RISK</i></div><div className="person"><span>MC</span><div><h2>Maya Chen</h2><p>Finance Administrator</p></div></div><dl><div><dt>ACCOUNT</dt><dd>mchen@northstar.lab</dd></div><div><dt>ACCESS</dt><dd>Payroll Vault · Finance Cloud</dd></div><div><dt>LAST SAFE LOGIN</dt><dd>Toronto, CA · 08:38 UTC</dd></div><div><dt>MFA</dt><dd className="warning">Push notification</dd></div></dl><div className="id-foot"><span><i/> Account active</span><b>RISK 28 → 98</b></div></div>
    </section>
    <section className="brief-grid" id="objectives">
      <article><small>01 / RECONSTRUCT</small><h2>Follow the identity trail</h2><p>Replay seven events, then run a command-driven investigation across the identity stack.</p><span>7 EVENTS · 6 COMMANDS</span></article>
      <article><small>02 / CONTAIN</small><h2>Make the right call</h2><p>Turn console findings into controls. Some actions only create the appearance of safety.</p><span>7 CONTROLS</span></article>
      <article><small>03 / PROVE</small><h2>Build the case</h2><p>Correlate authentication, MFA, session, audit, and data-access evidence.</p><span>5 LOG SOURCES</span></article>
    </section>
    <section className="objective-bar"><div><span>LEARNING OBJECTIVES</span><b>Identity detection · MFA analysis · Cloud session forensics · Zero Trust · Incident response</b></div><div className="duration"><small>EST. TIME</small><b>15–18 MIN</b></div></section>
  </>;
}

function Replay({step,setStep,playing,setPlaying,next}:{step:number;setStep:(n:number)=>void;playing:boolean;setPlaying:(v:boolean)=>void;next:()=>void}) {
  const event=events[step-1]; const risk=Math.min(98,25+step*10);
  const reset=()=>{setPlaying(false);setStep(1)};
  return <>
    <section className="hero compact-hero"><div><p className="eyebrow">— &nbsp; INCIDENT SIMULATION</p><h1>One trusted account.<br/><span>Seven minutes to breach.</span></h1><p>Trace the intrusion from valid credentials to sensitive data access.</p></div><div className="risk" style={{"--risk":`${risk*3.6}deg`} as React.CSSProperties}><div><small>IDENTITY RISK</small><b>{risk}</b><em>/ 100</em></div></div></section>
    <section className="metrics"><div><small>COMPROMISED USER</small><b>Maya Chen</b><span>Finance Administrator</span></div><div><small>ELAPSED TIME</small><b>00:0{step+1}:2{step}</b><span>Since initial access</span></div><div><small>ACTIVE SESSIONS</small><b>{step>=5?"03":"02"}</b><span>{step>=5?"+1 untrusted":"All recognized"}</span></div><div><small>INCIDENT STATE</small><b className={step>=4?"red":"amber"}>{step>=7?"DATA ACCESS":step>=4?"COMPROMISED":"AT RISK"}</b><span>Severity · Critical</span></div></section>
    <div className="grid"><section className="panel path-panel"><PanelHead kicker="LIVE ATTACK PATH" title="Identity compromise chain" stream/>
      <AttackMap step={step}/>
      <div className="now"><span className={`index ${event.level}`}>0{step}</span><div><small>NOW PLAYING · {event.time}</small><b>{event.title}</b><p>{event.note}</p></div><div className="tech"><small>MITRE ATT&amp;CK</small><b>{event.mitre}</b><Badge level={event.level}/></div></div>
    </section><aside className="panel timeline"><PanelHead kicker="EVENT TIMELINE" title="Attack sequence" count={`${step}/7`}/><div>{events.map((item,i)=><button type="button" className={`${i+1===step?"selected":""} ${i+1<=step?"shown":"locked"}`} key={item.time} onClick={()=>{setPlaying(false);setStep(i+1)}}><i>{i+1<=step?i+1:"·"}</i><span><small>{item.time}</small><b>{item.title}</b></span>{i+1<=step&&<Badge level={item.level}/>}</button>)}</div></aside></div>
    <section className="controls"><button type="button" onClick={reset}>RESET</button><button className="primary" type="button" onClick={()=>{if(step>=7)setStep(1);setPlaying(!playing)}}>{playing?"Ⅱ  PAUSE REPLAY":"▶  RUN ATTACK REPLAY"}</button>{step<7?<button type="button" onClick={()=>setStep(Math.min(7,step+1))}>NEXT EVENT →</button>:<button type="button" onClick={next}>OPEN CASE CONSOLE →</button>}<i><span style={{width:`${step/7*100}%`}}/></i></section>
  </>;
}

function CaseConsole({next}:{next:()=>void}) {
  const [completed,setCompleted] = useState(0);
  const [running,setRunning] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const finished = completed >= consoleCommands.length;
  const focus = consoleCommands[Math.min(completed,consoleCommands.length-1)];

  useEffect(() => {
    if (!running || finished) return;
    const timer = window.setTimeout(() => setCompleted(value => Math.min(consoleCommands.length,value+1)),1450);
    return () => window.clearTimeout(timer);
  },[running,completed,finished]);

  useEffect(() => {
    if (finished) setRunning(false);
    terminalRef.current?.scrollTo({top:terminalRef.current.scrollHeight,behavior:"smooth"});
  },[completed,finished]);

  const reset = () => { setRunning(false); setCompleted(0); };
  const run = () => { if (finished) setCompleted(0); setRunning(value => !value); };
  const runNext = () => { setRunning(false); setCompleted(value => Math.min(consoleCommands.length,value+1)); };
  const signals = [
    {after:1,code:"ID",label:"Identity",finding:"High-risk sign-in",tone:"warn"},
    {after:2,code:"MF",label:"MFA",finding:"Push fatigue confirmed",tone:"danger"},
    {after:3,code:"SE",label:"Session",finding:"Token replayed",tone:"danger"},
    {after:4,code:"CL",label:"Cloud audit",finding:"Persistence added",tone:"danger"},
    {after:5,code:"ZT",label:"Zero Trust",finding:"Policy gap exposed",tone:"warn"},
    {after:6,code:"IR",label:"Response",finding:"Plan ready",tone:"safe"},
  ];

  return <>
    <section className="console-intro"><div><p className="eyebrow">— &nbsp; COMMAND-DRIVEN INVESTIGATION</p><h1>Interrogate the identity.<br/><span>Watch the evidence answer.</span></h1><p>Phantom CLI turns the replay into a live investigation across identity, MFA, cloud sessions, audit activity, Zero Trust policy, and incident response.</p></div><div className="console-case"><small>CASE CONSOLE</small><b>PA-042</b><span><i/> SIMULATION ONLINE</span></div></section>

    <section className="console-metrics"><div><small>COMMANDS PROCESSED</small><b>{String(completed).padStart(2,"0")} / 06</b><span>{finished?"Sequence complete":running?"Automation running":"Awaiting input"}</span></div><div><small>IDENTITY RISK</small><b className="red">98 / 100</b><span>Critical</span></div><div><small>ARTIFACTS CORRELATED</small><b>{Math.min(18,completed*3).toString().padStart(2,"0")}</b><span>Across 5 sources</span></div><div><small>RESPONSE STATE</small><b className={finished?"cyan":"amber"}>{finished?"PLAN READY":"INVESTIGATING"}</b><span>Dry-run only</span></div></section>

    <div className="case-console-layout">
      <section className="terminal-window">
        <div className="terminal-titlebar"><div><i/><i/><i/></div><span>phantom-shell — case/PA-042</span><b>READ-ONLY SIMULATION</b></div>
        <div className="terminal-body" ref={terminalRef} aria-live="polite">
          <div className="terminal-banner"><b>PHANTOM CLI</b><span>Identity Incident Workbench v2.4</span><small>Fictional commands · no live tenant connected · evidence mode</small></div>
          {consoleCommands.slice(0,completed).map((item,index) => <div className="command-block" key={item.command}>
            <div className="command-line"><span>analyst@pa-042</span><i>:</i><em>~</em><b>$</b><code>{item.command}</code></div>
            <div className="command-output">{item.output.map((line,lineIndex) => <p className={line.tone} key={lineIndex}><i>{line.tone==="ok"?"✓":line.tone==="danger"?"!":line.tone==="warn"?"△":"·"}</i><span>{line.text}</span></p>)}</div>
            <div className="command-complete"><span>[{String(index+1).padStart(2,"0")}/06]</span> {item.label} <b>complete</b></div>
          </div>)}
          {!finished&&<div className="command-block processing"><div className="command-line"><span>analyst@pa-042</span><i>:</i><em>~</em><b>$</b><code>{focus.command}</code><u/></div>{running?<div className="processing-line"><i/><span>processing {focus.domain.toLowerCase()} telemetry…</span></div>:<div className="paused-line">[paused] run the sequence or process the next command</div>}</div>}
          {finished&&<div className="terminal-finish"><span>╭─</span><b>INVESTIGATION COMPLETE</b><span>────────────────────────╮</span><p>Six command stages processed. Response plan handed to the Defense Console.</p><small>case://PA-042/findings/response-plan-ready</small></div>}
        </div>
        <div className="terminal-controls"><button type="button" onClick={reset}>RESET</button><button className="terminal-run" type="button" onClick={run}>{running?"Ⅱ  PAUSE SEQUENCE":finished?"↻  REPLAY SEQUENCE":"▶  RUN SEQUENCE"}</button>{!finished?<button type="button" onClick={runNext}>PROCESS NEXT →</button>:<button className="terminal-next" type="button" onClick={next}>OPEN DEFENSE CONSOLE →</button>}<span><i style={{width:`${completed/consoleCommands.length*100}%`}}/></span></div>
      </section>

      <aside className="console-side">
        <section className="panel signal-panel"><PanelHead kicker="LIVE CASE SIGNALS" title="Investigation stack" count={`${completed}/6`}/><div>{signals.map(signal => {const active=completed>=signal.after;return <article className={active?`active ${signal.tone}`:""} key={signal.code}><span>{signal.code}</span><div><b>{signal.label}</b><small>{active?signal.finding:"Waiting for command"}</small></div><em>{active?"FOUND":"PENDING"}</em></article>})}</div></section>
        <section className="panel command-focus"><div className="focus-head"><span>COMMAND FOCUS</span><em>{finished?"COMPLETE":`${String(completed+1).padStart(2,"0")} / 06`}</em></div><small>{finished?"HANDOFF READY":focus.domain}</small><h2>{finished?"Turn findings into controls":focus.label}</h2><p>{finished?"The investigation established the attack path and generated a response sequence. Choose the controls that actually contain it.":focus.description}</p><div><span>IDENTITY</span><span>MFA</span><span>SESSION</span><span>CLOUD</span><span>ZERO TRUST</span><span>IR</span></div></section>
        <section className="simulation-note"><span>SAFE LAB MODE</span><p>All commands and output are simulated locally. Nothing connects to or changes a real identity provider or cloud environment.</p></section>
      </aside>
    </div>
  </>;
}

function DefenseConsole({active,toggle,score,state,protectedAt,next}:{active:string[];toggle:(id:string)=>void;score:number;state:string;protectedAt:number;next:()=>void}) {
  return <>
    <section className="section-intro"><div><p className="eyebrow">— &nbsp; RESPONSE PHASE</p><h1>Break the chain.<br/><span>Every action has a consequence.</span></h1><p>Select response controls and watch the incident outcome change. Aim for 75 points without relying on cosmetic fixes.</p></div><div className={`score-card ${state.toLowerCase()}`}><small>DEFENSE SCORE</small><b>{score}</b><em>/100</em><span>{state}</span></div></section>
    <div className="defense-layout"><section className="panel defense-list"><PanelHead kicker="CONTROL LIBRARY" title="Select your response actions" count={`${active.length} ACTIVE`}/><div className="defense-items">{defenses.map(d=>{const on=active.includes(d.id);return <button type="button" className={on?"enabled":""} key={d.id} onClick={()=>toggle(d.id)} aria-pressed={on}><span className="switch"><i/></span><div><span>{d.tag}</span><b>{d.name}</b><p>{d.note}</p></div><em>+{d.points}</em></button>})}</div></section>
      <aside className="defense-side"><section className="panel"><PanelHead kicker="SIMULATED OUTCOME" title="Containment preview"/><div className="mini-path"><div className="mini-node bad"><i>A</i><span>ACTOR</span></div><b className={protectedAt<=2?"stopped":"hot"}>→</b><div className={`mini-node ${protectedAt<=2?"safe":"bad"}`}><i>ID</i><span>IDENTITY</span></div><b className={protectedAt<=5?"stopped":"hot"}>→</b><div className={`mini-node ${protectedAt<=5?"safe":"bad"}`}><i>S</i><span>SESSION</span></div><b className={protectedAt<=7?"stopped":"hot"}>→</b><div className={`mini-node ${protectedAt<=7?"safe":"bad"}`}><i>V</i><span>VAULT</span></div></div><div className={`outcome ${state.toLowerCase()}`}><small>CURRENT OUTCOME</small><b>{state==="CONTAINED"?"Attack contained":state==="PARTIAL"?"Access disrupted":"Breach remains active"}</b><p>{state==="CONTAINED"?"The session is invalidated and persistence is removed.":state==="PARTIAL"?"Some access is blocked, but gaps remain in the response.":"The attacker can still reach the payroll vault."}</p></div></section>
      <section className="analyst-tip"><span>ANALYST NOTE</span><p>A password reset changes credentials. It does not automatically invalidate every active session token.</p></section><button type="button" className="next-button" onClick={next}>INVESTIGATE EVIDENCE <span>→</span></button></aside>
    </div>
  </>;
}

function Evidence({filter,setFilter,selected,setSelected,next}:{filter:string;setFilter:(v:string)=>void;selected:number;setSelected:(v:number)=>void;next:()=>void}) {
  const visible=filter==="ALL"?events:events.filter(e=>e.category===filter); const detail=events[selected];
  return <>
    <section className="section-intro evidence-intro"><div><p className="eyebrow">— &nbsp; FORENSIC WORKSPACE</p><h1>Correlate the signals.<br/><span>Prove what happened.</span></h1><p>Authentication alone tells only part of the story. Pivot across five evidence sources to reconstruct the intrusion.</p></div><div className="evidence-count"><small>EVIDENCE ITEMS</small><b>07</b><span>5 sources · 1 identity</span></div></section>
    <section className="filterbar"><span>FILTER SOURCE</span>{["ALL","AUTH","MFA","SESSION","AUDIT","DATA"].map(f=><button type="button" className={filter===f?"active":""} onClick={()=>setFilter(f)} key={f}>{f}</button>)}<i/><b>WINDOW&nbsp; 08:42—08:47 UTC</b></section>
    <div className="evidence-layout"><section className="panel log-table"><div className="table-head"><span>TIME</span><span>SOURCE</span><span>EVENT</span><span>RESULT</span><span>SEVERITY</span></div>{visible.map(item=>{const index=events.indexOf(item);return <button type="button" key={item.time} className={selected===index?"selected":""} onClick={()=>setSelected(index)}><span>{item.time}</span><span><i>{item.category.slice(0,2)}</i>{item.category}</span><span><b>{item.title}</b><small>{item.source}</small></span><span>{item.result}</span><Badge level={item.level}/></button>})}</section>
      <aside className="panel evidence-detail"><PanelHead kicker="SELECTED ARTIFACT" title={`EV-0${selected+1}`}/><div className="artifact-icon">{detail.category.slice(0,2)}</div><span className="artifact-type">{detail.category} TELEMETRY</span><h2>{detail.title}</h2><p>{detail.note}</p><dl><div><dt>Timestamp</dt><dd>2026-08-08 {detail.time} UTC</dd></div><div><dt>Principal</dt><dd>mchen@northstar.lab</dd></div><div><dt>Source</dt><dd>{detail.source}</dd></div><div><dt>MITRE</dt><dd className="cyan">{detail.mitre}</dd></div></dl><div className="hash"><span>INTEGRITY HASH</span><code>2fa1…{selected}c8e·verified</code></div></aside>
    </div><section className="evidence-footer"><div><i>✓</i><span><b>CHAIN OF CUSTODY PRESERVED</b><small>All artifacts timestamped and integrity-checked.</small></span></div><button type="button" onClick={next}>GENERATE AFTER-ACTION <span>→</span></button></section>
  </>;
}

function Report({score,state,selected,back,download}:{score:number;state:string;selected:string[];back:()=>void;download:()=>void}) {
  const chosen=defenses.filter(d=>selected.includes(d.id)); const strong=chosen.filter(d=>d.points>=15); const limited=chosen.filter(d=>d.points<10);
  return <>
    <section className="report-hero"><div className={`report-ring ${state.toLowerCase()}`}><div><small>FINAL SCORE</small><b>{score}</b><em>/100</em></div></div><div><p className="eyebrow">— &nbsp; CASE PA-042 CLOSED</p><h1>{state==="CONTAINED"?"Incident contained.":state==="PARTIAL"?"Incident partially contained.":"The attacker got through."}</h1><p>{state==="CONTAINED"?"You stopped the active session, removed persistence, and protected the payroll vault.":state==="PARTIAL"?"You disrupted the intrusion, but your control set left a recoverable path for the attacker.":"Your response did not interrupt the stolen session before sensitive data was reached."}</p><span className={`result-chip ${state.toLowerCase()}`}>{state}</span></div></section>
    <section className="report-stats"><div><small>TIME TO DETECT</small><b>00:00:23</b><span>Fast</span></div><div><small>CONTROLS DEPLOYED</small><b>{selected.length.toString().padStart(2,"0")}</b><span>{strong.length} high-impact</span></div><div><small>ATT&amp;CK COVERAGE</small><b>05</b><span>Techniques mapped</span></div><div><small>DATA OUTCOME</small><b className={state==="CONTAINED"?"cyan":"red"}>{state==="CONTAINED"?"PROTECTED":"AT RISK"}</b><span>Payroll vault</span></div></section>
    <div className="report-grid"><section className="panel findings"><PanelHead kicker="RESPONSE REVIEW" title="Controls deployed"/><div>{chosen.length?chosen.map(d=><article key={d.id}><span className={d.points>=15?"good":"weak"}>{d.points>=15?"✓":"!"}</span><div><b>{d.name}</b><p>{d.impact}</p></div><em>+{d.points}</em></article>):<div className="empty-state"><span>∅</span><b>No response controls selected</b><p>Return to the defense console to complete the exercise.</p></div>}</div></section>
      <aside className="panel lessons"><PanelHead kicker="KEY FINDINGS" title="What this incident proved"/><ol><li><span>01</span><p><b>Valid does not mean trusted.</b> A correct password still requires context from device, location, and risk.</p></li><li><span>02</span><p><b>Push MFA can be manipulated.</b> Phishing-resistant authentication removes the approval fatigue decision.</p></li><li><span>03</span><p><b>Contain the session.</b> Resetting credentials without token revocation leaves the intruder connected.</p></li>{limited.length>0&&<li><span>04</span><p><b>Cosmetic controls scored poorly.</b> IP blocks and password-only resets do not eradicate identity persistence.</p></li>}</ol></aside></div>
    <section className="report-actions"><button type="button" onClick={back}>← ADJUST DEFENSES</button><button type="button" className="primary" onClick={download}>DOWNLOAD INCIDENT REPORT ↓</button></section>
  </>;
}

function PanelHead({kicker,title,stream,count}:{kicker:string;title:string;stream?:boolean;count?:string}) { return <div className="panel-head"><div><small>{kicker}</small><h2>{title}</h2></div>{stream?<span className="stream"><i/> EVENT STREAM</span>:count?<b className="count">{count}</b>:null}</div>; }

function AttackMap({step}:{step:number}) { return <div className="attack-map">{([[1,"A","Threat actor","Untrusted device"],[2,"ID","Identity provider","Password + push MFA"],[5,"S","Cloud session","Token replayed"],[7,"V","Data vault","Payroll archive"]] as const).map((node,index)=><div className="map-unit" key={node[1]}><div className={`node ${step>=node[0]?"reached":""}`}><i>0{index+1}</i><span>{node[1]}</span><b>{node[2]}</b><small>{node[3]}</small></div>{index<3&&<div className={`link ${step>=[2,5,7][index]?"hot":""}`}><i/></div>}</div>)}</div>; }
