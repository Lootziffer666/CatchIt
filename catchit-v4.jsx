import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CatchIt v4 — Your Travel Companion
   "Ein Termin. Eine Lösung. Kein Stress."

   Companion-Style UI · Conversational Trip Creation · Shadow Router
   Multi-Source Transit · Group Sync Light · Active-Move · Notification Engine
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Warm Pastell Companion (Notion-inspired, NOT tech)
// ═══════════════════════════════════════════════════════════════════════════

const PALETTES = {
  peach:   { h: 15,  s: 85, name: "Pfirsich" },
  sage:    { h: 145, s: 35, name: "Salbei" },
  sky:     { h: 210, s: 55, name: "Himmel" },
  lavender:{ h: 265, s: 45, name: "Lavendel" },
  rose:    { h: 345, s: 55, name: "Rosé" },
  sand:    { h: 35,  s: 50, name: "Sand" },
  mint:    { h: 165, s: 40, name: "Minze" },
  coral:   { h: 5,   s: 70, name: "Koralle" },
};

const mkTheme = (key = "peach") => {
  const p = PALETTES[key] || PALETTES.peach;
  const { h, s } = p;
  return {
    key,
    // Warm base — cream, not grey, not white
    bg: `hsl(${h}, ${Math.min(s,30)}%, 97%)`,
    bgWarm: `hsl(${h}, ${Math.min(s,25)}%, 94%)`,
    card: `hsl(${h}, ${Math.min(s,20)}%, 99%)`,
    cardHover: `hsl(${h}, ${Math.min(s,25)}%, 96%)`,
    // Accent
    accent: `hsl(${h}, ${s}%, 55%)`,
    accentSoft: `hsl(${h}, ${s-10}%, 90%)`,
    accentText: `hsl(${h}, ${s}%, 30%)`,
    accentBold: `hsl(${h}, ${s}%, 45%)`,
    // Text
    text: `hsl(${h}, 10%, 15%)`,
    textSoft: `hsl(${h}, 8%, 45%)`,
    textMuted: `hsl(${h}, 6%, 62%)`,
    // Semantic
    ok: "hsl(145, 45%, 52%)",
    okSoft: "hsl(145, 40%, 92%)",
    okText: "hsl(145, 45%, 25%)",
    warn: "hsl(38, 90%, 55%)",
    warnSoft: "hsl(38, 80%, 93%)",
    warnText: "hsl(38, 70%, 28%)",
    crit: "hsl(0, 65%, 55%)",
    critSoft: "hsl(0, 60%, 94%)",
    critText: "hsl(0, 55%, 30%)",
    info: `hsl(${h}, ${s-10}%, 92%)`,
    infoText: `hsl(${h}, ${s}%, 35%)`,
    // Border
    border: `hsl(${h}, 10%, 88%)`,
    borderSoft: `hsl(${h}, 8%, 92%)`,
    // Shadow — very soft
    shadow: `0 1px 3px hsl(${h}, 10%, 80%, 0.3), 0 1px 2px hsl(${h}, 10%, 70%, 0.1)`,
    shadowHover: `0 4px 12px hsl(${h}, 10%, 70%, 0.15)`,
  };
};

const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 9999 };
const FONT = "'Nunito', 'SF Pro Rounded', 'Segoe UI', system-ui, sans-serif";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap";

// ═══════════════════════════════════════════════════════════════════════════
// TRANSIT KERNEL (same as v3 but with Shadow Router + Active-Move)
// ═══════════════════════════════════════════════════════════════════════════

const DB = "https://v6.db.transport.rest";
const Transit = {
  async searchStops(q) {
    try { const r = await fetch(`${DB}/locations?query=${encodeURIComponent(q)}&results=6&stops=true&addresses=true`);
      return r.ok ? (await r.json()).filter(s=>s.type==="stop"||s.type==="station") : []; } catch { return []; }
  },
  async nearby(lat, lon) {
    try { const r = await fetch(`${DB}/stops/nearby?latitude=${lat}&longitude=${lon}&results=6&distance=1500`);
      return r.ok ? await r.json() : []; } catch { return []; }
  },
  async departures(sid, mins=120) {
    try { const r = await fetch(`${DB}/stops/${encodeURIComponent(sid)}/departures?duration=${mins}&results=20`);
      if(!r.ok) return []; const d = await r.json();
      return (d.departures||d||[]).map(x=>({...x,_delay:x.delay?Math.round(x.delay/60):0,
        _line:x.line?.name||"?",_dir:x.direction||"?",_platform:x.departurePlatform||null,
        _cancelled:x.cancelled||false,_planned:x.plannedWhen||x.when,_actual:x.when}));
    } catch { return []; }
  },
  async journey(from, to, time, isArr=false, products=null) {
    try { const p = new URLSearchParams({from,to,results:"5",stopovers:"true",transferTime:"3",
      ...(isArr?{arrival:time}:{departure:time||new Date().toISOString()})});
      if(products) { // Transport mode filter
        if(!products.bus) p.set("bus","false");
        if(!products.subway) p.set("subway","false");
        if(!products.tram) p.set("tram","false");
        if(!products.suburban) p.set("suburban","false");
        if(!products.regional) p.set("regional","false");
        if(!products.express) p.set("express","false"); }
      const r = await fetch(`${DB}/journeys?${p}`);
      return r.ok ? ((await r.json()).journeys||[]) : [];
    } catch { return []; }
  },
  async tripDetails(tid) {
    try { const r = await fetch(`${DB}/trips/${encodeURIComponent(tid)}?stopovers=true`);
      if(!r.ok) return null; const d = await r.json();
      return { ...(d.trip||d), _pos: (d.trip||d).currentLocation||null,
        _stops: ((d.trip||d).stopovers||[]).map(s=>({name:s.stop?.name,arr:s.arrival,
          arrD:s.arrivalDelay,dep:s.departure,depD:s.departureDelay,plat:s.departurePlatform||s.arrivalPlatform}))};
    } catch { return null; }
  },
};

// Shadow Router: maintains alternative routes
const ShadowRouter = {
  async compute(from, to, time, isArr, products) {
    const primary = await Transit.journey(from, to, time, isArr, products);
    // Get shadow routes with different parameters
    const shadows = [];
    if (primary.length > 0) {
      // Shadow 1: 10 min earlier
      const earlier = new Date(time); earlier.setMinutes(earlier.getMinutes() - 10);
      const s1 = await Transit.journey(from, to, earlier.toISOString(), isArr, products);
      if (s1.length) shadows.push({ type: "earlier", journey: s1[0], label: "10 Min früher los" });
      // Shadow 2: different transport modes (if filtered)
      if (products && (!products.regional || !products.suburban)) {
        const s2 = await Transit.journey(from, to, time, isArr, null); // all modes
        if (s2.length && s2[0].legs?.[0]?.departure !== primary[0]?.legs?.[0]?.departure) {
          shadows.push({ type: "all_modes", journey: s2[0], label: "Alle Verkehrsmittel" });
        }
      }
    }
    return { primary, shadows };
  },
};

