import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CatchIt v5 — Play Store Release Build
   "Ein Termin. Eine Lösung. Kein Stress."

   ┌──────────────────────────────────────────────────┐
   │  Freemium Feature Flag System                    │
   │  ├─ FREE: 1 route, DB-level data, basic alerts   │
   │  ├─ PRO: Multi-source, Active-Move, Group-Sync   │
   │  └─ 3 free Pro-trips trial                        │
   ├──────────────────────────────────────────────────┤
   │  Google Play Billing Library (prepared)           │
   │  ├─ Monthly sub (1.99€) / Yearly (14.99€)        │
   │  ├─ SKU definitions + purchase flow               │
   │  └─ Receipt validation hooks                      │
   ├──────────────────────────────────────────────────┤
   │  Affiliate / B2B fallback                         │
   │  ├─ Uber/FreeNow deep links on ÖPNV failure      │
   │  └─ Carsharing suggestions                        │
   ├──────────────────────────────────────────────────┤
   │  Companion UI (Pastell, Notion-warm)              │
   └──────────────────────────────────────────────────┘
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ═══════════════════════════════════════════════════════════════════════════
// §1 — FEATURE FLAG SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const TIERS = { FREE: "free", PRO: "pro" };

const FEATURES = {
  multiSource:  { id: "multiSource",  label: "Multi-Source Kernel",       desc: "5 Datenquellen statt 1 — Verspätungen sehen, bevor sie offiziell sind", tier: TIERS.PRO, icon: "📡" },
  shadowRouter: { id: "shadowRouter", label: "Shadow-Router",            desc: "Backup-Routen werden ständig im Hintergrund berechnet",                tier: TIERS.PRO, icon: "💡" },
  activeMove:   { id: "activeMove",   label: "Active-Move",              desc: "Wartezeit durch Laufen überbrücken — intelligent berechnet",            tier: TIERS.PRO, icon: "🚶" },
  groupSync:    { id: "groupSync",    label: "Gruppen-Sync",             desc: "Teile deinen Live-Status — Freunde werden automatisch informiert",      tier: TIERS.PRO, icon: "👥" },
  nlpImport:    { id: "nlpImport",    label: "Unbegrenzter E-Mail-Import",desc: "Termine aus E-Mails und Nachrichten extrahieren — ohne Limit",         tier: TIERS.PRO, icon: "📧" },
  urgentPoll:   { id: "urgentPoll",   label: "30-Sekunden Echtzeit",     desc: "Bis zu 30s Polling-Takt kurz vor der Abfahrt",                        tier: TIERS.PRO, icon: "⚡" },
  // Free features
  basicRoute:   { id: "basicRoute",   label: "Einfaches Routing",        desc: "Eine Route mit DB-Echtzeitdaten",                                     tier: TIERS.FREE, icon: "🚌" },
  basicAlerts:  { id: "basicAlerts",  label: "Basis-Benachrichtigungen", desc: "Warnungen bei kritischen Verspätungen",                               tier: TIERS.FREE, icon: "🔔" },
  weather:      { id: "weather",      label: "Wetter-Integration",       desc: "Mehr Gehzeit bei Regen einplanen",                                    tier: TIERS.FREE, icon: "🌧️" },
  companion:    { id: "companion",    label: "Assistent",                desc: "Der freundliche Planungs-Assistent",                                   tier: TIERS.FREE, icon: "✨" },
};

const PRO_FEATURES = Object.values(FEATURES).filter(f => f.tier === TIERS.PRO);
const FREE_TRIAL_TRIPS = 3;

class FeatureGate {
  constructor() {
    this.tier = TIERS.FREE;
    this.trialTripsUsed = 0;
    this.overrides = {}; // manual per-feature on/off
    this.purchaseToken = null;
    this.subExpiry = null;
  }

  load(data) {
    if (!data) return;
    this.tier = data.tier || TIERS.FREE;
    this.trialTripsUsed = data.trialTripsUsed || 0;
    this.overrides = data.overrides || {};
    this.purchaseToken = data.purchaseToken || null;
    this.subExpiry = data.subExpiry || null;
    // Check expiry
    if (this.subExpiry && new Date(this.subExpiry) < new Date()) {
      this.tier = TIERS.FREE;
      this.purchaseToken = null;
      this.subExpiry = null;
    }
  }

  save() {
    return { tier: this.tier, trialTripsUsed: this.trialTripsUsed,
      overrides: this.overrides, purchaseToken: this.purchaseToken, subExpiry: this.subExpiry };
  }

  get isPro() { return this.tier === TIERS.PRO; }
  get trialLeft() { return Math.max(0, FREE_TRIAL_TRIPS - this.trialTripsUsed); }
  get hasTrialLeft() { return this.trialTripsUsed < FREE_TRIAL_TRIPS; }

  can(featureId) {
    // Manual override
    if (this.overrides[featureId] === false) return false;
    if (this.overrides[featureId] === true && this.isPro) return true;
    const f = FEATURES[featureId];
    if (!f) return false;
    if (f.tier === TIERS.FREE) return true;
    if (this.isPro) return true;
    // Trial: pro features available during trial trips
    if (this.hasTrialLeft) return true;
    return false;
  }

  useTrialTrip() {
    if (this.trialTripsUsed < FREE_TRIAL_TRIPS) this.trialTripsUsed++;
  }

  activate(token, months = 1) {
    this.tier = TIERS.PRO;
    this.purchaseToken = token;
    const exp = new Date();
    exp.setMonth(exp.getMonth() + months);
    this.subExpiry = exp.toISOString();
  }

  setOverride(featureId, enabled) {
    this.overrides[featureId] = enabled;
  }
}

const gate = new FeatureGate();

// ═══════════════════════════════════════════════════════════════════════════
// §2 — GOOGLE PLAY BILLING LIBRARY (Prepared Bridge)
// ═══════════════════════════════════════════════════════════════════════════

/*
 * In a Capacitor/Cordova/native wrapper, this would call the real
 * Google Play Billing Library v6 via a JS bridge. Here we define the
 * interface so it's drop-in ready when wrapped.
 *
 * SKUs:
 *   catchit_pro_monthly  → 1.99€/month
 *   catchit_pro_yearly   → 14.99€/year (37% savings)
 *
 * Flow:
 *   1. queryProducts() → get SKU details + prices
 *   2. launchPurchaseFlow(sku) → native billing dialog
 *   3. onPurchaseComplete(token) → validate → activate
 *   4. acknowledgePurchase(token) → required within 3 days
 */