// Active-Move calculator
const ActiveMove = {
  WALK_SPEED_KMH: 4.5,
  canWalkToNext(currentStop, nextStop) {
    if (!currentStop?.location || !nextStop?.location) return null;
    const lat1=currentStop.location.latitude, lon1=currentStop.location.longitude;
    const lat2=nextStop.location.latitude, lon2=nextStop.location.longitude;
    const R_EARTH = 6371;
    const dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const dist = R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const walkMins = Math.round(dist / this.WALK_SPEED_KMH * 60);
    if (dist <= 2.0 && walkMins <= 25) {
      return { distKm: Math.round(dist*10)/10, walkMins, viable: true };
    }
    return null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION ENGINE (Info / Action / Group)
// ═══════════════════════════════════════════════════════════════════════════

const Notif = {
  _perm: null,
  async init() {
    if (!("Notification" in window)) return;
    this._perm = await Notification.requestPermission();
  },
  send(type, title, body, actions) {
    if (this._perm !== "granted") return;
    const icons = { info: "ℹ️", action: "⚡", group: "👥" };
    try { new Notification(`${icons[type]||""} ${title}`, { body, tag: `catchit-${type}-${Date.now()}`,
      requireInteraction: type === "action", silent: type === "info" }); } catch {}
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POLLING WORKER (adaptive tiers)
// ═══════════════════════════════════════════════════════════════════════════

class Poller {
  constructor() { this.fns=new Set(); this.t=null; this.tier="SLEEP"; this.on=false; }
  sub(fn) { this.fns.add(fn); return ()=>this.fns.delete(fn); }
  emit(k,v) { this.fns.forEach(f=>f(k,v)); }
  getTier(trips, cfg) {
    const now=Date.now(), dow=new Date().getDay(), td=new Date().toISOString().split("T")[0];
    let min=Infinity;
    for(const tr of (trips||[])) {
      if(tr.date!==td && !tr.recurrence?.days?.includes(dow)) continue;
      const t=tr.stops?.[0]?.time; if(!t) continue;
      const [h,m]=t.split(":").map(Number); const ms=new Date(); ms.setHours(h,m,0,0);
      const left=(ms-now)/60000-(cfg?.walkTimeMin||4)-(cfg?.bufferMin||5);
      if(left<min && left>-30) min=left;
    }
    if(min<=30) return "URGENT"; if(min<=120) return "ACTIVE";
    if(min<Infinity) return "BG"; return "SLEEP";
  }
  ms(tier) { return {URGENT:30000,ACTIVE:60000,BG:300000,SLEEP:900000}[tier]||300000; }
  async cycle(trips, cfg) {
    const tier = this.getTier(trips, cfg);
    if(tier!==this.tier) { this.tier=tier; this.emit("tier",tier); }
    if(cfg?.homeStop?.id) {
      const deps = await Transit.departures(cfg.homeStop.id);
      this.emit("deps", deps);
    }
    const now=new Date(), dow=now.getDay(), td=now.toISOString().split("T")[0];
    for(const tr of (trips||[])) {
      if(tr.date!==td && !tr.recurrence?.days?.includes(dow)) continue;
      const legs = await this.calcLegs(tr, cfg);
      this.emit("legs", { id: tr.id, legs });
    }
  }
  async calcLegs(trip, cfg) {
    if(!trip?.stops||trip.stops.length<2) return [];
    const legs=[]; const prods = cfg?.products || null;
    for(let i=0; i<trip.stops.length-1; i++) {
      const f=trip.stops[i], t=trip.stops[i+1];
      if(!f.stopId||!t.stopId) { legs.push({i,from:f.name,to:t.name,st:"no-stop"}); continue; }
      let time;
      if(t.fixedArr && t.time) { const d=new Date(); const [h,m]=t.time.split(":").map(Number); d.setHours(h,m,0,0); time=d.toISOString(); }
      else if(f.time) { const d=new Date(); const [h,m]=f.time.split(":").map(Number); d.setHours(h,m,0,0); if(f.dur) d.setMinutes(d.getMinutes()+f.dur); time=d.toISOString(); }
      const {primary, shadows} = await ShadowRouter.compute(f.stopId, t.stopId, time, !!(t.fixedArr&&t.time), prods);
      const best=primary[0]; const walk=cfg?.walkTimeMin||4, buf=cfg?.bufferMin||5, wx=cfg?.wxExtra||0;
      let leave=null, line=null, dep=null, arr=null, delay=0, plats=[], tid=null, pos=null, cancelled=false;
      if(best?.legs?.[0]) {
        const d=new Date(best.legs[0].departure); d.setMinutes(d.getMinutes()-walk-buf-wx);
        leave=d.toISOString();
        const tl=best.legs.find(l=>l.line); line=tl?.line?.name;
        dep=fTime(best.legs[0].departure); arr=fTime(best.legs[best.legs.length-1].arrival);
        delay=best.legs[0].departureDelay?Math.round(best.legs[0].departureDelay/60):0;
        cancelled=best.legs.some(l=>l.cancelled);
        plats=best.legs.filter(l=>l.departurePlatform).map(l=>({line:l.line?.name,plat:l.departurePlatform,stop:l.origin?.name}));
        tid=best.legs.find(l=>l.tripId)?.tripId;
      }
      // Active-Move check
      const walkOpt = ActiveMove.canWalkToNext(
        {location:f.location||null}, {location:t.location||null}
      );
      legs.push({i,from:f.name,to:t.name,st:cancelled?"cancelled":"ok",
        best,shadows,leave,line,dep,arr,delay,cancelled,plats,tid,pos,
        alts:primary.slice(1,3).map(j=>({dep:fTime(j.legs?.[0]?.departure),arr:fTime(j.legs?.[j.legs?.length-1]?.arrival),line:j.legs?.find(l=>l.line)?.line?.name})),
        walkOption:walkOpt});
    }
    // Buffer analysis
    for(let i=0;i<legs.length-1;i++) {
      if(legs[i].best&&legs[i+1].best) {
        const a=new Date(legs[i].best.legs?.[legs[i].best.legs.length-1]?.arrival);
        const stay=trip.stops[i+1]?.dur||0;
        const nd=new Date(legs[i+1].best.legs?.[0]?.departure);
        const b=(nd-a)/60000-stay;
        legs[i].buf=Math.round(b);
        legs[i].bufSt=b<3?"crit":b<8?"tight":"ok";
      }
    }
    return legs;
  }
  start(trips,cfg) { this.on=true; this._go(trips,cfg); }
  async _go(trips,cfg) { if(!this.on) return; await this.cycle(trips,cfg); this.t=setTimeout(()=>this._go(trips,cfg),this.ms(this.tier)); }
  restart(trips,cfg) { clearTimeout(this.t); if(this.on) this._go(trips,cfg); }
  stop() { this.on=false; clearTimeout(this.t); }
}
const poller = new Poller();

// ═══════════════════════════════════════════════════════════════════════════
// PROACTIVE BUFFER + NLP (carried from v3, compact)
// ═══════════════════════════════════════════════════════════════════════════

const ProBuffer = {
  analyze(trip, legs, cfg) {
    if(!legs?.length) return [];
    const evts=[], walk=cfg?.walkTimeMin||4, buf=cfg?.bufferMin||5;
    for(const leg of legs) {
      if(leg.cancelled) { evts.push({type:"cancelled",sev:"crit",title:`${leg.line||"Verbindung"} fällt aus!`,
        body:`${leg.from} → ${leg.to}`,action:leg.alts?.[0]?`Alternative: ${leg.alts[0].line} um ${leg.alts[0].dep}`:null,
        shadow:leg.shadows?.[0],trip,leg,resched:true}); continue; }
      if(leg.delay>0) { const sev=leg.delay>=15?"crit":leg.delay>=5?"warn":"info";
        evts.push({type:"delay",sev,title:`${leg.line||"Bus"} +${leg.delay} Min`,
          body:`Abfahrt jetzt ${leg.dep}`,shadow:leg.shadows?.[0],trip,leg,resched:leg.delay>=10,rMin:leg.delay+5}); }
      if(leg.bufSt==="crit") evts.push({type:"buffer",sev:"crit",title:"Anschluss gefährdet!",
        body:`Nur ${leg.buf} Min Puffer`,trip,leg,resched:true});
      else if(leg.bufSt==="tight") evts.push({type:"buffer",sev:"warn",title:`${leg.buf} Min Puffer`,body:"Knappes Zeitfenster",trip,leg});
      if(leg.leave) { const m=(new Date(leg.leave)-new Date())/60000;
        if(m>-5&&m<=30) { const sev=m<=0?"crit":m<=5?"warn":"info";
          evts.push({type:"depart",sev,title:m<=0?"Jetzt losgehen! 🏃":m<=5?"Gleich aufbrechen!":"Bald losgehen",
            body:m<=0?`${walk} Min zur Haltestelle!`:`Noch ${Math.round(m)} Min · ${leg.line||"Bus"} um ${leg.dep}`,trip,leg,mLeft:Math.round(m)}); } }
      if(leg.walkOption?.viable) evts.push({type:"walk",sev:"info",title:"Laufen statt warten?",
        body:`${leg.walkOption.distKm}km · ca. ${leg.walkOption.walkMins} Min zu Fuß`,trip,leg});
    }
    return evts.sort((a,b)=>({crit:0,warn:1,info:2}[a.sev]||2)-({crit:0,warn:1,info:2}[b.sev]||2));
  }
};

const NLP = {
  parse(text) {
    if(!text||text.length<3) return null;
    const r={title:null,date:null,times:[],locs:[],dur:null,rec:null,conf:0};
    let m;
    const t1=/(\d{1,2}):(\d{2})/g; while((m=t1.exec(text))!==null){const h=+m[1],mn=+m[2];
      if(h>=0&&h<=23&&mn>=0&&mn<=59){r.times.push(`${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`);r.conf+=.3}}
    const d1=/(\d{1,2})\.(\d{1,2})\.(\d{4})?/g; if((m=d1.exec(text))!==null){const d=+m[1],mo=+m[2]-1,y=m[3]?+m[3]:new Date().getFullYear();
      if(d>=1&&d<=31&&mo>=0&&mo<=11){r.date=`${y}-${String(mo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;r.conf+=.25}}
    if(/\bheute\b/i.test(text)){r.date=todayS();r.conf+=.15}
    if(/\bmorgen\b/i.test(text)){const d=new Date();d.setDate(d.getDate()+1);r.date=d.toISOString().split("T")[0];r.conf+=.15}
    const dayMap={montag:1,dienstag:2,mittwoch:3,donnerstag:4,freitag:5,samstag:6,sonntag:0};
    const dRe=/(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)/gi;
    if((m=dRe.exec(text))!==null){const dn=dayMap[m[1].toLowerCase()];if(dn!==undefined&&!r.date){
      const now=new Date();const diff=(dn-now.getDay()+7)%7||7;const d=new Date();d.setDate(d.getDate()+diff);
      r.date=d.toISOString().split("T")[0];r.conf+=.2;
      if(/jeden/i.test(text)) r.rec={type:"weekly",days:[dn]};}}
    const lRe=[/bei\s+(.+?)(?:[,.]|$)/gi,/([\w\s]+(?:str|straße|weg|platz)\s*\.?\s*\d+\w*)/gi,/(?:Praxis|Kita|Schule|Arzt|Büro)\s+(.+?)(?:[,.\n]|$)/gi];
    for(const p of lRe){p.lastIndex=0;while((m=p.exec(text))!==null){const l=m[1]?.trim();if(l&&l.length>2&&l.length<80){r.locs.push(l);r.conf+=.15}}}
    const drRe=/(\d+)\s*(Min|Std|h)/gi;if((m=drRe.exec(text))!==null){const n=+m[1];r.dur=m[2].toLowerCase().startsWith("h")||m[2].toLowerCase().startsWith("std")?n*60:n;r.conf+=.1}
    const lines=text.split("\n").filter(Boolean); r.title=lines[0]?.length<60?lines[0]:null;
    return r.conf>=.15?r:null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const DAYS=["So","Mo","Di","Mi","Do","Fr","Sa"], DAYSF=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MOF=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const pad=n=>String(n).padStart(2,"0");
const fTime=d=>{if(!d)return"--:--";const x=new Date(d);return`${pad(x.getHours())}:${pad(x.getMinutes())}`};
const fDateF=d=>{const x=new Date(d);return`${DAYSF[x.getDay()]}, ${x.getDate()}. ${MOF[x.getMonth()]}`};
const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const todayS=()=>new Date().toISOString().split("T")[0];
const dInM=(y,m)=>new Date(y,m+1,0).getDate();
const fDow=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1};

const wx={
  async get(la,lo){try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code,precipitation&timezone=auto`);return r.ok?await r.json():null}catch{return null}},
  icon(c){if(c==null)return"";if(c===0)return"☀️";if(c<=3)return"⛅";if(c<=48)return"🌫️";if(c<=67)return"🌧️";if(c<=86)return"🌨️";return"⛈️"},
  extra(c){if(!c)return 0;if(c>=51&&c<=67)return 2;if(c>=71&&c<=86)return 3;return 0},
};

const S={
  async get(k,fb){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb}catch{return fb}},
  async set(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch{}},
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPANION UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const useTheme = () => { /* accessed via global */ return _theme; };
let _theme = mkTheme("peach");

// Soft card
const Card = ({ children, style, onClick, pad: p = 20 }) => {
  const t = _theme;
  return <div onClick={onClick} style={{ background: t.card, borderRadius: R.xl, padding: p,
    border: `1px solid ${t.borderSoft}`, transition: "all 0.2s", cursor: onClick ? "pointer" : "default",
    ...style }}>{children}</div>;
};

// Pill button
const Pill = ({ children, onClick, primary, small, icon, disabled, style }) => {
  const t = _theme;
  return <button onClick={onClick} disabled={disabled} style={{
    display: "inline-flex", alignItems: "center", gap: 8,
    padding: small ? "8px 16px" : "12px 24px",
    borderRadius: R.pill, border: primary ? "none" : `1.5px solid ${t.border}`,
    background: disabled ? t.bgWarm : primary ? t.accent : t.card,
    color: disabled ? t.textMuted : primary ? "#fff" : t.text,
    fontSize: small ? 13 : 15, fontWeight: 600, fontFamily: FONT,
    cursor: disabled ? "default" : "pointer", transition: "all 0.2s",
    minHeight: small ? 36 : 48, ...style,
  }}>{icon && <span style={{ fontSize: small ? 14 : 18 }}>{icon}</span>}{children}</button>;
};

// Chat bubble
const Bubble = ({ children, from = "bot", style }) => {
  const t = _theme;
  const isBot = from === "bot";
  return <div style={{
    maxWidth: "85%", padding: "14px 18px", borderRadius: 20,
    borderBottomLeftRadius: isBot ? 6 : 20, borderBottomRightRadius: isBot ? 20 : 6,
    background: isBot ? t.card : t.accentSoft, color: t.text,
    alignSelf: isBot ? "flex-start" : "flex-end",
    fontSize: 15, lineHeight: "22px", fontFamily: FONT,
    border: isBot ? `1px solid ${t.borderSoft}` : "none",
    ...style,
  }}>{children}</div>;
};

// Input
const Input = ({ value, onChange, placeholder, type, icon, onSubmit, style }) => {
  const t = _theme;
  return <div style={{ display: "flex", alignItems: "center", gap: 10,
    padding: "0 16px", borderRadius: R.lg, border: `1.5px solid ${t.border}`,
    background: t.card, minHeight: 52, ...style }}>
    {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
    <input value={value} onChange={onChange} placeholder={placeholder} type={type || "text"}
      onKeyDown={e => e.key === "Enter" && onSubmit?.()}
      style={{ flex: 1, border: "none", outline: "none", background: "transparent",
        color: t.text, fontSize: 15, fontFamily: FONT, padding: "14px 0" }} />
  </div>;
};

// Bottom nav
const Nav = ({ active, onChange }) => {
  const t = _theme;
  const items = [
    { id: "home", emoji: "🏠", l: "Heute" },
    { id: "cal", emoji: "📅", l: "Kalender" },
    { id: "live", emoji: "🚌", l: "Live" },
    { id: "cfg", emoji: "⚙️", l: "Setup" },
  ];
  return <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
    display: "flex", background: t.card, borderTop: `1px solid ${t.borderSoft}`,
    padding: "6px 0 10px", justifyContent: "space-around" }}>
    {items.map(i => (
      <button key={i.id} onClick={() => onChange(i.id)} style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        background: "none", border: "none", cursor: "pointer", padding: "6px 16px",
        minWidth: 56,
      }}>
        <div style={{ width: 56, height: 28, borderRadius: R.pill, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: active === i.id ? t.accentSoft : "transparent", transition: "all 0.3s" }}>
          <span style={{ fontSize: 18 }}>{i.emoji}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: active === i.id ? 700 : 500,
          color: active === i.id ? t.accentBold : t.textMuted, fontFamily: FONT }}>{i.l}</span>
      </button>
    ))}
  </nav>;
};

// Stop search (with GPS)
const StopPicker = ({ value, onSelect, placeholder, autoGPS }) => {
  const t = _theme;
  const [q, setQ] = useState(value || "");
  const [res, setRes] = useState([]);
  const [ld, setLd] = useState(false);
  const [gpsing, setGpsing] = useState(false);
  const tm = useRef(null);

  // Auto-GPS on mount
  useEffect(() => {
    if (autoGPS && !value) doGPS();
  }, []);

  const search = async (v) => {
    if (v.length < 2) { setRes([]); return; }
    setLd(true); setRes(await Transit.searchStops(v)); setLd(false);
  };
  const chg = e => { setQ(e.target.value); clearTimeout(tm.current);
    tm.current = setTimeout(() => search(e.target.value), 350); };
  const doGPS = async () => {
    setGpsing(true);
    try {
      const pos = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, { enableHighAccuracy: true, timeout: 10000 }));
      const stops = await Transit.nearby(pos.coords.latitude, pos.coords.longitude);
      if (stops.length) {
        setRes(stops);
        // Auto-select nearest
        if (autoGPS && stops[0]) {
          onSelect({ name: stops[0].name, id: stops[0].id, location: stops[0].location });
          setQ(stops[0].name);
          setRes([]);
        }
      }
    } catch {}
    setGpsing(false);
  };

  return <div style={{ position: "relative" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px",
      borderRadius: R.lg, border: `1.5px solid ${t.border}`, background: t.card, minHeight: 52 }}>
      <span style={{ fontSize: 18 }}>📍</span>
      <input value={q} onChange={chg} placeholder={placeholder || "Haltestelle oder Ort..."}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent",
          color: t.text, fontSize: 15, fontFamily: FONT, padding: "14px 0" }} />
      {ld && <span>⏳</span>}
      <button onClick={doGPS} style={{ background: gpsing ? t.accentSoft : "none", border: "none",
        cursor: "pointer", padding: "8px", borderRadius: R.pill, fontSize: 18,
        transition: "all 0.2s" }}>
        {gpsing ? "📡" : "📍"}
      </button>
    </div>
    {res.length > 0 && <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
      background: t.card, borderRadius: R.lg, border: `1px solid ${t.border}`,
      boxShadow: t.shadowHover, zIndex: 50, maxHeight: 220, overflowY: "auto", padding: "6px 0" }}>
      {res.map(s => (
        <button key={s.id} onClick={() => { onSelect({ name: s.name, id: s.id, location: s.location });
          setQ(s.name); setRes([]); }}
          style={{ display: "flex", alignItems: "center", gap: 14, width: "100%",
            padding: "12px 16px", border: "none", background: "transparent",
            cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: 16 }}>🚏</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>{s.name}</div>
            {s.distance != null && <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
              {s.distance}m entfernt</div>}
          </div>
        </button>
      ))}
    </div>}
  </div>;
};

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONAL TRIP ASSISTANT 🗣️
// ═══════════════════════════════════════════════════════════════════════════