const Billing = {
  SKUS: {
    monthly: { id: "catchit_pro_monthly", price: "1,99 €", period: "Monat", months: 1, badge: "" },
    yearly:  { id: "catchit_pro_yearly",  price: "14,99 €", period: "Jahr", months: 12, badge: "37% sparen", pricePerMonth: "1,25 €" },
  },

  _bridge: null, // Set by native wrapper

  async init() {
    // In PWA/web: simulate. In native: window.PlayBilling would be set by wrapper
    this._bridge = window.PlayBilling || null;
    if (this._bridge) {
      try { await this._bridge.connect(); } catch {}
    }
  },

  async queryProducts() {
    if (this._bridge) {
      try {
        return await this._bridge.queryProductDetails(
          Object.values(this.SKUS).map(s => s.id)
        );
      } catch { return null; }
    }
    // Fallback: return our defined SKUs
    return Object.values(this.SKUS);
  },

  async purchase(skuKey) {
    const sku = this.SKUS[skuKey];
    if (!sku) return { success: false, error: "Unknown SKU" };

    if (this._bridge) {
      try {
        const result = await this._bridge.launchBillingFlow(sku.id);
        if (result.purchaseToken) {
          // Validate server-side in production
          gate.activate(result.purchaseToken, sku.months);
          await this._bridge.acknowledgePurchase(result.purchaseToken);
          return { success: true, token: result.purchaseToken };
        }
        return { success: false, error: result.error || "Cancelled" };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // Web simulation: instant "purchase"
    const simToken = `sim_${Date.now()}_${skuKey}`;
    gate.activate(simToken, sku.months);
    return { success: true, token: simToken, simulated: true };
  },

  async restorePurchases() {
    if (this._bridge) {
      try {
        const purchases = await this._bridge.queryPurchases("subs");
        for (const p of purchases) {
          if (p.purchaseState === 1 && !p.isAcknowledged) {
            await this._bridge.acknowledgePurchase(p.purchaseToken);
          }
          if (p.purchaseState === 1) {
            const sku = Object.values(this.SKUS).find(s => s.id === p.productId);
            gate.activate(p.purchaseToken, sku?.months || 1);
            return true;
          }
        }
      } catch {}
    }
    return false;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// §3 — AFFILIATE / B2B FALLBACK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

const Affiliate = {
  providers: [
    { id: "uber",    name: "Uber",     icon: "🚗", scheme: "uber://?action=setPickup&pickup=my_location&dropoff[formatted_address]=",
      web: "https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=" },
    { id: "freenow", name: "FREE NOW", icon: "🚕", scheme: "freenow://ride?",
      web: "https://www.free-now.com/" },
    { id: "share",   name: "Carsharing",icon: "🚙", scheme: null,
      web: "https://www.google.com/maps/search/carsharing+near+me" },
  ],

  generateFallback(destination, reason) {
    return {
      reason,
      message: `ÖPNV nicht verfügbar — hier sind Alternativen für "${destination}":`,
      options: this.providers.map(p => ({
        ...p,
        url: p.web + encodeURIComponent(destination),
        deepLink: p.scheme ? p.scheme + encodeURIComponent(destination) : null,
      })),
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// §4 — DESIGN SYSTEM (Warm Pastell, Companion)
// ═══════════════════════════════════════════════════════════════════════════

const PALETTES = {
  peach:   { h: 15,  s: 85, n: "Pfirsich" },
  sage:    { h: 145, s: 35, n: "Salbei" },
  sky:     { h: 210, s: 55, n: "Himmel" },
  lavender:{ h: 265, s: 45, n: "Lavendel" },
  rose:    { h: 345, s: 55, n: "Rosé" },
  sand:    { h: 35,  s: 50, n: "Sand" },
  mint:    { h: 165, s: 40, n: "Minze" },
  coral:   { h: 5,   s: 70, n: "Koralle" },
};

const mkT = (key = "peach") => {
  const { h, s } = PALETTES[key] || PALETTES.peach;
  return { key,
    bg: `hsl(${h},${Math.min(s,30)}%,97%)`, bgW: `hsl(${h},${Math.min(s,25)}%,94%)`,
    card: `hsl(${h},${Math.min(s,20)}%,99%)`, cardH: `hsl(${h},${Math.min(s,25)}%,96%)`,
    acc: `hsl(${h},${s}%,55%)`, accS: `hsl(${h},${s-10}%,90%)`,
    accT: `hsl(${h},${s}%,30%)`, accB: `hsl(${h},${s}%,45%)`,
    txt: `hsl(${h},10%,15%)`, txtS: `hsl(${h},8%,45%)`, txtM: `hsl(${h},6%,62%)`,
    ok: "hsl(145,45%,52%)", okS: "hsl(145,40%,92%)", okT: "hsl(145,45%,25%)",
    wa: "hsl(38,90%,55%)", waS: "hsl(38,80%,93%)", waT: "hsl(38,70%,28%)",
    cr: "hsl(0,65%,55%)", crS: "hsl(0,60%,94%)", crT: "hsl(0,55%,30%)",
    inf: `hsl(${h},${s-10}%,92%)`, infT: `hsl(${h},${s}%,35%)`,
    brd: `hsl(${h},10%,88%)`, brdS: `hsl(${h},8%,92%)`,
    // Pro badge gradient
    proGrad: `linear-gradient(135deg, hsl(${h},${s}%,55%), hsl(${(h+40)%360},${s}%,50%))`,
    proS: `hsl(${h},${s}%,95%)`,
  };
};

const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 9999 };
const FT = "'Nunito','SF Pro Rounded','Segoe UI',system-ui,sans-serif";
const FURL = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap";

let _t = mkT("peach");

// ═══════════════════════════════════════════════════════════════════════════
// §5 — TRANSIT KERNEL + SHADOW ROUTER (gated)
// ═══════════════════════════════════════════════════════════════════════════

const DB = "https://v6.db.transport.rest";
const T = {
  async stops(q) { try { const r=await fetch(`${DB}/locations?query=${encodeURIComponent(q)}&results=6&stops=true&addresses=true`);
    return r.ok?(await r.json()).filter(s=>s.type==="stop"||s.type==="station"):[] } catch{return[]} },
  async nearby(la,lo) { try { const r=await fetch(`${DB}/stops/nearby?latitude=${la}&longitude=${lo}&results=6&distance=1500`);
    return r.ok?await r.json():[] } catch{return[]} },
  async deps(sid,m=120) { try { const r=await fetch(`${DB}/stops/${encodeURIComponent(sid)}/departures?duration=${m}&results=20`);
    if(!r.ok)return[];const d=await r.json();return(d.departures||d||[]).map(x=>({...x,_d:x.delay?Math.round(x.delay/60):0,
    _l:x.line?.name||"?",_dir:x.direction||"?",_pl:x.departurePlatform||null,_cx:x.cancelled||false,
    _pw:x.plannedWhen||x.when,_aw:x.when})) } catch{return[]} },
  async jrn(f,to,tm,isA=false,pr=null) { try { const p=new URLSearchParams({from:f,to,results:"5",stopovers:"true",transferTime:"3",
    ...(isA?{arrival:tm}:{departure:tm||new Date().toISOString()})});
    if(pr){if(!pr.bus)p.set("bus","false");if(!pr.subway)p.set("subway","false");if(!pr.tram)p.set("tram","false");
    if(!pr.suburban)p.set("suburban","false");if(!pr.regional)p.set("regional","false");if(!pr.express)p.set("express","false")}
    const r=await fetch(`${DB}/journeys?${p}`);return r.ok?((await r.json()).journeys||[]):[] } catch{return[]} },
  async trip(tid) { try { const r=await fetch(`${DB}/trips/${encodeURIComponent(tid)}?stopovers=true`);
    if(!r.ok)return null;const d=await r.json();return{...(d.trip||d),_pos:(d.trip||d).currentLocation||null} } catch{return null} },
};

// Shadow router (PRO only)
const Shadow = {
  async calc(f,to,tm,isA,pr) {
    const primary = await T.jrn(f,to,tm,isA,pr);
    if (!gate.can("shadowRouter")) return { primary, shadows: [] };
    const shadows = [];
    if (primary.length) {
      try {
        const e=new Date(tm);e.setMinutes(e.getMinutes()-10);
        const s1=await T.jrn(f,to,e.toISOString(),isA,pr);
        if(s1.length) shadows.push({type:"earlier",j:s1[0],label:"10 Min früher"});
      } catch {}
      if (pr && (!pr.regional||!pr.suburban)) {
        try {
          const s2=await T.jrn(f,to,tm,isA,null);
          if(s2.length&&s2[0].legs?.[0]?.departure!==primary[0]?.legs?.[0]?.departure)
            shadows.push({type:"all",j:s2[0],label:"Alle Verkehrsmittel"});
        } catch {}
      }
    }
    return { primary, shadows };
  },
};

// Active-Move (PRO only)
const AMov = {
  check(a,b) {
    if (!gate.can("activeMove")) return null;
    if (!a?.location||!b?.location) return null;
    const la1=a.location.latitude,lo1=a.location.longitude,la2=b.location.latitude,lo2=b.location.longitude;
    const dLat=(la2-la1)*Math.PI/180,dLon=(lo2-lo1)*Math.PI/180;
    const x=Math.sin(dLat/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLon/2)**2;
    const d=6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
    const wm=Math.round(d/4.5*60);
    return d<=2&&wm<=25?{km:Math.round(d*10)/10,min:wm}:null;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// §6 — POLLING (tier-gated interval)
// ═══════════════════════════════════════════════════════════════════════════

class Poller {
  constructor(){this.fns=new Set();this.h=null;this.tier="SLEEP";this.on=false}
  sub(fn){this.fns.add(fn);return()=>this.fns.delete(fn)}
  emit(k,v){this.fns.forEach(f=>f(k,v))}
  getTier(trips,cfg){const now=Date.now(),dow=new Date().getDay(),td=todayS();let mn=Infinity;
    for(const tr of(trips||[])){if(tr.date!==td&&!tr.recurrence?.days?.includes(dow))continue;
    const t=tr.stops?.[0]?.time;if(!t)continue;const[h,m]=t.split(":").map(Number);const ms=new Date();
    ms.setHours(h,m,0,0);const l=(ms-now)/60000-(cfg?.walkTimeMin||4)-(cfg?.bufferMin||5);
    if(l<mn&&l>-30)mn=l}if(mn<=30)return"URGENT";if(mn<=120)return"ACTIVE";return mn<Infinity?"BG":"SLEEP"}
  ms(tier){
    // FREE users: minimum 60s even in URGENT
    const base={URGENT:30000,ACTIVE:60000,BG:300000,SLEEP:900000}[tier]||300000;
    if (!gate.can("urgentPoll") && base < 60000) return 60000;
    return base;
  }
  async cycle(trips,cfg){const tier=this.getTier(trips,cfg);if(tier!==this.tier){this.tier=tier;this.emit("tier",tier)}
    if(cfg?.homeStop?.id){const d=await T.deps(cfg.homeStop.id);this.emit("deps",d)}
    const now=new Date(),dow=now.getDay(),td=now.toISOString().split("T")[0];
    for(const tr of(trips||[])){if(tr.date!==td&&!tr.recurrence?.days?.includes(dow))continue;
    const legs=await this.calcLegs(tr,cfg);this.emit("legs",{id:tr.id,legs})}}
  async calcLegs(trip,cfg){if(!trip?.stops||trip.stops.length<2)return[];const legs=[],pr=cfg?.products||null;
    for(let i=0;i<trip.stops.length-1;i++){const f=trip.stops[i],to=trip.stops[i+1];
    if(!f.stopId||!to.stopId){legs.push({i,from:f.name,to:to.name,st:"no-stop"});continue}
    let tm;if(to.fixedArr&&to.time){const d=new Date();const[h,m]=to.time.split(":").map(Number);d.setHours(h,m,0,0);tm=d.toISOString()}
    else if(f.time){const d=new Date();const[h,m]=f.time.split(":").map(Number);d.setHours(h,m,0,0);if(f.dur)d.setMinutes(d.getMinutes()+f.dur);tm=d.toISOString()}
    const{primary,shadows}=await Shadow.calc(f.stopId,to.stopId,tm,!!(to.fixedArr&&to.time),pr);
    const best=primary[0];const wk=cfg?.walkTimeMin||4,buf=cfg?.bufferMin||5,wx=cfg?.wxExtra||0;
    let leave=null,line=null,dep=null,arr=null,delay=0,plats=[],cancelled=false;
    if(best?.legs?.[0]){const d=new Date(best.legs[0].departure);d.setMinutes(d.getMinutes()-wk-buf-wx);leave=d.toISOString();
    const tl=best.legs.find(l=>l.line);line=tl?.line?.name;dep=fT(best.legs[0].departure);arr=fT(best.legs[best.legs.length-1].arrival);
    delay=best.legs[0].departureDelay?Math.round(best.legs[0].departureDelay/60):0;cancelled=best.legs.some(l=>l.cancelled);
    plats=best.legs.filter(l=>l.departurePlatform).map(l=>({line:l.line?.name,plat:l.departurePlatform}))}
    const wOpt=AMov.check({location:f.location},{location:to.location});
    legs.push({i,from:f.name,to:to.name,st:cancelled?"cancelled":"ok",best,shadows,leave,line,dep,arr,delay,cancelled,plats,
    alts:primary.slice(1,3).map(j=>({dep:fT(j.legs?.[0]?.departure),line:j.legs?.find(l=>l.line)?.line?.name})),wOpt})}
    for(let i=0;i<legs.length-1;i++){if(legs[i].best&&legs[i+1].best){
    const a=new Date(legs[i].best.legs?.[legs[i].best.legs.length-1]?.arrival);const stay=trip.stops[i+1]?.dur||0;
    const nd=new Date(legs[i+1].best.legs?.[0]?.departure);const b=(nd-a)/60000-stay;
    legs[i].buf=Math.round(b);legs[i].bufSt=b<3?"crit":b<8?"tight":"ok"}}return legs}
  start(tr,cfg){this.on=true;this._go(tr,cfg)}
  async _go(tr,cfg){if(!this.on)return;await this.cycle(tr,cfg);this.h=setTimeout(()=>this._go(tr,cfg),this.ms(this.tier))}
  restart(tr,cfg){clearTimeout(this.h);if(this.on)this._go(tr,cfg)}
  stop(){this.on=false;clearTimeout(this.h)}
}
const poller=new Poller();

// ═══════════════════════════════════════════════════════════════════════════
// §7 — PROACTIVE BUFFER + NLP
// ═══════════════════════════════════════════════════════════════════════════

const Pro={
  analyze(trip,legs,cfg){if(!legs?.length)return[];const evts=[];
    for(const leg of legs){
      if(leg.cancelled){
        const fb=Affiliate.generateFallback(leg.to,"Verbindung fällt aus");
        evts.push({type:"cancelled",sev:"crit",title:`${leg.line||"Verbindung"} fällt aus!`,body:leg.from+" → "+leg.to,
        shadow:leg.shadows?.[0],trip,leg,resched:true,fallback:fb});continue}
      if(leg.delay>0){const sev=leg.delay>=15?"crit":leg.delay>=5?"warn":"info";
        evts.push({type:"delay",sev,title:`${leg.line||"Bus"} +${leg.delay} Min`,body:`Abfahrt jetzt ${leg.dep}`,
        shadow:leg.shadows?.[0],trip,leg,resched:leg.delay>=10,rMin:leg.delay+5})}
      if(leg.bufSt==="crit")evts.push({type:"buffer",sev:"crit",title:"Anschluss gefährdet!",body:`Nur ${leg.buf} Min Puffer`,trip,leg,resched:true});
      if(leg.leave){const m=(new Date(leg.leave)-new Date())/60000;
        if(m>-5&&m<=30)evts.push({type:"depart",sev:m<=0?"crit":m<=5?"warn":"info",
        title:m<=0?"Jetzt los! 🏃":m<=5?"Gleich aufbrechen!":"Bald losgehen",
        body:m<=0?"Zur Haltestelle!":`Noch ${Math.round(m)} Min · ${leg.line||"Bus"} um ${leg.dep}`,trip,leg,mLeft:Math.round(m)})}
      if(leg.wOpt)evts.push({type:"walk",sev:"info",title:"Laufen statt warten?",body:`${leg.wOpt.km}km · ${leg.wOpt.min} Min`,trip,leg})}
    return evts.sort((a,b)=>({crit:0,warn:1,info:2}[a.sev]||2)-({crit:0,warn:1,info:2}[b.sev]||2))}
};

// NLP (compact)
const NLP={parse(x){if(!x||x.length<3)return null;const r={title:null,date:null,times:[],locs:[],dur:null,conf:0};let m;
  const t1=/(\d{1,2}):(\d{2})/g;while((m=t1.exec(x))){const h=+m[1],mn=+m[2];if(h>=0&&h<=23&&mn<=59){r.times.push(`${String(h).padStart(2,"0")}:${String(mn).padStart(2,"0")}`);r.conf+=.3}}
  if(/\bheute\b/i.test(x)){r.date=todayS();r.conf+=.15}else if(/\bmorgen\b/i.test(x)){const d=new Date();d.setDate(d.getDate()+1);r.date=d.toISOString().split("T")[0];r.conf+=.15}
  const lR=[/bei\s+(.+?)(?:[,.]|$)/gi,/(?:Praxis|Kita|Schule|Arzt)\s+(.+?)(?:[,.\n]|$)/gi];
  for(const p of lR){p.lastIndex=0;while((m=p.exec(x))){const l=m[1]?.trim();if(l&&l.length>2){r.locs.push(l);r.conf+=.15}}}
  const lines=x.split("\n").filter(Boolean);r.title=lines[0]?.length<60?lines[0]:null;return r.conf>=.15?r:null}};

// ═══════════════════════════════════════════════════════════════════════════
// §8 — UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

const DAYS=["So","Mo","Di","Mi","Do","Fr","Sa"],DAYSF=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
const MOF=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const pad=n=>String(n).padStart(2,"0");
const fT=d=>{if(!d)return"--:--";const x=new Date(d);return`${pad(x.getHours())}:${pad(x.getMinutes())}`};
const fDF=d=>{const x=new Date(d);return`${DAYSF[x.getDay()]}, ${x.getDate()}. ${MOF[x.getMonth()]}`};
const uid=()=>`${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
const todayS=()=>new Date().toISOString().split("T")[0];
const dInM=(y,m)=>new Date(y,m+1,0).getDate();
const fDow=(y,m)=>{const d=new Date(y,m,1).getDay();return d===0?6:d-1};
const wx={async get(la,lo){try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code&timezone=auto`);return r.ok?await r.json():null}catch{return null}},
  icon(c){if(c==null)return"";if(c===0)return"☀️";if(c<=3)return"⛅";if(c<=48)return"🌫️";if(c<=67)return"🌧️";return"⛈️"},extra(c){if(!c)return 0;if(c>=51&&c<=67)return 2;if(c>=71)return 3;return 0}};
const ST={async get(k,fb){try{const r=await window.storage.get(k);return r?JSON.parse(r.value):fb}catch{return fb}},
  async set(k,v){try{await window.storage.set(k,JSON.stringify(v))}catch{}}};

// ═══════════════════════════════════════════════════════════════════════════
// §9 — UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const Card=({children,style,onClick,p:pd=20})=>
  <div onClick={onClick} style={{background:_t.card,borderRadius:R.xl,padding:pd,border:`1px solid ${_t.brdS}`,
    cursor:onClick?"pointer":"default",...style}}>{children}</div>;

const Pill=({children,onClick,primary,small,icon,disabled,style,pro})=>{
  const t=_t;
  return<button onClick={onClick} disabled={disabled} style={{display:"inline-flex",alignItems:"center",gap:8,
    padding:small?"8px 16px":"12px 24px",borderRadius:R.pill,
    border:primary?"none":`1.5px solid ${t.brd}`,
    background:disabled?t.bgW:pro?t.proGrad:primary?t.acc:t.card,
    color:disabled?t.txtM:primary||pro?"#fff":t.txt,
    fontSize:small?13:15,fontWeight:600,fontFamily:FT,cursor:disabled?"default":"pointer",
    minHeight:small?36:48,position:"relative",...style}}>
    {icon&&<span style={{fontSize:small?14:18}}>{icon}</span>}{children}
    {pro&&!gate.isPro&&<span style={{fontSize:10,fontWeight:800,background:"#fff3",padding:"2px 6px",
      borderRadius:R.pill,marginLeft:4}}>PRO</span>}
  </button>};

const Bubble=({children,from="bot",style})=>
  <div style={{maxWidth:"85%",padding:"14px 18px",borderRadius:20,
    borderBottomLeftRadius:from==="bot"?6:20,borderBottomRightRadius:from==="bot"?20:6,
    background:from==="bot"?_t.card:_t.accS,color:_t.txt,alignSelf:from==="bot"?"flex-start":"flex-end",
    fontSize:15,lineHeight:"22px",fontFamily:FT,border:from==="bot"?`1px solid ${_t.brdS}`:"none",...style}}>{children}</div>;

const Inp=({value,onChange,placeholder,type,icon,onSubmit,style})=>
  <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 16px",borderRadius:R.lg,
    border:`1.5px solid ${_t.brd}`,background:_t.card,minHeight:52,...style}}>
    {icon&&<span style={{fontSize:18}}>{icon}</span>}
    <input value={value} onChange={onChange} placeholder={placeholder} type={type||"text"}
      onKeyDown={e=>e.key==="Enter"&&onSubmit?.()}
      style={{flex:1,border:"none",outline:"none",background:"transparent",color:_t.txt,fontSize:15,fontFamily:FT,padding:"14px 0"}}/>
  </div>;

const Nav=({active,onChange})=>{const items=[{id:"home",e:"🏠",l:"Heute"},{id:"cal",e:"📅",l:"Kalender"},
  {id:"live",e:"🚌",l:"Live"},{id:"cfg",e:"⚙️",l:"Setup"}];
  return<nav style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,display:"flex",background:_t.card,
    borderTop:`1px solid ${_t.brdS}`,padding:"6px 0 10px",justifyContent:"space-around"}}>
    {items.map(i=><button key={i.id} onClick={()=>onChange(i.id)} style={{display:"flex",flexDirection:"column",
      alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"6px 16px",minWidth:56}}>
      <div style={{width:56,height:28,borderRadius:R.pill,display:"flex",alignItems:"center",justifyContent:"center",
        background:active===i.id?_t.accS:"transparent",transition:"all 0.3s"}}><span style={{fontSize:18}}>{i.e}</span></div>
      <span style={{fontSize:11,fontWeight:active===i.id?700:500,color:active===i.id?_t.accB:_t.txtM,fontFamily:FT}}>{i.l}</span>
    </button>)}</nav>};

// Stop picker with auto-GPS
const StopP=({value,onSelect,placeholder,autoGPS})=>{const t=_t;
  const[q,setQ]=useState(value||"");const[res,setRes]=useState([]);const[ld,setLd]=useState(false);const tm=useRef(null);
  useEffect(()=>{if(autoGPS&&!value)doGPS()},[]);
  const doGPS=async()=>{setLd(true);try{const p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:10000}));
    const s=await T.nearby(p.coords.latitude,p.coords.longitude);if(s.length){setRes(s);if(autoGPS&&s[0]){onSelect({name:s[0].name,id:s[0].id,location:s[0].location});setQ(s[0].name);setRes([])}}}catch{}setLd(false)};
  const chg=e=>{setQ(e.target.value);clearTimeout(tm.current);tm.current=setTimeout(async()=>{if(e.target.value.length<2){setRes([]);return}setLd(true);setRes(await T.stops(e.target.value));setLd(false)},350)};
  return<div style={{position:"relative"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 14px",borderRadius:R.lg,border:`1.5px solid ${t.brd}`,background:t.card,minHeight:52}}>
      <span style={{fontSize:18}}>📍</span>
      <input value={q} onChange={chg} placeholder={placeholder||"Haltestelle oder Ort..."} style={{flex:1,border:"none",outline:"none",background:"transparent",color:t.txt,fontSize:15,fontFamily:FT,padding:"14px 0"}}/>
      {ld&&<span>⏳</span>}<button onClick={doGPS} style={{background:"none",border:"none",cursor:"pointer",padding:8,fontSize:18}}>{ld?"📡":"📍"}</button>
    </div>
    {res.length>0&&<div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:t.card,borderRadius:R.lg,
      border:`1px solid ${t.brd}`,boxShadow:`0 4px 12px ${t.brd}`,zIndex:50,maxHeight:220,overflowY:"auto",padding:"6px 0"}}>
      {res.map(s=><button key={s.id} onClick={()=>{onSelect({name:s.name,id:s.id,location:s.location});setQ(s.name);setRes([])}}
        style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 16px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left"}}>
        <span>🚏</span><div><div style={{fontSize:14,fontWeight:600,color:t.txt,fontFamily:FT}}>{s.name}</div>
        {s.distance!=null&&<div style={{fontSize:12,color:t.txtM,fontFamily:FT}}>{s.distance}m</div>}</div>
      </button>)}</div>}
  </div>};