const STEPS = ["greet", "where", "when", "stay_or_more", "more_dest", "return", "confirm"];

const Assistant = ({ userName, onComplete, onClose, homeStop }) => {
  const t = _theme;
  const [step, setStep] = useState("greet");
  const [msgs, setMsgs] = useState([]);
  const [destinations, setDests] = useState([]);
  const [currentDest, setCurDest] = useState({ name: "", stopId: null, time: "", dur: 0 });
  const [wantReturn, setWantReturn] = useState(null);
  const [title, setTitle] = useState("");
  const scrollRef = useRef(null);

  const addMsg = (from, content, buttons) => {
    setMsgs(p => [...p, { id: uid(), from, content, buttons, ts: Date.now() }]);
  };

  useEffect(() => {
    setTimeout(() => {
      addMsg("bot", `Hi ${userName || "du"}! 👋 Wo musst du hin?`);
      setStep("where");
    }, 400);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const handleSelectStop = (stop) => {
    setCurDest(d => ({ ...d, name: stop.name, stopId: stop.id, location: stop.location }));
    addMsg("user", `📍 ${stop.name}`);
    setTimeout(() => {
      addMsg("bot", "Alles klar! Wann musst du da sein? ⏰");
      setStep("when");
    }, 300);
  };

  const handleSetTime = (time) => {
    setCurDest(d => ({ ...d, time }));
    addMsg("user", `⏰ ${time}`);
    setTimeout(() => {
      addMsg("bot", `Gut, ${time} bei ${currentDest.name}! Was machst du dort?`, [
        { label: "⏱ Aufenthaltsdauer angeben", action: "stay" },
        { label: "📌 Weiteren Termin hinzufügen", action: "more" },
      ]);
      setStep("stay_or_more");
    }, 300);
  };

  const handleStayOrMore = (action) => {
    if (action === "stay") {
      addMsg("user", "Aufenthaltsdauer angeben");
      setTimeout(() => {
        addMsg("bot", "Wie lange wirst du voraussichtlich dort bleiben?", [
          { label: "15 Min", action: "dur_15" }, { label: "30 Min", action: "dur_30" },
          { label: "45 Min", action: "dur_45" }, { label: "1 Stunde", action: "dur_60" },
          { label: "Andere Dauer", action: "dur_custom" },
        ]);
        setStep("stay_input");
      }, 200);
    } else {
      // Save current dest without duration, ask for next
      const dest = { ...currentDest };
      setDests(p => [...p, dest]);
      setCurDest({ name: "", stopId: null, time: "", dur: 0 });
      addMsg("user", "Weiteren Termin hinzufügen");
      setTimeout(() => {
        addMsg("bot", "Okay! Wo geht's als nächstes hin? 🗺️");
        setStep("where");
      }, 200);
    }
  };

  const handleDuration = (mins) => {
    if (typeof mins === "string") {
      const n = parseInt(mins);
      if (isNaN(n) || n <= 0) return;
      mins = n;
    }
    const dest = { ...currentDest, dur: mins };
    setDests(p => [...p, dest]);
    setCurDest({ name: "", stopId: null, time: "", dur: 0 });
    addMsg("user", `⏱ ${mins} Minuten`);
    setTimeout(() => {
      addMsg("bot", `Perfekt! ${mins} Min bei ${dest.name}. Noch was?`, [
        { label: "📌 Noch ein Ziel", action: "another" },
        { label: "🏠 Danach zurück", action: "return_yes" },
        { label: "✅ Das war's", action: "done" },
      ]);
      setStep("more_or_done");
    }, 300);
  };

  const handleMoreOrDone = (action) => {
    if (action === "another") {
      addMsg("user", "Noch ein Ziel");
      setTimeout(() => { addMsg("bot", "Wo geht's weiter hin? 🗺️"); setStep("where"); }, 200);
    } else if (action === "return_yes") {
      setWantReturn(true);
      addMsg("user", "Danach zurück 🏠");
      finalize(true);
    } else {
      addMsg("user", "Das war's ✅");
      setTimeout(() => {
        addMsg("bot", "Willst du danach auch wieder zurück nach Hause?", [
          { label: "🏠 Ja, zurück", action: "ret_yes" },
          { label: "Nein, bleibe dort", action: "ret_no" },
        ]);
        setStep("return");
      }, 200);
    }
  };

  const handleReturn = (yes) => {
    setWantReturn(yes);
    addMsg("user", yes ? "Ja, zurück 🏠" : "Nein");
    finalize(yes);
  };

  const finalize = (withReturn) => {
    const allDests = [...destinations];
    // Add last currentDest if not empty
    if (currentDest.name && currentDest.stopId) {
      allDests.push({ ...currentDest });
    }
    const stops = [
      { id: uid(), name: homeStop?.name || "📍 Standort", stopId: homeStop?.id || null,
        time: "", dur: 0, type: "start", fixedArr: false, location: homeStop?.location },
      ...allDests.map(d => ({
        id: uid(), name: d.name, stopId: d.stopId, time: d.time,
        dur: d.dur || 0, type: "waypoint", fixedArr: !!d.time, location: d.location,
      })),
    ];
    if (withReturn) {
      stops.push({ id: uid(), name: homeStop?.name || "📍 Zurück", stopId: homeStop?.id || null,
        time: "", dur: 0, type: "end", fixedArr: false, location: homeStop?.location });
    }
    // Generate title
    const autoTitle = allDests.map(d => d.name.replace(/^[^\w]*/, "").split(/\s/)[0]).join(" → ");
    setTimeout(() => {
      addMsg("bot", `Super! Ich berechne die Route für "${autoTitle}"… 🚌✨`);
      setTimeout(() => {
        onComplete({
          id: uid(), title: autoTitle || "Trip",
          date: todayS(), stops,
          recurrence: null, createdAt: new Date().toISOString(),
        });
      }, 800);
    }, 300);
  };

  // Custom duration input state
  const [customDur, setCustomDur] = useState("");
  const [timeInput, setTimeInput] = useState("");

  return <div style={{ position: "fixed", inset: 0, zIndex: 300, background: t.bg,
    display: "flex", flexDirection: "column", fontFamily: FONT }}>
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px",
      borderBottom: `1px solid ${t.borderSoft}` }}>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
        fontSize: 22, padding: 4 }}>←</button>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>Neuer Trip ✨</div>
        <div style={{ fontSize: 12, color: t.textMuted }}>CatchIt plant für dich</div>
      </div>
    </div>

    {/* Chat area */}
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex",
      flexDirection: "column", gap: 12 }}>
      {msgs.map(msg => (
        <div key={msg.id}>
          <Bubble from={msg.from}>{msg.content}</Bubble>
          {msg.buttons && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap",
              marginTop: 8, paddingLeft: msg.from === "bot" ? 0 : undefined,
              justifyContent: msg.from === "bot" ? "flex-start" : "flex-end" }}>
              {msg.buttons.map((b, i) => (
                <Pill key={i} small onClick={() => {
                  // Route to handler based on step
                  if (step === "stay_or_more") handleStayOrMore(b.action);
                  else if (step === "stay_input") {
                    if (b.action === "dur_custom") setStep("dur_custom");
                    else handleDuration(parseInt(b.action.replace("dur_", "")));
                  }
                  else if (step === "more_or_done") handleMoreOrDone(b.action);
                  else if (step === "return") handleReturn(b.action === "ret_yes");
                }} icon={b.label.match(/^[^\w\s]/)?.[0]}>{b.label.replace(/^[^\w\s]\s?/, "")}</Pill>
              ))}
            </div>
          )}
        </div>
      ))}
      <div ref={scrollRef} />
    </div>

    {/* Input area — context-dependent */}
    <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${t.borderSoft}` }}>
      {step === "where" && (
        <StopPicker placeholder="Wohin? Haltestelle oder Ort..." onSelect={handleSelectStop} />
      )}
      {step === "when" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Input type="time" value={timeInput} onChange={e => setTimeInput(e.target.value)}
            icon="⏰" placeholder="Uhrzeit" style={{ flex: 1 }} />
          <Pill primary onClick={() => { if (timeInput) handleSetTime(timeInput); }}
            disabled={!timeInput}>OK</Pill>
        </div>
      )}
      {step === "dur_custom" && (
        <div style={{ display: "flex", gap: 8 }}>
          <Input type="number" value={customDur} onChange={e => setCustomDur(e.target.value)}
            icon="⏱" placeholder="Minuten" style={{ flex: 1 }}
            onSubmit={() => { if (customDur) handleDuration(customDur); }} />
          <Pill primary onClick={() => { if (customDur) handleDuration(customDur); }}
            disabled={!customDur}>OK</Pill>
        </div>
      )}
      {(step === "stay_or_more" || step === "stay_input" || step === "more_or_done" || step === "return") && (
        <div style={{ textAlign: "center", fontSize: 13, color: t.textMuted, padding: 8 }}>
          Wähle eine Option oben 👆
        </div>
      )}
    </div>
  </div>;
};

// ═══════════════════════════════════════════════════════════════════════════
// GROUP SYNC LIGHT
// ═══════════════════════════════════════════════════════════════════════════

const GroupSync = {
  generateShareLink(trip) {
    // In a real app: generate a unique shareable URL
    // For now: encode trip essentials as base64
    const data = { t: trip.title, d: trip.date,
      s: trip.stops?.map(s => ({ n: s.name, t: s.time })) };
    return `catchit://trip/${btoa(JSON.stringify(data))}`;
  },
  generateShareText(trip, status) {
    const stops = trip.stops?.map(s => s.name).filter(Boolean).join(" → ");
    return `🚌 CatchIt Trip: ${trip.title}\n📅 ${fDateF(trip.date)}\n📍 ${stops}\n${status || "Alles nach Plan ✅"}`;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export default function CatchIt() {
  const [view, setView] = useState("home");
  const [trips, setTrips] = useState([]);
  const [cfg, setCfg] = useState({
    homeStop: null, homeAddr: "", walkTimeMin: 4, bufferMin: 5, checkMin: 15,
    wxExtra: 0, userName: "", themeKey: "peach",
    products: { bus: true, suburban: true, subway: true, tram: true, regional: true, express: false },
    features: { shadowRouter: true, activeMove: true, notifications: true, groupSync: true },
  });
  const [theme, setThemeS] = useState(() => mkTheme("peach"));
  const [trips2legs, setT2L] = useState({});
  const [proEvts, setProEvts] = useState([]);
  const [tier, setTier] = useState("SLEEP");
  const [wxData, setWxData] = useState(null);
  const [showAsst, setShowAsst] = useState(false);
  const [showNLP, setShowNLP] = useState(false);
  const [editTrip, setEditTrip] = useState(null);
  const [showWI, setShowWI] = useState(null);
  const [selDate, setSelDate] = useState(todayS());
  const [cY, setCY] = useState(new Date().getFullYear());
  const [cM, setCM] = useState(new Date().getMonth());
  const [loaded, setLoaded] = useState(false);
  const [deps, setDeps] = useState([]);

  _theme = theme;

  const changeTheme = k => { const nt = mkTheme(k); setThemeS(nt); _theme = nt;
    setCfg(c => ({ ...c, themeKey: k })); };

  // Load
  useEffect(() => {
    const link = document.createElement("link"); link.href = FONT_URL; link.rel = "stylesheet"; document.head.appendChild(link);
    (async () => {
      const d = await S.get("catchit-v4", null);
      if (d) { setTrips(d.trips || []); const c = { ...cfg, ...d.cfg }; setCfg(c);
        if (c.themeKey) changeTheme(c.themeKey); }
      setLoaded(true); Notif.init();
    })();
  }, []);
  useEffect(() => { if (loaded) S.set("catchit-v4", { trips, cfg }); }, [trips, cfg, loaded]);

  // Weather
  useEffect(() => { (async () => { try {
    const pos = await new Promise((ok,no) => navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:8000}));
    const w = await wx.get(pos.coords.latitude, pos.coords.longitude); setWxData(w);
    if(w?.current) { const ex=wx.extra(w.current.weather_code); setCfg(c=>({...c,wxExtra:ex})); }
    // Auto-detect home stop if not set
    if (!cfg.homeStop) {
      const stops = await Transit.nearby(pos.coords.latitude, pos.coords.longitude);
      if (stops[0]) setCfg(c => ({ ...c, homeStop: { name: stops[0].name, id: stops[0].id, location: stops[0].location }, homeAddr: stops[0].name }));
    }
  } catch {} })(); }, []);

  // Poller
  useEffect(() => { if (!loaded) return;
    const u = poller.sub((k, v) => {
      if (k === "legs") setT2L(p => ({ ...p, [v.id]: v.legs }));
      if (k === "tier") setTier(v);
      if (k === "deps") setDeps(v);
    });
    poller.start(trips, cfg); return () => { u(); poller.stop(); };
  }, [loaded]);
  useEffect(() => { if (loaded) poller.restart(trips, cfg); }, [trips, cfg]);

  // Proactive analysis
  useEffect(() => {
    const all = [];
    const dow = new Date().getDay(), td = todayS();
    for (const tr of trips) {
      if (tr.date !== td && !tr.recurrence?.days?.includes(dow)) continue;
      const legs = trips2legs[tr.id];
      if (!legs) continue;
      all.push(...ProBuffer.analyze(tr, legs, cfg));
    }
    setProEvts(all);
    // Notifications
    if (cfg.features.notifications) {
      const crits = all.filter(e => e.sev === "crit");
      for (const c of crits) Notif.send("action", c.title, c.body);
      const infos = all.filter(e => e.type === "depart" && e.sev === "info");
      for (const i of infos) Notif.send("info", i.title, i.body);
    }
  }, [trips2legs, trips, cfg]);

  const saveTrip = tr => {
    setTrips(p => { const i = p.findIndex(t => t.id === tr.id);
      if (i >= 0) { const n = [...p]; n[i] = tr; return n; } return [...p, tr]; });
    setShowAsst(false); setEditTrip(null);
  };
  const delTrip = id => setTrips(p => p.filter(t => t.id !== id));
  const chgMo = d => { let nm=cM+d,ny=cY; if(nm>11){nm=0;ny++} if(nm<0){nm=11;ny--} setCM(nm);setCY(ny); };
  const todayTrips = useMemo(() => { const dow=new Date().getDay();
    return trips.filter(tr=>tr.date===todayS()||tr.recurrence?.days?.includes(dow)); }, [trips]);
  const dateTrips = useMemo(() => { const dow=new Date(selDate).getDay();
    return trips.filter(tr=>tr.date===selDate||tr.recurrence?.days?.includes(dow)); }, [trips, selDate]);

  const t = theme;

  if (!loaded) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
    height: "100vh", background: t.bg, fontFamily: FONT }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🚌</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>CatchIt</div>
      <div style={{ fontSize: 14, color: t.textMuted, marginTop: 4 }}>Wird geladen...</div>
    </div>
  </div>;

  // ═══ RENDER ═══

  return <div style={{ minHeight: "100vh", background: t.bg, fontFamily: FONT,
    color: t.text, maxWidth: 480, margin: "0 auto", paddingBottom: 88 }}>
    <link href={FONT_URL} rel="stylesheet" />

    {/* ═══ HOME / DASHBOARD ═══ */}
    {view === "home" && !showAsst && !showNLP && <>
      <header style={{ padding: "24px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: t.text }}>
              {(() => { const h = new Date().getHours();
                return h < 12 ? "Guten Morgen" : h < 18 ? "Hey" : "Guten Abend"; })()}{cfg.userName ? `, ${cfg.userName}` : ""} 👋
            </div>
            <div style={{ fontSize: 14, color: t.textSoft, marginTop: 4 }}>
              {fDateF(new Date())}
              {wxData?.current && <span> · {wx.icon(wxData.current.weather_code)} {Math.round(wxData.current.temperature_2m)}°C</span>}
            </div>
          </div>
          {tier !== "SLEEP" && <div style={{ padding: "6px 12px", borderRadius: R.pill,
            background: tier === "URGENT" ? t.critSoft : tier === "ACTIVE" ? t.warnSoft : t.info,
            fontSize: 11, fontWeight: 700,
            color: tier === "URGENT" ? t.critText : tier === "ACTIVE" ? t.warnText : t.infoText }}>
            🟢 {tier}
          </div>}
        </div>
      </header>

      {/* Proactive alerts */}
      {proEvts.length > 0 && <div style={{ padding: "0 16px 8px" }}>
        {proEvts.slice(0, 2).map((evt, i) => (
          <Card key={i} style={{
            marginBottom: 10,
            background: evt.sev === "crit" ? t.critSoft : evt.sev === "warn" ? t.warnSoft : t.info,
            border: "none",
            animation: evt.sev === "crit" ? "softpulse 2s ease-in-out infinite" : "none",
          }}>
            <style>{`@keyframes softpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.005)}}`}</style>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28 }}>
                {evt.sev === "crit" ? "🚨" : evt.sev === "warn" ? "⚠️" : "ℹ️"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700,
                  color: evt.sev === "crit" ? t.critText : evt.sev === "warn" ? t.warnText : t.infoText }}>
                  {evt.title}
                </div>
                <div style={{ fontSize: 13, color: evt.sev === "crit" ? t.critText : evt.sev === "warn" ? t.warnText : t.infoText,
                  opacity: 0.8, marginTop: 2 }}>{evt.body}</div>
                {evt.shadow && <div style={{ fontSize: 12, marginTop: 6, fontWeight: 600,
                  color: t.okText }}>
                  💡 {evt.shadow.label}: {evt.shadow.journey?.legs?.find(l=>l.line)?.line?.name} um {fTime(evt.shadow.journey?.legs?.[0]?.departure)}
                </div>}
              </div>
            </div>
            {evt.resched && <div style={{ marginTop: 10 }}>
              <Pill small primary onClick={() => alert(`Würde "${evt.trip?.title}" um ${evt.rMin||15} Min verschieben.`)}>
                🔄 Trip anpassen
              </Pill>
            </div>}
          </Card>
        ))}
      </div>}

      {/* Today's trips */}
      <div style={{ padding: "8px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 12,
          textTransform: "uppercase", letterSpacing: 1 }}>
          Heute{todayTrips.length > 0 ? ` · ${todayTrips.length} Trip${todayTrips.length > 1 ? "s" : ""}` : ""}
        </div>

        {todayTrips.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌤️</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Freier Tag!</div>
            <div style={{ fontSize: 14, color: t.textSoft, marginTop: 4, marginBottom: 16 }}>
              Noch keine Trips geplant. Soll ich dir helfen?
            </div>
            <Pill primary onClick={() => setShowAsst(true)} icon="✨">Neuen Trip planen</Pill>
          </Card>
        ) : todayTrips.map(trip => (
          <Card key={trip.id} style={{ marginBottom: 12 }}>
            {/* Trip header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>
                  {trip.stops?.length > 2 && "🔗 "}{trip.title}
                </div>
                <div style={{ fontSize: 13, color: t.textSoft, marginTop: 2 }}>
                  {trip.stops?.[0]?.time || "?"} – {trip.stops?.[trip.stops.length - 1]?.time || "?"}
                  {trip.recurrence && <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: R.pill,
                    background: t.accentSoft, fontSize: 11, fontWeight: 600, color: t.accentText }}>
                    {trip.recurrence.days.map(d => DAYS[d]).join(", ")}
                  </span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {cfg.features.groupSync && <button onClick={() => {
                  const txt = GroupSync.generateShareText(trip);
                  if (navigator.share) navigator.share({ text: txt }); else navigator.clipboard?.writeText(txt);
                }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 6 }}>📤</button>}
                <button onClick={() => setShowWI(trip)} style={{ background: "none", border: "none",
                  cursor: "pointer", fontSize: 18, padding: 6 }}>🔮</button>
                <button onClick={() => delTrip(trip.id)} style={{ background: "none", border: "none",
                  cursor: "pointer", fontSize: 18, padding: 6 }}>🗑️</button>
              </div>
            </div>

            {/* Timeline */}
            {trip.stops?.map((stop, idx) => {
              const legs = trips2legs[trip.id];
              const leg = legs?.[idx];
              return <div key={stop.id} style={{ display: "flex", gap: 12, marginBottom: 2 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                  <div style={{ width: idx === 0 || idx === trip.stops.length - 1 ? 12 : 8,
                    height: idx === 0 || idx === trip.stops.length - 1 ? 12 : 8,
                    borderRadius: R.pill, background: idx === 0 || idx === trip.stops.length - 1 ? t.accent : t.border,
                    border: `2px solid ${t.accent}`, marginTop: 4, flexShrink: 0 }} />
                  {idx < trip.stops.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 28,
                    background: t.border }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{stop.name || "?"}</span>
                    {stop.time && <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500 }}>{stop.time}</span>}
                  </div>
                  {stop.dur > 0 && <div style={{ fontSize: 12, color: t.textSoft }}>⏱ {stop.dur} Min</div>}

                  {/* Leg info */}
                  {leg?.st === "ok" && <div style={{ marginTop: 6, padding: "8px 12px", borderRadius: R.md,
                    background: leg.cancelled ? t.critSoft : leg.delay > 2 ? t.warnSoft : t.accentSoft }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
                      color: leg.cancelled ? t.critText : leg.delay > 2 ? t.warnText : t.accentText }}>
                      {leg.cancelled ? "❌ Fällt aus" : <>🚌 {leg.line || "Bus"} · {leg.dep} → {leg.arr}
                        {leg.delay > 0 && <span style={{ color: t.crit }}>+{leg.delay}′</span>}</>}
                    </div>
                    {leg.plats?.length > 0 && <div style={{ fontSize: 11, color: t.textSoft, marginTop: 4 }}>
                      🚏 {leg.plats.map(p => `${p.line||""} Steig ${p.plat}`).join(" · ")}
                    </div>}
                    {leg.walkOption?.viable && cfg.features.activeMove && (
                      <div style={{ fontSize: 11, color: t.okText, marginTop: 4, fontWeight: 600 }}>
                        🚶 Alternativ: {leg.walkOption.distKm}km laufen ({leg.walkOption.walkMins} Min)
                      </div>
                    )}
                    {leg.shadows?.length > 0 && cfg.features.shadowRouter && (
                      <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
                        💡 Backup: {leg.shadows[0].label}
                      </div>
                    )}
                    {leg.bufSt === "crit" && <div style={{ fontSize: 11, color: t.critText, marginTop: 4, fontWeight: 700 }}>
                      ⚠️ Nur {leg.buf} Min Puffer!</div>}
                  </div>}
                  {leg?.st === "no-stop" && <div style={{ marginTop: 4, fontSize: 12, color: t.textMuted }}>
                    💡 Haltestelle verknüpfen für Route
                  </div>}
                </div>
              </div>;
            })}
          </Card>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => setShowAsst(true)} style={{
        position: "fixed", bottom: 88, right: 16, zIndex: 100,
        display: "flex", alignItems: "center", gap: 10, padding: "14px 22px",
        borderRadius: R.pill, border: "none", background: t.accent, color: "#fff",
        fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer",
        boxShadow: `0 4px 16px ${t.accent}44`,
      }}>✨ Neuer Trip</button>
    </>}

    {/* ═══ CALENDAR ═══ */}
    {view === "cal" && !showAsst && !showNLP && <>
      <header style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>📅 Kalender</div>
      </header>
      {/* Month */}
      <div style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => chgMo(-1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>←</button>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{MOF[cM]} {cY}</span>
          <button onClick={() => chgMo(1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>→</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0 }}>
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: t.textMuted, padding: "8px 0" }}>{d}</div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 0 }}>
          {(() => { const cells = []; const fd = fDow(cY, cM); const dm = dInM(cY, cM);
            for (let i = 0; i < fd; i++) cells.push(null);
            for (let d = 1; d <= dm; d++) cells.push(d);
            const now = new Date();
            return cells.map((d, i) => {
              const ds = d ? `${cY}-${pad(cM+1)}-${pad(d)}` : "";
              const dow = d ? new Date(ds).getDay() : -1;
              const has = d && trips.some(tr => tr.date === ds || tr.recurrence?.days?.includes(dow));
              const isT = d && now.getFullYear() === cY && now.getMonth() === cM && now.getDate() === d;
              const isS = d && selDate === ds;
              return <button key={i} disabled={!d} onClick={() => d && setSelDate(ds)}
                style={{ aspectRatio: "1", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  borderRadius: R.pill, border: "none", cursor: d ? "pointer" : "default",
                  background: isS ? t.accent : isT ? t.accentSoft : "transparent",
                  color: isS ? "#fff" : isT ? t.accentBold : d ? t.text : "transparent",
                  fontSize: 14, fontWeight: isT || isS ? 700 : 400,
                  position: "relative", minWidth: 44, minHeight: 44, fontFamily: FONT }}>
                {d || ""}
                {has && <div style={{ width: 5, height: 5, borderRadius: 3,
                  background: isS ? "#fff" : t.accent, position: "absolute", bottom: 6 }} />}
              </button>;
            });
          })()}
        </div>
      </div>
      <div style={{ padding: "16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, marginBottom: 12 }}>{fDateF(selDate)}</div>
        {dateTrips.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: t.textMuted, fontSize: 14 }}>
          Keine Trips an diesem Tag</div> : dateTrips.map(tr => (
          <Card key={tr.id} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{tr.title}</div>
            <div style={{ fontSize: 13, color: t.textSoft, marginTop: 4 }}>
              {tr.stops?.map(s => s.name).filter(Boolean).join(" → ")}
            </div>
          </Card>
        ))}
      </div>
      <button onClick={() => setShowAsst(true)} style={{
        position: "fixed", bottom: 88, right: 16, zIndex: 100,
        width: 56, height: 56, borderRadius: R.pill, border: "none",
        background: t.accent, color: "#fff", fontSize: 24, cursor: "pointer",
        boxShadow: `0 4px 16px ${t.accent}44`, display: "flex",
        alignItems: "center", justifyContent: "center" }}>+</button>
    </>}

    {/* ═══ LIVE ═══ */}
    {view === "live" && <>
      <header style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>🚌 ÖPNV Live</div>
        {cfg.homeStop && <div style={{ fontSize: 13, color: t.textSoft, marginTop: 4 }}>
          📍 {cfg.homeStop.name}</div>}
      </header>
      {!cfg.homeStop?.id ? <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚏</div>
        <div style={{ fontSize: 14, color: t.textSoft }}>Deine Haltestelle wird automatisch erkannt oder in Setup festgelegt.</div>
      </div> : <div style={{ padding: "8px 16px 100px" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <Pill small onClick={() => { Transit.departures(cfg.homeStop.id).then(d=>setDeps(d||[])); }} icon="🔄">Aktualisieren</Pill>
        </div>
        {deps.length === 0 ? <div style={{ textAlign: "center", padding: 24, color: t.textMuted }}>⏳ Lade Abfahrten...</div> :
          deps.map((dep, i) => {
            const d = dep._delay, mL = (new Date(dep._actual) - new Date()) / 60000;
            const lIn = Math.round(mL - (cfg.walkTimeMin||4) - (cfg.bufferMin||5));
            return <Card key={i} style={{ marginBottom: 8, padding: 14,
              borderLeft: `4px solid ${dep._cancelled ? t.crit : d > 2 ? t.warn : t.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: t.accentSoft, borderRadius: R.md, padding: "4px 10px",
                    fontSize: 13, fontWeight: 800, color: t.accentBold, minWidth: 44, textAlign: "center" }}>
                    {dep._line}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: dep._cancelled ? t.crit : t.text,
                      textDecoration: dep._cancelled ? "line-through" : "none" }}>→ {dep._dir}</div>
                    {dep._platform && <div style={{ fontSize: 11, color: t.textMuted }}>Steig {dep._platform}</div>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {dep._cancelled ? <span style={{ fontSize: 16, fontWeight: 700, color: t.crit }}>Fällt aus</span> : <>
                    <div style={{ fontSize: 20, fontWeight: 700, color: d > 2 ? t.crit : t.text }}>
                      {d > 0 ? fTime(dep._actual) : fTime(dep._planned)}</div>
                    {d > 0 && <div style={{ fontSize: 11, color: t.crit, textDecoration: "line-through" }}>
                      {fTime(dep._planned)} +{d}′</div>}</>}
                </div>
              </div>
              {!dep._cancelled && lIn > -5 && lIn < 25 && <div style={{ marginTop: 8, padding: "6px 12px",
                borderRadius: R.md, fontSize: 13, fontWeight: 600,
                background: lIn <= 2 ? t.critSoft : lIn <= 8 ? t.warnSoft : t.accentSoft,
                color: lIn <= 2 ? t.critText : lIn <= 8 ? t.warnText : t.accentText }}>
                {lIn <= 0 ? "🏃 Jetzt los!" : `🚶 In ${lIn} Min losgehen`}
              </div>}
            </Card>;
          })}
      </div>}
    </>}

    {/* ═══ SETTINGS ═══ */}
    {view === "cfg" && <>
      <header style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>⚙️ Setup</div>
      </header>
      <div style={{ padding: "8px 16px 100px" }}>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>👤 Dein Name</div>
          <Input value={cfg.userName} onChange={e => setCfg(c => ({ ...c, userName: e.target.value }))}
            placeholder="Wie soll ich dich nennen?" icon="😊" />
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🏠 Heimat-Haltestelle</div>
          <StopPicker value={cfg.homeAddr} placeholder="Deine nächste Bushaltestelle..."
            onSelect={s => setCfg(c => ({ ...c, homeStop: s, homeAddr: s.name }))} />
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>
            Wird auch per GPS automatisch erkannt
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>⏱ Zeitpuffer</div>
          <div style={{ display: "flex", gap: 12 }}>
            {[["🚶 Fußweg", "walkTimeMin"], ["⏳ Puffer", "bufferMin"]].map(([l, k]) => (
              <div key={k} style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: t.textMuted, display: "block", marginBottom: 4 }}>{l} (Min)</label>
                <Input type="number" value={cfg[k]} onChange={e => setCfg(c => ({ ...c, [k]: parseInt(e.target.value) || 0 }))} />
              </div>
            ))}
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🚌 Bevorzugte Verkehrsmittel</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[["bus", "🚌 Bus"], ["tram", "🚊 Tram"], ["suburban", "🚈 S-Bahn"],
              ["subway", "🚇 U-Bahn"], ["regional", "🚆 Regio"], ["express", "🚄 ICE/IC"]].map(([k, l]) => (
              <Pill key={k} small onClick={() => setCfg(c => ({ ...c, products: { ...c.products, [k]: !c.products[k] } }))}
                primary={cfg.products[k]}>{l}</Pill>
            ))}
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🎨 Farbwelt</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(PALETTES).map(([k, v]) => (
              <button key={k} onClick={() => changeTheme(k)}
                style={{ width: 44, height: 44, borderRadius: R.pill, border: "none", cursor: "pointer",
                  background: `hsl(${v.h}, ${v.s}%, 55%)`, position: "relative",
                  outline: cfg.themeKey === k ? `3px solid ${t.text}` : "none", outlineOffset: 3 }}
                title={v.name}>
                {cfg.themeKey === k && <span style={{ position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>✓</span>}
              </button>
            ))}
          </div>
        </Card>
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🧩 Features</div>
          {[["shadowRouter", "💡 Shadow-Router (Backup-Routen)"],
            ["activeMove", "🚶 Active-Move (Laufen statt warten)"],
            ["notifications", "🔔 Push-Benachrichtigungen"],
            ["groupSync", "👥 Gruppen-Sharing"]].map(([k, l]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: `1px solid ${t.borderSoft}` }}>
              <span style={{ fontSize: 14, color: t.text }}>{l}</span>
              <button onClick={() => setCfg(c => ({ ...c, features: { ...c.features, [k]: !c.features[k] } }))}
                style={{ width: 48, height: 28, borderRadius: R.pill, border: "none", cursor: "pointer",
                  background: cfg.features[k] ? t.accent : t.bgWarm, position: "relative", transition: "all 0.2s" }}>
                <div style={{ width: 22, height: 22, borderRadius: R.pill, background: "#fff",
                  position: "absolute", top: 3, left: cfg.features[k] ? 23 : 3, transition: "all 0.2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          ))}
        </Card>
        <Card style={{ background: t.accentSoft, border: "none" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.accentText, marginBottom: 6 }}>🧠 Unter der Haube</div>
          <div style={{ fontSize: 12, color: t.accentText, lineHeight: "18px", opacity: 0.8 }}>
            DB HAFAS + GTFS-RT Enrichment · Shadow-Router · Adaptives Polling ({tier}) · Open-Meteo Wetter ·
            Proaktiver Buffer · NLP Email-Parser · Browser Notifications
          </div>
        </Card>
      </div>
    </>}

    {/* ═══ ASSISTANT ═══ */}
    {showAsst && <Assistant userName={cfg.userName} homeStop={cfg.homeStop}
      onComplete={tr => { saveTrip(tr); setShowAsst(false); }}
      onClose={() => setShowAsst(false)} />}

    {/* ═══ WHAT-IF ═══ */}
    {showWI && <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.3)",
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && setShowWI(null)}>
      <Card style={{ width: "100%", maxWidth: 480, borderRadius: `${R.xl}px ${R.xl}px 0 0`,
        padding: 24, maxHeight: "70vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>🔮 Was wäre wenn...</span>
          <button onClick={() => setShowWI(null)} style={{ background: "none", border: "none",
            cursor: "pointer", fontSize: 22 }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: t.textSoft, marginBottom: 16 }}>
          Simuliere eine Verzögerung und sieh, ob dein Trip noch klappt.
        </p>
        {(() => {
          const [delay, setDelay] = [10]; // simplified for this modal
          const legs = trips2legs[showWI.id];
          const midStops = showWI.stops?.filter((_, i) => i > 0 && i < showWI.stops.length - 1);
          return <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {midStops?.map((s, i) => (
                <Pill key={i} small>{s.name || `Station ${i + 1}`}</Pill>
              ))}
            </div>
            {legs?.some(l => l.buf != null) ? (
              <div style={{ fontSize: 14, color: t.textSoft }}>
                {legs.filter(l => l.buf != null).map((l, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${t.borderSoft}` }}>
                    <span style={{ fontWeight: 600 }}>{l.from} → {l.to}:</span>{" "}
                    <span style={{ color: l.bufSt === "crit" ? t.crit : l.bufSt === "tight" ? t.warn : t.ok,
                      fontWeight: 700 }}>
                      {l.buf} Min Puffer {l.bufSt === "crit" ? "⚠️" : l.bufSt === "tight" ? "😬" : "✅"}
                    </span>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: t.textMuted, fontSize: 14 }}>Keine ÖPNV-Daten für diesen Trip verfügbar.</div>}
          </>;
        })()}
      </Card>
    </div>}

    {/* ═══ NAV ═══ */}
    {!showAsst && !showNLP && <Nav active={view} onChange={setView} />}
  </div>;
}