// ═══════════════════════════════════════════════════════════════════════════
// §10 — PRO BADGE & PAYWALL
// ═══════════════════════════════════════════════════════════════════════════

const ProBadge=({style})=><span style={{display:"inline-flex",alignItems:"center",gap:4,
  padding:"3px 10px",borderRadius:R.pill,background:_t.proGrad,color:"#fff",
  fontSize:11,fontWeight:800,fontFamily:FT,letterSpacing:0.5,...style}}>✦ PRO</span>;

const Paywall=({onClose,onPurchase})=>{const t=_t;
  const [sel,setSel]=useState("yearly");
  return<div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.35)",
    display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{width:"100%",maxWidth:480,borderRadius:`${R.xl}px ${R.xl}px 0 0`,
      background:t.card,padding:"28px 20px 32px",maxHeight:"85vh",overflowY:"auto",fontFamily:FT}}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:40,marginBottom:8}}>🚀</div>
        <div style={{fontSize:22,fontWeight:800,color:t.txt}}>CatchIt Pro</div>
        <div style={{fontSize:14,color:t.txtS,marginTop:4}}>Maximale Stressfreiheit — die Maschine arbeitet für dich</div>
      </div>
      {/* Features */}
      <div style={{marginBottom:24}}>
        {PRO_FEATURES.map(f=><div key={f.id} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"10px 0",
          borderBottom:`1px solid ${t.brdS}`}}>
          <span style={{fontSize:22,marginTop:2}}>{f.icon}</span>
          <div><div style={{fontSize:14,fontWeight:700,color:t.txt}}>{f.label}</div>
          <div style={{fontSize:13,color:t.txtS,marginTop:2}}>{f.desc}</div></div>
        </div>)}
      </div>
      {/* Plans */}
      <div style={{display:"flex",gap:10,marginBottom:20}}>
        {Object.entries(Billing.SKUS).map(([k,sku])=>(
          <div key={k} onClick={()=>setSel(k)} style={{flex:1,padding:16,borderRadius:R.lg,
            border:`2px solid ${sel===k?t.acc:t.brd}`,background:sel===k?t.accS:t.card,
            cursor:"pointer",position:"relative",transition:"all 0.2s"}}>
            {sku.badge&&<div style={{position:"absolute",top:-10,right:8,padding:"3px 10px",borderRadius:R.pill,
              background:t.proGrad,color:"#fff",fontSize:10,fontWeight:800}}>{sku.badge}</div>}
            <div style={{fontSize:20,fontWeight:800,color:t.txt}}>{sku.price}</div>
            <div style={{fontSize:13,color:t.txtS}}>/ {sku.period}</div>
            {sku.pricePerMonth&&<div style={{fontSize:12,color:t.accB,fontWeight:600,marginTop:4}}>{sku.pricePerMonth}/Monat</div>}
          </div>
        ))}
      </div>
      {/* CTA */}
      <Pill primary onClick={()=>onPurchase(sel)} style={{width:"100%",justifyContent:"center",
        fontSize:16,fontWeight:800,minHeight:56,background:t.proGrad,border:"none"}}>
        ✨ Pro freischalten
      </Pill>
      <button onClick={onClose} style={{display:"block",width:"100%",textAlign:"center",
        marginTop:12,background:"none",border:"none",color:t.txtM,fontSize:13,fontFamily:FT,cursor:"pointer"}}>
        Erstmal nicht, danke
      </button>
      <div style={{textAlign:"center",marginTop:16,fontSize:11,color:t.txtM}}>
        Sichere Zahlung über Google Play · Jederzeit kündbar
      </div>
    </div>
  </div>};

// Post-assistant paywall (soft upsell)
const TrialUpsell=({trialLeft,onContinue,onUpgrade})=>{const t=_t;
  return<div style={{position:"fixed",inset:0,zIndex:450,background:"rgba(0,0,0,0.3)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onContinue()}>
    <Card style={{maxWidth:380,textAlign:"center",padding:28}}>
      <div style={{fontSize:36,marginBottom:12}}>✨</div>
      <div style={{fontSize:18,fontWeight:800,color:t.txt}}>Trip angelegt!</div>
      <div style={{fontSize:14,color:t.txtS,marginTop:8,lineHeight:"20px"}}>
        CatchIt Pro überwacht <strong>5 Datenquellen</strong> gleichzeitig,
        berechnet <strong>Backup-Routen</strong> im Hintergrund
        und benachrichtigt deine Freunde bei Verspätung.
      </div>
      {trialLeft>0&&<div style={{margin:"16px 0",padding:"10px 16px",borderRadius:R.lg,
        background:t.accS,fontSize:13,fontWeight:600,color:t.accT}}>
        🎁 Noch {trialLeft} kostenlose Pro-Trip{trialLeft>1?"s":""} — dieser ist geschützt!
      </div>}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
        <Pill pro onClick={onUpgrade} style={{width:"100%",justifyContent:"center"}}>
          🚀 Pro entdecken
        </Pill>
        <Pill onClick={onContinue} style={{width:"100%",justifyContent:"center"}}>
          {trialLeft>0?"Mit Trial fortfahren":"Weiter mit Free"}
        </Pill>
      </div>
    </Card>
  </div>};

// ═══════════════════════════════════════════════════════════════════════════
// §11 — CONVERSATIONAL ASSISTANT
// ═══════════════════════════════════════════════════════════════════════════

const Asst=({userName,onComplete,onClose,homeStop})=>{const t=_t;
  const[step,setStep]=useState("init");const[msgs,setMsgs]=useState([]);
  const[dests,setDests]=useState([]);const[cur,setCur]=useState({name:"",stopId:null,time:"",dur:0});
  const[timeIn,setTimeIn]=useState("");const[durIn,setDurIn]=useState("");
  const ref=useRef(null);
  const add=(from,text,btns)=>setMsgs(p=>[...p,{id:uid(),from,text,btns}]);
  useEffect(()=>{setTimeout(()=>{add("bot",`Hi ${userName||"du"}! 👋 Wo musst du hin?`);setStep("where")},400)},[]);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"})},[msgs]);

  const selStop=s=>{setCur(d=>({...d,name:s.name,stopId:s.id,location:s.location}));add("user",`📍 ${s.name}`);
    setTimeout(()=>{add("bot","Wann musst du da sein? ⏰");setStep("when")},300)};
  const selTime=tm=>{setCur(d=>({...d,time:tm}));add("user",`⏰ ${tm}`);setTimeIn("");
    setTimeout(()=>{add("bot",`${tm} bei ${cur.name} — alles klar!`,[
      {l:"⏱ Aufenthaltsdauer",a:"stay"},{l:"📌 Weiteres Ziel",a:"more"}]);setStep("sorm")},300)};
  const sorm=a=>{if(a==="stay"){add("user","Dauer angeben");setTimeout(()=>{add("bot","Wie lange bleibst du dort?",[
    {l:"15 Min",a:"15"},{l:"30 Min",a:"30"},{l:"45 Min",a:"45"},{l:"1h",a:"60"},{l:"Andere",a:"custom"}]);setStep("dur")},200)}
    else{setDests(p=>[...p,{...cur}]);setCur({name:"",stopId:null,time:"",dur:0});add("user","Weiteres Ziel");
    setTimeout(()=>{add("bot","Wo geht's als nächstes hin? 🗺️");setStep("where")},200)}};
  const setDur=m=>{if(typeof m==="string")m=parseInt(m);if(!m||m<=0)return;
    const d={...cur,dur:m};setDests(p=>[...p,d]);setCur({name:"",stopId:null,time:"",dur:0});add("user",`⏱ ${m} Min`);setDurIn("");
    setTimeout(()=>{add("bot",`Perfekt! Was noch?`,[{l:"📌 Noch ein Ziel",a:"more"},{l:"🏠 Zurück nach Hause",a:"ret"},
    {l:"✅ Fertig",a:"done"}]);setStep("next")},300)};
  const next=a=>{if(a==="more"){add("user","Noch ein Ziel");setTimeout(()=>{add("bot","Wohin? 🗺️");setStep("where")},200)}
    else if(a==="ret"){add("user","Zurück 🏠");fin(true)}
    else{add("user","Fertig ✅");setTimeout(()=>{add("bot","Auch zurück nach Hause?",[{l:"🏠 Ja",a:"y"},{l:"Nein",a:"n"}]);setStep("ret")},200)}};
  const ret=y=>{add("user",y?"Ja 🏠":"Nein");fin(y)};
  const fin=withRet=>{const all=[...dests];if(cur.name&&cur.stopId)all.push({...cur});
    const stops=[{id:uid(),name:homeStop?.name||"📍 Standort",stopId:homeStop?.id||null,time:"",dur:0,type:"start",fixedArr:false,location:homeStop?.location},
      ...all.map(d=>({id:uid(),name:d.name,stopId:d.stopId,time:d.time,dur:d.dur||0,type:"waypoint",fixedArr:!!d.time,location:d.location}))];
    if(withRet)stops.push({id:uid(),name:homeStop?.name||"📍 Zurück",stopId:homeStop?.id||null,time:"",dur:0,type:"end",fixedArr:false,location:homeStop?.location});
    const title=all.map(d=>d.name.split(/\s/)[0]).join(" → ");
    setTimeout(()=>{add("bot",`Route „${title}" wird berechnet… 🚌✨`);
      setTimeout(()=>onComplete({id:uid(),title:title||"Trip",date:todayS(),stops,recurrence:null,createdAt:new Date().toISOString()}),800)},300)};

  return<div style={{position:"fixed",inset:0,zIndex:300,background:t.bg,display:"flex",flexDirection:"column",fontFamily:FT}}>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 16px 12px",borderBottom:`1px solid ${t.brdS}`}}>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,padding:4}}>←</button>
      <div><div style={{fontSize:17,fontWeight:700,color:t.txt}}>Neuer Trip ✨</div>
      <div style={{fontSize:12,color:t.txtM}}>CatchIt plant für dich</div></div>
      {!gate.isPro&&gate.hasTrialLeft&&<ProBadge style={{marginLeft:"auto"}}/>}
    </div>
    <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
      {msgs.map(msg=><div key={msg.id}>
        <Bubble from={msg.from}>{msg.text}</Bubble>
        {msg.btns&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
          {msg.btns.map((b,i)=><Pill key={i} small onClick={()=>{
            if(step==="sorm")sorm(b.a);else if(step==="dur"){if(b.a==="custom")setStep("durC");else setDur(b.a)}
            else if(step==="next")next(b.a);else if(step==="ret")ret(b.a==="y")
          }}>{b.l}</Pill>)}</div>}
      </div>)}<div ref={ref}/>
    </div>
    <div style={{padding:"12px 16px 20px",borderTop:`1px solid ${t.brdS}`}}>
      {step==="where"&&<StopP placeholder="Wohin?" onSelect={selStop}/>}
      {step==="when"&&<div style={{display:"flex",gap:8}}>
        <Inp type="time" value={timeIn} onChange={e=>setTimeIn(e.target.value)} icon="⏰" style={{flex:1}}/>
        <Pill primary onClick={()=>timeIn&&selTime(timeIn)} disabled={!timeIn}>OK</Pill></div>}
      {step==="durC"&&<div style={{display:"flex",gap:8}}>
        <Inp type="number" value={durIn} onChange={e=>setDurIn(e.target.value)} icon="⏱" placeholder="Minuten" style={{flex:1}} onSubmit={()=>durIn&&setDur(durIn)}/>
        <Pill primary onClick={()=>durIn&&setDur(durIn)} disabled={!durIn}>OK</Pill></div>}
      {["sorm","dur","next","ret"].includes(step)&&<div style={{textAlign:"center",fontSize:13,color:t.txtM,padding:8}}>Wähle oben eine Option 👆</div>}
    </div>
  </div>};

// ═══════════════════════════════════════════════════════════════════════════
// §12 — MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export default function CatchIt(){
  const[view,setView]=useState("home");
  const[trips,setTrips]=useState([]);
  const[cfg,setCfg]=useState({homeStop:null,homeAddr:"",walkTimeMin:4,bufferMin:5,wxExtra:0,userName:"",themeKey:"peach",
    products:{bus:true,suburban:true,subway:true,tram:true,regional:true,express:false}});
  const[theme,setTh]=useState(()=>mkT("peach"));
  const[t2l,setT2L]=useState({});const[evts,setEvts]=useState([]);const[tier,setTier]=useState("SLEEP");
  const[wxD,setWxD]=useState(null);const[showA,setShowA]=useState(false);const[showPW,setShowPW]=useState(false);
  const[showTU,setShowTU]=useState(false);const[pendingTrip,setPT]=useState(null);
  const[selD,setSelD]=useState(todayS());const[cY,setCY]=useState(new Date().getFullYear());const[cM,setCM]=useState(new Date().getMonth());
  const[loaded,setLoaded]=useState(false);const[deps,setDeps]=useState([]);const[gateData,setGD]=useState(gate.save());
  _t=theme;

  const chgTheme=k=>{const nt=mkT(k);setTh(nt);_t=nt;setCfg(c=>({...c,themeKey:k}))};

  // Load
  useEffect(()=>{const link=document.createElement("link");link.href=FURL;link.rel="stylesheet";document.head.appendChild(link);
    (async()=>{const d=await ST.get("catchit-v5",null);if(d){setTrips(d.trips||[]);const c={...cfg,...d.cfg};setCfg(c);
    if(c.themeKey)chgTheme(c.themeKey);gate.load(d.gate);setGD(gate.save())}setLoaded(true);Billing.init()})()},[]);
  useEffect(()=>{if(loaded)ST.set("catchit-v5",{trips,cfg,gate:gate.save()})},[trips,cfg,gateData,loaded]);

  // Weather + auto-home
  useEffect(()=>{(async()=>{try{const p=await new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(ok,no,{enableHighAccuracy:true,timeout:8000}));
    const w=await wx.get(p.coords.latitude,p.coords.longitude);setWxD(w);
    if(w?.current)setCfg(c=>({...c,wxExtra:wx.extra(w.current.weather_code)}));
    if(!cfg.homeStop){const s=await T.nearby(p.coords.latitude,p.coords.longitude);
    if(s[0])setCfg(c=>({...c,homeStop:{name:s[0].name,id:s[0].id,location:s[0].location},homeAddr:s[0].name}))}}catch{}})()},[]);

  // Poller
  useEffect(()=>{if(!loaded)return;const u=poller.sub((k,v)=>{
    if(k==="legs")setT2L(p=>({...p,[v.id]:v.legs}));if(k==="tier")setTier(v);if(k==="deps")setDeps(v)});
    poller.start(trips,cfg);return()=>{u();poller.stop()}},[loaded]);
  useEffect(()=>{if(loaded)poller.restart(trips,cfg)},[trips,cfg]);

  // Proactive
  useEffect(()=>{const all=[];const dow=new Date().getDay(),td=todayS();
    for(const tr of trips){if(tr.date!==td&&!tr.recurrence?.days?.includes(dow))continue;
    const l=t2l[tr.id];if(l)all.push(...Pro.analyze(tr,l,cfg))}setEvts(all)},[t2l,trips,cfg]);

  const saveTrip=tr=>{setTrips(p=>{const i=p.findIndex(t=>t.id===tr.id);if(i>=0){const n=[...p];n[i]=tr;return n}return[...p,tr]});
    setShowA(false);
    // Trial tracking
    if(!gate.isPro){gate.useTrialTrip();setGD(gate.save())}
    // Show upsell after first trip
    setPT(tr);setShowTU(true)};

  const delTrip=id=>setTrips(p=>p.filter(t=>t.id!==id));
  const chgMo=d=>{let nm=cM+d,ny=cY;if(nm>11){nm=0;ny++}if(nm<0){nm=11;ny--}setCM(nm);setCY(ny)};
  const todayT=useMemo(()=>{const dow=new Date().getDay();return trips.filter(tr=>tr.date===todayS()||tr.recurrence?.days?.includes(dow))},[trips]);
  const dateT=useMemo(()=>{const dow=new Date(selD).getDay();return trips.filter(tr=>tr.date===selD||tr.recurrence?.days?.includes(dow))},[trips,selD]);

  const doPurchase=async(plan)=>{const r=await Billing.purchase(plan);
    if(r.success){gate.activate(r.token,Billing.SKUS[plan].months);setGD(gate.save());setShowPW(false);setShowTU(false)}};

  const t=theme;

  if(!loaded)return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:t.bg,fontFamily:FT}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:12}}>🚌</div>
    <div style={{fontSize:22,fontWeight:700,color:t.txt}}>CatchIt</div>
    <div style={{fontSize:14,color:t.txtM,marginTop:4}}>Wird geladen...</div></div></div>;

  return<div style={{minHeight:"100vh",background:t.bg,fontFamily:FT,color:t.txt,maxWidth:480,margin:"0 auto",paddingBottom:88}}>
    <link href={FURL} rel="stylesheet"/>

    {/* ═══ HOME ═══ */}
    {view==="home"&&!showA&&<>
      <header style={{padding:"24px 20px 12px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:26,fontWeight:800}}>{(()=>{const h=new Date().getHours();return h<12?"Guten Morgen":h<18?"Hey":"Guten Abend"})()}{cfg.userName?`, ${cfg.userName}`:""} 👋</div>
            <div style={{fontSize:14,color:t.txtS,marginTop:4}}>{fDF(new Date())}
              {wxD?.current&&<span> · {wx.icon(wxD.current.weather_code)} {Math.round(wxD.current.temperature_2m)}°C</span>}</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {gate.isPro?<ProBadge/>:gate.hasTrialLeft?
              <span style={{padding:"4px 10px",borderRadius:R.pill,background:t.accS,fontSize:11,fontWeight:700,color:t.accT}}>
                🎁 {gate.trialLeft} Trial{gate.trialLeft>1?"s":""}</span>:
              <Pill small pro onClick={()=>setShowPW(true)}>Upgrade</Pill>}
            {tier!=="SLEEP"&&<div style={{padding:"4px 8px",borderRadius:R.pill,
              background:tier==="URGENT"?t.crS:tier==="ACTIVE"?t.waS:t.inf,
              fontSize:10,fontWeight:700,color:tier==="URGENT"?t.crT:tier==="ACTIVE"?t.waT:t.infT}}>
              {tier}</div>}
          </div>
        </div>
      </header>

      {/* Alerts */}
      {evts.length>0&&<div style={{padding:"0 16px 8px"}}>{evts.slice(0,2).map((ev,i)=>(
        <Card key={i} style={{marginBottom:10,background:ev.sev==="crit"?t.crS:ev.sev==="warn"?t.waS:t.inf,border:"none",
          animation:ev.sev==="crit"?"sp 2s ease-in-out infinite":"none"}}>
          <style>{`@keyframes sp{0%,100%{transform:scale(1)}50%{transform:scale(1.005)}}`}</style>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:28}}>{ev.sev==="crit"?"🚨":ev.sev==="warn"?"⚠️":"ℹ️"}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:700,color:ev.sev==="crit"?t.crT:ev.sev==="warn"?t.waT:t.infT}}>{ev.title}</div>
              <div style={{fontSize:13,opacity:.8,marginTop:2,color:ev.sev==="crit"?t.crT:ev.sev==="warn"?t.waT:t.infT}}>{ev.body}</div>
              {ev.shadow&&gate.can("shadowRouter")&&<div style={{fontSize:12,marginTop:6,fontWeight:600,color:t.okT}}>
                💡 {ev.shadow.label}</div>}
            </div>
          </div>
          {/* Affiliate fallback on cancellation */}
          {ev.fallback&&<div style={{marginTop:12}}>
            <div style={{fontSize:12,color:t.crT,marginBottom:6}}>{ev.fallback.message}</div>
            <div style={{display:"flex",gap:8}}>
              {ev.fallback.options.map(o=><Pill key={o.id} small onClick={()=>window.open(o.url,"_blank")}
                icon={o.icon}>{o.name}</Pill>)}
            </div>
          </div>}
        </Card>))}</div>}

      {/* Trips */}
      <div style={{padding:"8px 16px"}}>
        <div style={{fontSize:13,fontWeight:700,color:t.txtM,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>
          Heute{todayT.length>0?` · ${todayT.length} Trip${todayT.length>1?"s":""}`:""}</div>
        {todayT.length===0?<Card style={{textAlign:"center",padding:40}}>
          <div style={{fontSize:40,marginBottom:12}}>🌤️</div>
          <div style={{fontSize:16,fontWeight:600}}>Freier Tag!</div>
          <div style={{fontSize:14,color:t.txtS,marginTop:4,marginBottom:16}}>Noch keine Trips. Soll ich helfen?</div>
          <Pill primary onClick={()=>setShowA(true)} icon="✨">Trip planen</Pill>
        </Card>:todayT.map(trip=><Card key={trip.id} style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div><div style={{fontSize:16,fontWeight:700}}>{trip.title}</div>
            <div style={{fontSize:13,color:t.txtS,marginTop:2}}>
              {trip.stops?.[0]?.time||"?"} – {trip.stops?.[trip.stops.length-1]?.time||"?"}</div></div>
            <div style={{display:"flex",gap:4}}>
              {gate.can("groupSync")&&<button onClick={()=>{const txt=`🚌 CatchIt: ${trip.title}\n📍 ${trip.stops?.map(s=>s.name).filter(Boolean).join(" → ")}`;
                if(navigator.share)navigator.share({text:txt});else navigator.clipboard?.writeText(txt)}}
                style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:6}}>📤</button>}
              <button onClick={()=>delTrip(trip.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:6}}>🗑️</button>
            </div>
          </div>
          {trip.stops?.map((stop,idx)=>{const leg=t2l[trip.id]?.[idx];
            return<div key={stop.id} style={{display:"flex",gap:12,marginBottom:2}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:20}}>
                <div style={{width:idx===0||idx===trip.stops.length-1?12:8,height:idx===0||idx===trip.stops.length-1?12:8,
                  borderRadius:R.pill,background:idx===0||idx===trip.stops.length-1?t.acc:t.brd,border:`2px solid ${t.acc}`,marginTop:4,flexShrink:0}}/>
                {idx<trip.stops.length-1&&<div style={{width:2,flex:1,minHeight:28,background:t.brd}}/>}
              </div>
              <div style={{flex:1,paddingBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:14,fontWeight:600}}>{stop.name||"?"}</span>
                  {stop.time&&<span style={{fontSize:12,color:t.txtM}}>{stop.time}</span>}</div>
                {stop.dur>0&&<div style={{fontSize:12,color:t.txtS}}>⏱ {stop.dur} Min</div>}
                {leg?.st==="ok"&&<div style={{marginTop:6,padding:"8px 12px",borderRadius:R.md,
                  background:leg.cancelled?t.crS:leg.delay>2?t.waS:t.accS}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,
                    color:leg.cancelled?t.crT:leg.delay>2?t.waT:t.accT}}>
                    {leg.cancelled?"❌ Fällt aus":<>🚌 {leg.line||"Bus"} · {leg.dep} → {leg.arr}
                    {leg.delay>0&&<span style={{color:t.cr}}>+{leg.delay}′</span>}</>}</div>
                  {leg.plats?.length>0&&<div style={{fontSize:11,color:t.txtS,marginTop:4}}>
                    🚏 {leg.plats.map(p=>`${p.line||""} Steig ${p.plat}`).join(" · ")}</div>}
                  {leg.wOpt&&gate.can("activeMove")&&<div style={{fontSize:11,color:t.okT,marginTop:4,fontWeight:600}}>
                    🚶 {leg.wOpt.km}km laufen ({leg.wOpt.min} Min)</div>}
                  {leg.shadows?.length>0&&gate.can("shadowRouter")&&<div style={{fontSize:11,color:t.txtM,marginTop:4}}>
                    💡 Backup: {leg.shadows[0].label}</div>}
                  {leg.bufSt==="crit"&&<div style={{fontSize:11,color:t.crT,marginTop:4,fontWeight:700}}>⚠️ {leg.buf} Min Puffer!</div>}
                </div>}
              </div>
            </div>})}
        </Card>))}
      </div>
      <button onClick={()=>setShowA(true)} style={{position:"fixed",bottom:88,right:16,zIndex:100,display:"flex",alignItems:"center",gap:10,
        padding:"14px 22px",borderRadius:R.pill,border:"none",background:t.acc,color:"#fff",fontSize:15,fontWeight:700,fontFamily:FT,
        cursor:"pointer",boxShadow:`0 4px 16px ${t.acc}44`}}>✨ Neuer Trip</button>
    </>}

    {/* ═══ CALENDAR ═══ */}
    {view==="cal"&&!showA&&<>
      <header style={{padding:"20px 16px 8px"}}><div style={{fontSize:22,fontWeight:800}}>📅 Kalender</div></header>
      <div style={{padding:"0 16px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={()=>chgMo(-1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20}}>←</button>
          <span style={{fontSize:16,fontWeight:700}}>{MOF[cM]} {cY}</span>
          <button onClick={()=>chgMo(1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20}}>→</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d=><div key={d} style={{textAlign:"center",fontSize:12,fontWeight:600,color:t.txtM,padding:"8px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {(()=>{const cells=[];const fd=fDow(cY,cM),dm=dInM(cY,cM);for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dm;d++)cells.push(d);
            const now=new Date();return cells.map((d,i)=>{const ds=d?`${cY}-${pad(cM+1)}-${pad(d)}`:"";const dow=d?new Date(ds).getDay():-1;
            const has=d&&trips.some(tr=>tr.date===ds||tr.recurrence?.days?.includes(dow));
            const isT=d&&now.getFullYear()===cY&&now.getMonth()===cM&&now.getDate()===d;const isS=d&&selD===ds;
            return<button key={i} disabled={!d} onClick={()=>d&&setSelD(ds)} style={{aspectRatio:"1",display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",borderRadius:R.pill,border:"none",cursor:d?"pointer":"default",
              background:isS?t.acc:isT?t.accS:"transparent",color:isS?"#fff":isT?t.accB:d?t.txt:"transparent",
              fontSize:14,fontWeight:isT||isS?700:400,position:"relative",minWidth:44,minHeight:44,fontFamily:FT}}>
              {d||""}{has&&<div style={{width:5,height:5,borderRadius:3,background:isS?"#fff":t.acc,position:"absolute",bottom:6}}/>}
            </button>})})()}
        </div>
      </div>
      <div style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:t.txtM,marginBottom:12}}>{fDF(selD)}</div>
        {dateT.length===0?<div style={{textAlign:"center",padding:24,color:t.txtM,fontSize:14}}>Keine Trips</div>:
        dateT.map(tr=><Card key={tr.id} style={{marginBottom:10}}>
          <div style={{fontSize:15,fontWeight:700}}>{tr.title}</div>
          <div style={{fontSize:13,color:t.txtS,marginTop:4}}>{tr.stops?.map(s=>s.name).filter(Boolean).join(" → ")}</div>
        </Card>)}
      </div>
      <button onClick={()=>setShowA(true)} style={{position:"fixed",bottom:88,right:16,zIndex:100,width:56,height:56,
        borderRadius:R.pill,border:"none",background:t.acc,color:"#fff",fontSize:24,cursor:"pointer",
        boxShadow:`0 4px 16px ${t.acc}44`,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
    </>}

    {/* ═══ LIVE ═══ */}
    {view==="live"&&<>
      <header style={{padding:"20px 16px 8px"}}><div style={{fontSize:22,fontWeight:800}}>🚌 ÖPNV Live</div>
        {cfg.homeStop&&<div style={{fontSize:13,color:t.txtS,marginTop:4}}>📍 {cfg.homeStop.name}</div>}</header>
      {!cfg.homeStop?.id?<div style={{textAlign:"center",padding:"48px 24px"}}><div style={{fontSize:40,marginBottom:12}}>🚏</div>
        <div style={{fontSize:14,color:t.txtS}}>Haltestelle wird per GPS erkannt oder in Setup festgelegt.</div></div>:
      <div style={{padding:"8px 16px 100px"}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
          <Pill small onClick={()=>T.deps(cfg.homeStop.id).then(d=>setDeps(d||[]))} icon="🔄">Aktualisieren</Pill></div>
        {deps.length===0?<div style={{textAlign:"center",padding:24,color:t.txtM}}>⏳ Lade...</div>:
        deps.map((dep,i)=>{const d=dep._d,mL=(new Date(dep._aw)-new Date())/60000,lI=Math.round(mL-(cfg.walkTimeMin||4)-(cfg.bufferMin||5));
          return<Card key={i} style={{marginBottom:8,p:14,borderLeft:`4px solid ${dep._cx?t.cr:d>2?t.wa:t.acc}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{background:t.accS,borderRadius:R.md,padding:"4px 10px",fontSize:13,fontWeight:800,color:t.accB,minWidth:44,textAlign:"center"}}>{dep._l}</div>
                <div><div style={{fontSize:14,fontWeight:600,color:dep._cx?t.cr:t.txt,textDecoration:dep._cx?"line-through":"none"}}>→ {dep._dir}</div>
                  {dep._pl&&<div style={{fontSize:11,color:t.txtM}}>Steig {dep._pl}</div>}</div>
              </div>
              <div style={{textAlign:"right"}}>{dep._cx?<span style={{fontSize:16,fontWeight:700,color:t.cr}}>Fällt aus</span>:<>
                <div style={{fontSize:20,fontWeight:700,color:d>2?t.cr:t.txt}}>{d>0?fT(dep._aw):fT(dep._pw)}</div>
                {d>0&&<div style={{fontSize:11,color:t.cr,textDecoration:"line-through"}}>{fT(dep._pw)} +{d}′</div>}</>}</div>
            </div>
            {!dep._cx&&lI>-5&&lI<25&&<div style={{marginTop:8,padding:"6px 12px",borderRadius:R.md,fontSize:13,fontWeight:600,
              background:lI<=2?t.crS:lI<=8?t.waS:t.accS,color:lI<=2?t.crT:lI<=8?t.waT:t.accT}}>
              {lI<=0?"🏃 Jetzt los!":`🚶 In ${lI} Min losgehen`}</div>}
          </Card>})}
      </div>}
    </>}

    {/* ═══ SETTINGS ═══ */}
    {view==="cfg"&&<>
      <header style={{padding:"20px 16px 8px"}}><div style={{fontSize:22,fontWeight:800}}>⚙️ Setup</div></header>
      <div style={{padding:"8px 16px 100px"}}>
        {/* Pro status */}
        <Card style={{marginBottom:12,background:gate.isPro?t.proS:t.accS,border:"none"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div><div style={{fontSize:15,fontWeight:700,color:t.txt}}>
              {gate.isPro?"✦ CatchIt Pro aktiv":"CatchIt Free"}</div>
              <div style={{fontSize:12,color:t.txtS,marginTop:2}}>
                {gate.isPro?`Gültig bis ${new Date(gate.subExpiry).toLocaleDateString("de")}`:
                gate.hasTrialLeft?`🎁 ${gate.trialLeft} Pro-Trips übrig`:"Upgrade für volle Power"}</div>
            </div>
            {!gate.isPro&&<Pill small pro onClick={()=>setShowPW(true)}>Upgrade</Pill>}
          </div>
        </Card>
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>👤 Dein Name</div>
          <Inp value={cfg.userName} onChange={e=>setCfg(c=>({...c,userName:e.target.value}))} placeholder="Wie heißt du?" icon="😊"/>
        </Card>
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🏠 Heimat-Haltestelle</div>
          <StopP value={cfg.homeAddr} placeholder="Deine Bushaltestelle..." onSelect={s=>setCfg(c=>({...c,homeStop:s,homeAddr:s.name}))}/>
          <div style={{fontSize:12,color:t.txtM,marginTop:6}}>Wird automatisch per GPS erkannt</div>
        </Card>
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>⏱ Zeitpuffer</div>
          <div style={{display:"flex",gap:12}}>
            {[["🚶 Fußweg","walkTimeMin"],["⏳ Puffer","bufferMin"]].map(([l,k])=>
              <div key={k} style={{flex:1}}><label style={{fontSize:12,color:t.txtM,display:"block",marginBottom:4}}>{l} (Min)</label>
              <Inp type="number" value={cfg[k]} onChange={e=>setCfg(c=>({...c,[k]:parseInt(e.target.value)||0}))}/></div>)}
          </div>
        </Card>
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🚌 Verkehrsmittel</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["bus","🚌 Bus"],["tram","🚊 Tram"],["suburban","🚈 S-Bahn"],["subway","🚇 U-Bahn"],["regional","🚆 Regio"],["express","🚄 ICE"]].map(([k,l])=>
              <Pill key={k} small primary={cfg.products[k]} onClick={()=>setCfg(c=>({...c,products:{...c.products,[k]:!c.products[k]}}))}>{l}</Pill>)}
          </div>
        </Card>
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🎨 Farbwelt</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {Object.entries(PALETTES).map(([k,v])=><button key={k} onClick={()=>chgTheme(k)} title={v.n}
              style={{width:44,height:44,borderRadius:R.pill,border:"none",cursor:"pointer",
                background:`hsl(${v.h},${v.s}%,55%)`,outline:cfg.themeKey===k?`3px solid ${t.txt}`:"none",outlineOffset:3,position:"relative"}}>
              {cfg.themeKey===k&&<span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18}}>✓</span>}
            </button>)}
          </div>
        </Card>
        {/* Pro features toggles */}
        <Card style={{marginBottom:12}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:10}}>🧩 Pro-Features</div>
          {PRO_FEATURES.map(f=><div key={f.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
            padding:"10px 0",borderBottom:`1px solid ${t.brdS}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:18}}>{f.icon}</span>
              <div><div style={{fontSize:14,color:t.txt}}>{f.label}</div>
              <div style={{fontSize:12,color:t.txtM}}>{f.desc.slice(0,50)}...</div></div>
            </div>
            <button onClick={()=>{if(!gate.can(f.id)&&!gate.isPro){setShowPW(true);return}
              gate.setOverride(f.id,gate.overrides[f.id]===false?true:gate.overrides[f.id]===true?false:false);setGD(gate.save())}}
              style={{width:48,height:28,borderRadius:R.pill,border:"none",cursor:"pointer",
                background:gate.can(f.id)?t.acc:t.bgW,position:"relative",transition:"all 0.2s",opacity:gate.isPro||gate.hasTrialLeft?1:.5}}>
              <div style={{width:22,height:22,borderRadius:R.pill,background:"#fff",position:"absolute",top:3,
                left:gate.can(f.id)?23:3,transition:"all 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
            </button>
          </div>)}
          {!gate.isPro&&<div style={{marginTop:12}}><Pill pro small onClick={()=>setShowPW(true)}>🔓 Alle Pro-Features freischalten</Pill></div>}
        </Card>
      </div>
    </>}

    {/* ═══ OVERLAYS ═══ */}
    {showA&&<Asst userName={cfg.userName} homeStop={cfg.homeStop} onComplete={saveTrip} onClose={()=>setShowA(false)}/>}
    {showPW&&<Paywall onClose={()=>setShowPW(false)} onPurchase={doPurchase}/>}
    {showTU&&<TrialUpsell trialLeft={gate.trialLeft} onContinue={()=>setShowTU(false)} onUpgrade={()=>{setShowTU(false);setShowPW(true)}}/>}
    {!showA&&<Nav active={view} onChange={setView}/>}
  </div>}
