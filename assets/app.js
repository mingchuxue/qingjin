/* 青衿 · 高考冲刺 */
(() => {
  "use strict";

  const GAOKAO_ISO = "2027-06-07T09:00:00+08:00";
  const STORE_KEY = "qingjin-v1";
  const SUBJECT_IDS = ["chinese","math","english","physics","chemistry","biology","politics","history","geography"];
  const SUBJECT_META = {
    chinese:   { name:"语文",     short:"语", full:150, min:150, kind:"required", color:"#a44b44" },
    math:      { name:"数学",     short:"数", full:150, min:120, kind:"required", color:"#3d6b8a" },
    english:   { name:"英语",     short:"英", full:150, min:120, kind:"required", color:"#3a6e52" },
    physics:   { name:"物理",     short:"物", full:100, min:75,  kind:"first",    color:"#5b4f8a" },
    history:   { name:"历史",     short:"史", full:100, min:75,  kind:"first",    color:"#8a6a30" },
    chemistry: { name:"化学",     short:"化", full:100, min:75,  kind:"second",   color:"#8a5a32" },
    biology:   { name:"生物学",   short:"生", full:100, min:75,  kind:"second",   color:"#2f6b4f" },
    politics:  { name:"思想政治", short:"政", full:100, min:75,  kind:"second",   color:"#8d3c3c" },
    geography: { name:"地理",     short:"地", full:100, min:75,  kind:"second",   color:"#326874" }
  };
  const REASONS = [
    ["concept","概念不清"],["calc","计算失误"],["read","审题失误"],
    ["method","方法不会"],["careless","粗心笔误"],["time","时间不够"],["express","表达不规范"]
  ];
  const TYPES = { single:"单选", multi:"多选", fill:"填空", essay:"解答", write:"写作", recite:"默写" };
  const FREQ = { high:"高频", mid:"中频", base:"基础" };
  const DIFF = { 1:"基础", 2:"中等", 3:"较难", 4:"困难", 5:"压轴" };

  /* ---------- utils ---------- */
  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
  const trusted = (s) => String(s ?? ""); // content we author; may contain KaTeX and <br>
  const pad = (n, w=2) => String(n).padStart(w, "0");
  const todayStr = (d=new Date()) => {
    const y = d.getFullYear(), m = pad(d.getMonth()+1), dd = pad(d.getDate());
    return `${y}-${m}-${dd}`;
  };
  const fmtDate = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };
  const uid = () => "id" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const clamp = (x,a,b) => Math.max(a, Math.min(b,x));
  const sum = (arr) => arr.reduce((a,b) => a+b, 0);
  const byId = (arr) => Object.fromEntries((arr||[]).map(x => [x.id, x]));

  function debounce(fn, ms=200) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  function ic(name, s=18) {
    const p = {
      home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6.5 10.5V20h11v-9.5"/>',
      book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5z"/><path d="M5 21.5A2.5 2.5 0 0 1 7.5 19H19"/>',
      pen: '<path d="M4 20h4L19.5 8.5a2 2 0 0 0 0-2.8L17.3 3.5a2 2 0 0 0-2.8 0L4 14v6z"/><path d="M13.5 4.5l5 5"/>',
      lamp: '<path d="M9 18h6M10 21h4"/><path d="M8 10a4 4 0 1 1 8 0c0 2.5-2 3.5-2 6h-4c0-2.5-2-3.5-2-6z"/>',
      exam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
      wrong: '<circle cx="12" cy="12" r="8"/><path d="M9 9l6 6M15 9l-6 6"/>',
      review: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>',
      chart: '<path d="M4 20h16"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
      plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      formula: '<path d="M6 5h12M12 5v14M8 19h8"/>',
      poetry: '<path d="M6 4h10v16H6z"/><path d="M16 7h3v10h-3"/><path d="M9 8h4M9 12h4"/>',
      word: '<path d="M5 17 8 7h2l3 10"/><path d="M6.2 14h5.6M16 7v10h3"/>',
      write: '<path d="M5 19h14"/><path d="M7 15.5 16.5 6a1.5 1.5 0 0 1 2 2L9 17.5H7v-2z"/>',
      star: '<path d="M12 3.5 14.4 9l5.6.6-4.2 3.8 1.2 5.6L12 16.6 7 19l1.2-5.6L4 9.6 9.6 9z"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.2M12 18.8V21M4.9 6.5l1.6 1.6M17.5 17.9l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.5l1.6-1.6M17.5 6.1l1.6-1.6"/>',
      search: '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
      menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
      bell: '<path d="M6 16h12l-1-2v-3a5 5 0 0 0-10 0v3z"/><path d="M10 16a2 2 0 0 0 4 0"/>',
      close: '<path d="M7 7l10 10M17 7 7 17"/>',
      back: '<path d="M14 6 8 12l6 6"/>',
      check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
      play: '<path d="M9 6.5v11l9-5.5z"/>',
      pause: '<path d="M8 6h3v12H8zM13 6h3v12h-3z"/>',
      speaker: '<path d="M4 10v4h3l5 4V6L7 10H4z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/>',
      share: '<circle cx="6" cy="12" r="2.2"/><circle cx="17" cy="6.5" r="2.2"/><circle cx="17" cy="17.5" r="2.2"/><path d="M8 11.2 15 7.4M8 12.8l7 4.8"/>',
      download: '<path d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14"/>',
      upload: '<path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14"/>',
      clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/>',
      fire: '<path d="M12 21c4 0 6-2.6 6-6 0-4-3-6-3-9 0 0-2 2-2 4-1-3-2.2-5-5-7 0 3-2 5.5-2 9 0 3.4 2 6 6 6z"/>',
      heart: '<path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"/>',
      more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>'
    };
    return `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p[name]||""}</svg>`;
  }

  /* ---------- store ---------- */
  function defaultState() {
    return {
      version: 1,
      profile: {
        name: "", province: "", mode: "3+1+2",
        firstChoice: "physics", secondChoices: ["chemistry","biology"],
        targetScore: 600, targetBySubject: {},
        theme: "light", fontSize: "md", onboarded: false
      },
      checkins: {},
      pomodoro: { logs: [], goalMin: 90 },
      plan: { custom: [], checked: {} },
      mastery: {},
      sm2: {},
      wrong: [],
      favorites: { knowledge: [], questions: [], methods: [], poetry: [], writing: [] },
      notes: {},
      viewed: {},
      practiceLog: [],
      examLog: [],
      mockScores: [],
      settings: { autoAdvance: false, showTimer: true, density: "comfortable" }
    };
  }

  let state = defaultState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      state = Object.assign(defaultState(), s);
      state.profile = Object.assign(defaultState().profile, s.profile||{});
      state.favorites = Object.assign(defaultState().favorites, s.favorites||{});
      state.settings = Object.assign(defaultState().settings, s.settings||{});
    } catch (e) { console.warn("load state failed", e); }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast("本地存储已满，请先导出并清理数据"); }
  }
  const save = debounce(saveState, 80);

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: state }, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qingjin-backup-${todayStr()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(obj) {
    const src = obj.data || obj;
    if (!src || typeof src !== "object") throw new Error("文件格式无法识别");
    state = Object.assign(defaultState(), src);
    state.profile = Object.assign(defaultState().profile, src.profile||{});
    state.favorites = Object.assign(defaultState().favorites, src.favorites||{});
    saveState();
    applyTheme();
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    document.documentElement.dataset.theme = state.profile.theme === "eyecare" ? "eyecare" : "light";
    document.documentElement.dataset.size = state.profile.fontSize || "md";
    const c = state.profile.theme === "eyecare" ? "#e8eddf" : "#F5F2EA";
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", c);
  }

  /* ---------- selected subjects ---------- */
  function selectedSubjects() {
    const p = state.profile;
    const out = ["chinese","math","english"];
    if (p.mode === "3+3") {
      (p.secondChoices || []).forEach(s => { if (!out.includes(s)) out.push(s); });
      // 3+3 uses secondChoices as the 3 picks (we reuse the field)
    } else {
      if (p.firstChoice) out.push(p.firstChoice);
      (p.secondChoices||[]).forEach(s => { if (!out.includes(s)) out.push(s); });
    }
    return out.filter(s => SUBJECT_META[s]);
  }
  function isSelected(id) { return selectedSubjects().includes(id); }

  /* ---------- data ---------- */
  const DATA = {
    knowledge: {}, questions: {}, methods: {},
    exams: [], formulas: {}, poetry: [], words: [], writing: [],
    ready: false,
    kpIndex: {}, qIndex: {}, mIndex: {},
    meta: null
  };

  async function fetchJSON(path) {
    const r = await fetch(path, { cache: "default" });
    if (!r.ok) throw new Error(path + " " + r.status);
    return r.json();
  }
  async function loadData() {
    const jobs = [fetchJSON("data/meta.json").catch(() => null)];
    for (const s of SUBJECT_IDS) {
      jobs.push(fetchJSON(`data/knowledge/${s}.json`).then(d => (DATA.knowledge[s]=d)).catch(() => (DATA.knowledge[s]=[])));
      jobs.push(fetchJSON(`data/questions/${s}.json`).then(d => (DATA.questions[s]=d)).catch(() => (DATA.questions[s]=[])));
      jobs.push(fetchJSON(`data/methods/${s}.json`).then(d => (DATA.methods[s]=d)).catch(() => (DATA.methods[s]=[])));
    }
    jobs.push(fetchJSON("data/exams.json").then(d => (DATA.exams=d)).catch(() => (DATA.exams=[])));
    jobs.push(fetchJSON("data/formulas.json").then(d => (DATA.formulas=d)).catch(() => (DATA.formulas={})));
    jobs.push(fetchJSON("data/poetry.json").then(d => (DATA.poetry=d)).catch(() => (DATA.poetry=[])));
    jobs.push(fetchJSON("data/words.json").then(d => (DATA.words=d)).catch(() => (DATA.words=[])));
    jobs.push(fetchJSON("data/writing.json").then(d => (DATA.writing=d)).catch(() => (DATA.writing=[])));
    const res = await Promise.all(jobs);
    DATA.meta = res[0];
    for (const s of SUBJECT_IDS) {
      for (const k of DATA.knowledge[s]||[]) DATA.kpIndex[k.id] = k;
      for (const q of DATA.questions[s]||[]) DATA.qIndex[q.id] = q;
      for (const m of DATA.methods[s]||[]) DATA.mIndex[m.id] = m;
    }
    DATA.ready = true;
  }
  const allKnowledge = () => SUBJECT_IDS.flatMap(s => DATA.knowledge[s]||[]);
  const allQuestions = () => SUBJECT_IDS.flatMap(s => DATA.questions[s]||[]);
  const allMethods = () => SUBJECT_IDS.flatMap(s => DATA.methods[s]||[]);
  function subjectQuestions(s) { return DATA.questions[s]||[]; }
  function subjectKnowledge(s) { return DATA.knowledge[s]||[]; }

  /* ---------- KaTeX ---------- */
  function renderMath(el) {
    if (!el || !window.renderMathInElement) return;
    try {
      window.renderMathInElement(el, {
        delimiters: [
          {left:"$$", right:"$$", display:true},
          {left:"\\[", right:"\\]", display:true},
          {left:"$", right:"$", display:false},
          {left:"\\(", right:"\\)", display:false}
        ],
        throwOnError: false,
        strict: false,
        trust: false,
        ignoredTags: ["script","noscript","style","textarea","pre","code"]
      });
    } catch (e) { console.warn("katex", e); }
  }

  /* ---------- SM-2 ---------- */
  function sm2(card, quality) {
    let ef = card.ef ?? 2.5, interval = card.interval ?? 0, reps = card.reps ?? 0;
    if (quality < 3) { reps = 0; interval = 1; }
    else {
      if (reps === 0) interval = 1;
      else if (reps === 1) interval = 6;
      else interval = Math.max(1, Math.round(interval * ef));
      reps += 1;
    }
    ef = Math.max(1.3, ef + (0.1 - (5-quality)*(0.08+(5-quality)*0.02)));
    return { ef, interval, reps, due: Date.now() + interval*86400000, last: Date.now(), quality };
  }
  function reviewItem(qid, quality) {
    state.sm2[qid] = sm2(state.sm2[qid]||{}, quality);
    save();
  }
  function dueReviews() {
    const now = Date.now();
    return Object.entries(state.sm2)
      .filter(([,c]) => (c.due||0) <= now)
      .map(([id,c]) => ({id, ...c}))
      .sort((a,b) => a.due - b.due);
  }

  /* ---------- mastery ---------- */
  function recordAnswer(qid, correct, ms, subject, kids) {
    const q = DATA.qIndex[qid];
    const ks = kids || (q && q.knowledgeIds) || [];
    for (const kid of ks) {
      const m = state.mastery[kid] || { correct:0, wrong:0, last:0, time:0 };
      if (correct) m.correct++; else m.wrong++;
      m.last = Date.now();
      m.time += ms||0;
      state.mastery[kid] = m;
    }
    if (!correct) {
      const exist = state.wrong.find(w => w.qid === qid && !w.mastered);
      if (exist) { exist.times = (exist.times||1)+1; exist.last = Date.now(); }
      else state.wrong.unshift({ id: uid(), qid, subject: subject||q?.subject, reason:"", note:"", time: Date.now(), times:1, mastered:false });
      reviewItem(qid, 1);
    } else {
      const exist = state.wrong.find(w => w.qid === qid && !w.mastered);
      if (exist) reviewItem(qid, 4);
      else if (state.sm2[qid]) reviewItem(qid, 4);
    }
    save();
  }
  function masteryOf(kid) {
    const m = state.mastery[kid];
    if (!m || m.correct+m.wrong === 0) return 0;
    const acc = m.correct / (m.correct+m.wrong);
    const recency = Math.exp(-(Date.now()-(m.last||Date.now()))/(1000*60*60*24*21));
    return clamp(acc * (0.65 + 0.35*recency), 0, 1);
  }
  function masteryClass(v) { return v>=0.75 ? "" : v>=0.4 ? "mid" : "low"; }

  /* ---------- countdown ---------- */
  function countdown() {
    const t = new Date(GAOKAO_ISO).getTime() - Date.now();
    if (t <= 0) return { days:0, hours:0, mins:0, secs:0, past:true };
    const days = Math.floor(t/86400000);
    const hours = Math.floor((t%86400000)/3600000);
    const mins = Math.floor((t%3600000)/60000);
    const secs = Math.floor((t%60000)/1000);
    return { days, hours, mins, secs, past:false };
  }
  function streakCount() {
    let n = 0;
    const d = new Date();
    // if today not checked, start from yesterday
    if (!state.checkins[todayStr(d)]) d.setDate(d.getDate()-1);
    while (state.checkins[todayStr(d)]) { n++; d.setDate(d.getDate()-1); }
    return n;
  }
  function checkinToday(minutes=0) {
    const k = todayStr();
    const cur = state.checkins[k] || { done:true, minutes:0, tasks:[] };
    cur.done = true;
    cur.minutes = (cur.minutes||0) + minutes;
    state.checkins[k] = cur;
    save();
  }

  /* ---------- answer check ---------- */
  function normAns(s) {
    return String(s??"").trim()
      .replace(/[＄$]/g, "")
      .replace(/\\dfrac/g, "\\frac")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\left|\\right/g, "")
      .replace(/\\,/g, "")
      .replace(/\\ /g, "")
      .replace(/\\cdot/g, "")
      .replace(/\\times/g, "")
      .replace(/[（]/g,"(").replace(/[）]/g,")")
      .replace(/[，]/g,",").replace(/[：]/g,":")
      .replace(/[–—]/g,"-")
      .replace(/\s+/g,"")
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
      .replace(/\\sqrt\{([^}]+)\}/g, "√$1")
      .replace(/\\sqrt/g, "√")
      .replace(/\\pi/g, "π")
      .replace(/\\infty/g, "∞")
      .replace(/\\pm/g, "±")
      .replace(/\\in/g, "∈")
      .replace(/\\le|\\leq/g, "≤")
      .replace(/\\ge|\\geq/g, "≥")
      .replace(/\\neq|\\ne/g, "≠")
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)")
      .replace(/[{}]/g, "")
      .toLowerCase();
  }
  function answersMatch(user, correct, alts) {
    const u = normAns(user);
    const cands = [correct, ...(alts||[])].map(normAns);
    if (cands.includes(u)) return true;
    // numeric
    const nu = Number(u.replace(/（/g,"("));
    if (!Number.isNaN(nu) && cands.some(c => {
      const n = Number(c);
      return !Number.isNaN(n) && Math.abs(n-nu)<1e-6;
    })) return true;
    return false;
  }
  function checkQuestion(q, user) {
    if (q.type === "single") return { correct: user === q.answer, score: user===q.answer ? (q.score||5) : 0, full: q.score||5 };
    if (q.type === "multi") {
      const a = [...String(q.answer)].sort().join("");
      const u = [...String(user||"")].sort().join("");
      const full = q.score || 6;
      if (u === a) return { correct:true, score:full, full };
      // partial: all selected are correct, none wrong
      const aset = new Set(a), uset = new Set(u);
      const hasWrong = [...uset].some(x => !aset.has(x));
      const hasSome = [...uset].some(x => aset.has(x));
      if (!hasWrong && hasSome && u.length>0) return { correct:false, score: Math.round(full/2), full, partial:true };
      return { correct:false, score:0, full };
    }
    if (q.type === "fill" || q.type === "recite") {
      const ok = answersMatch(user, q.answer, q.alt);
      return { correct: ok, score: ok ? (q.score||5) : 0, full: q.score||5 };
    }
    // essay: user is {text, selfScore}
    if (q.type === "essay" || q.type === "write") {
      const full = q.score || 12;
      const sc = Number(user && user.selfScore);
      const s = Number.isFinite(sc) ? clamp(sc,0,full) : null;
      return { correct: s==null ? null : s >= full*0.8, score: s, full, pending: s==null };
    }
    return { correct:false, score:0, full:q.score||5 };
  }

  /* ---------- toast / modal ---------- */
  let toastTimer;
  function toast(msg) {
    let wrap = $(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className="toast-wrap"; document.body.appendChild(wrap); }
    wrap.innerHTML = `<div class="toast">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { wrap.innerHTML=""; }, 2400);
  }
  function modal(html, on) {
    closeModal();
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    bg.addEventListener("click", e => { if (e.target===bg) closeModal(); });
    document.body.appendChild(bg);
    if (on) on(bg);
    const first = bg.querySelector("button, input, textarea, [href]");
    if (first) first.focus();
    return bg;
  }
  function closeModal() { $$(".modal-bg").forEach(x => x.remove()); }

  /* ---------- router ---------- */
  let current = { path: "/", query: {}, parts: [] };
  function parseHash() {
    const raw = (location.hash||"#/").replace(/^#/, "") || "/";
    const [p, qs] = raw.split("?");
    const path = p.startsWith("/") ? p : "/" + p;
    const query = {};
    if (qs) new URLSearchParams(qs).forEach((v,k) => query[k]=v);
    const parts = path.split("/").filter(Boolean);
    return { path, query, parts };
  }
  function go(to, replace=false) {
    const h = to.startsWith("#") ? to : "#" + (to.startsWith("/") ? to : "/"+to);
    if (replace) location.replace(h); else location.hash = h;
  }
  function route() {
    current = parseHash();
    closeModal();
    closeSidebar();
    const view = document.getElementById("view");
    if (!state.profile.onboarded && current.parts[0] !== "onboard") {
      go("/onboard", true); return;
    }
    const html = dispatch(current);
    if (view) {
      view.innerHTML = html;
      renderMath(view);
      bindPage(current);
    }
    highlightNav();
    const main = document.getElementById("main");
    if (main) main.scrollTop = 0;
    window.scrollTo(0,0);
  }

  function dispatch(r) {
    const p = r.parts;
    if (!p.length) return pageHome();
    const a = p[0];
    switch (a) {
      case "onboard": return pageOnboard();
      case "knowledge":
        if (p[2]) return pageKnowledgeDetail(p[1], p[2]);
        if (p[1]) return pageKnowledgeSubject(p[1]);
        return pageKnowledge();
      case "practice":
        if (p[1]==="run") return pagePracticeRun();
        if (p[1]==="result") return pagePracticeResult();
        if (p[1]==="setup") return pagePracticeSetup(r.query);
        return pagePractice();
      case "methods":
        if (p[2]) return pageMethodDetail(p[1], p[2]);
        if (p[1]) return pageMethodsSubject(p[1]);
        return pageMethods();
      case "exam":
        if (p[2]==="result") return pageExamResult(p[1]);
        if (p[1]==="run") return pageExamRun();
        if (p[1]) return pageExamStart(p[1]);
        return pageExams();
      case "wrong": return pageWrong();
      case "review": return pageReview();
      case "stats": return pageStats();
      case "plan": return pagePlan();
      case "formulas": return pageFormulas(p[1]);
      case "poetry": return pagePoetry(p[1]);
      case "words": return pageWords();
      case "writing": return pageWriting(p[1]);
      case "favorites": return pageFavorites();
      case "settings": return pageSettings();
      case "search": return pageSearch(r.query.q||"");
      default: return pageHome();
    }
  }

  /* ---------- shell ---------- */
  function navItems() {
    return [
      ["/", "home", "首页"],
      ["/knowledge", "book", "知识点"],
      ["/practice", "pen", "刷题"],
      ["/methods", "lamp", "解题方法"],
      ["/exam", "exam", "模拟卷"],
      ["/wrong", "wrong", "错题本"],
      ["/review", "review", "复习"],
      ["/stats", "chart", "成绩"],
      ["/plan", "plan", "冲刺计划"],
    ];
  }
  const toolItems = [
    ["/formulas", "formula", "公式速查"],
    ["/poetry", "poetry", "古诗文默写"],
    ["/words", "word", "英语词句"],
    ["/writing", "write", "作文素材"],
    ["/favorites", "star", "收藏"],
  ];

  function renderShell() {
    const cd = countdown();
    const streak = streakCount();
    const due = dueReviews().length;
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="scrim" id="scrim"></div>
      <div class="shell">
        <aside class="sidebar" id="sidebar">
          <a class="brand" href="#/" aria-label="青衿 首页">
            <img src="favicon.svg" width="36" height="36" alt="">
            <span class="brand-text"><span class="brand-name">青衿</span><span class="brand-sub">高考冲刺</span></span>
          </a>
          <div class="side-count">
            <div class="n" id="side-days">${cd.days}<em>天</em></div>
            <div class="l">距 2027 年高考</div>
          </div>
          <nav class="nav" aria-label="主要栏目">
            ${navItems().map(([h,i,n]) => `<a href="#${h}" data-nav="${h}">${ic(i)}${n}</a>`).join("")}
            <div class="nav-group-label">工具</div>
            ${toolItems.map(([h,i,n]) => `<a href="#${h}" data-nav="${h}">${ic(i)}${n}</a>`).join("")}
          </nav>
          <div class="side-foot">
            <a class="side-user" href="#/settings">
              <span class="avatar">${esc((state.profile.name||"青").slice(0,1))}</span>
              <span>${esc(state.profile.name||"设置与选科")}</span>
            </a>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar" id="topbar">
            <button class="menu-btn" id="menu-btn" aria-label="打开菜单">${ic("menu",20)}</button>
            <form class="search-box" id="search-form" action="#/search" role="search">
              ${ic("search")}
              <input type="search" name="q" id="q-input" placeholder="搜索知识点、题目、方法" aria-label="搜索" autocomplete="off">
            </form>
            <div class="top-actions">
              ${streak?`<span class="streak-pill" title="连续打卡 ${streak} 天">${ic("fire",16)} ${streak} <span>天</span></span>`:""}
              <a class="icon-btn" href="#/review" title="待复习" aria-label="待复习">
                ${ic("bell")}${due?`<span class="badge">${due>99?"99+":due}</span>`:""}
              </a>
              <a class="icon-btn hidden-mobile" href="#/settings" title="设置">${ic("gear")}</a>
            </div>
          </header>
          <main id="main" tabindex="-1"><div id="view"></div></main>
        </div>
      </div>
      <nav class="bottom-nav" aria-label="移动导航">
        <a href="#/" data-bn="home">${ic("home",22)}首页</a>
        <a href="#/knowledge" data-bn="knowledge">${ic("book",22)}知识</a>
        <a href="#/practice" data-bn="practice">${ic("pen",22)}刷题</a>
        <a href="#/wrong" data-bn="wrong">${ic("wrong",22)}错题</a>
        <a href="#/plan" data-bn="me">${ic("plan",22)}计划</a>
      </nav>
    `;
    $("#menu-btn")?.addEventListener("click", openSidebar);
    $("#scrim")?.addEventListener("click", closeSidebar);
    $("#search-form")?.addEventListener("submit", e => {
      e.preventDefault();
      const q = $("#q-input").value.trim();
      go("/search?q="+encodeURIComponent(q));
    });
    window.addEventListener("scroll", () => {
      $("#topbar")?.classList.toggle("scrolled", window.scrollY>4);
    }, {passive:true});
  }
  function openSidebar(){ $("#sidebar")?.classList.add("open"); $("#scrim")?.classList.add("on"); }
  function closeSidebar(){ $("#sidebar")?.classList.remove("open"); $("#scrim")?.classList.remove("on"); }
  function highlightNav() {
    const p = "/"+ (current.parts[0]||"");
    $$(".nav a").forEach(a => {
      const n = a.getAttribute("data-nav");
      a.classList.toggle("active", n==="/" ? current.path==="/" : (n && (p===n || current.path.startsWith(n+"/") || current.path===n)));
    });
    const map = {"":"home", knowledge:"knowledge", practice:"practice", wrong:"wrong", review:"wrong", plan:"me", stats:"me", settings:"me", exam:"practice"};
    const key = map[current.parts[0]||""] || "";
    $$(".bottom-nav a").forEach(a => a.classList.toggle("active", a.dataset.bn===key));
  }

  function crumb(items) {
    return `<div class="crumb">${items.map((x,i)=> i<items.length-1 ? `<a href="${x[0]}">${esc(x[1])}</a><span>/</span>` : `<span>${esc(x[1])}</span>`).join("")}</div>`;
  }
  function tagFreq(f){ return `<span class="tag tag-${f==="high"?"high":f==="mid"?"mid":"base"}">${FREQ[f]||f||""}</span>`; }
  function tagDiff(d){ return `<span class="tag tag-diff-${d}">${DIFF[d]||d||""}</span>`; }
  function tagType(t){ return `<span class="tag tag-type">${TYPES[t]||t||""}</span>`; }
  function subjName(s){ return SUBJECT_META[s]?.name || s; }

  function empty(title, desc, href, cta) {
    return `<div class="empty card card-pad"><h3>${esc(title)}</h3><p>${esc(desc||"")}</p>${href?`<p style="margin-top:16px"><a class="btn btn-primary" href="${href}">${esc(cta||"去看看")}</a></p>`:""}</div>`;
  }


  /* ---------- onboarding ---------- */
  function pageOnboard() {
    const p = state.profile;
    return `
      <div class="onboard">
        <div class="card onboard-card">
          <p class="h1">青衿</p>
          <p class="lead">先选定高考模式和科目，后面的练习和计划会按你的选科来安排。这些随时可以在设置里改。</p>
          <label class="lbl">怎么称呼你（可选）</label>
          <input class="field" id="ob-name" value="${esc(p.name)}" placeholder="例如：小陈" maxlength="16">
          <div style="height:14px"></div>
          <label class="lbl">高考模式</label>
          <div class="choice-grid" style="grid-template-columns:1fr 1fr">
            <button type="button" class="choice ${p.mode!=="3+3"?"on":""}" data-mode="3+1+2">3+1+2</button>
            <button type="button" class="choice ${p.mode==="3+3"?"on":""}" data-mode="3+3">3+3</button>
          </div>
          <div id="ob-first" ${p.mode==="3+3"?"hidden":""}>
            <label class="lbl">首选科目</label>
            <div class="choice-grid" style="grid-template-columns:1fr 1fr">
              <button type="button" class="choice ${p.firstChoice==="physics"?"on":""}" data-first="physics">物理</button>
              <button type="button" class="choice ${p.firstChoice==="history"?"on":""}" data-first="history">历史</button>
            </div>
          </div>
          <label class="lbl" id="ob-second-lab">${p.mode==="3+3"?"再选三门计入总分":"再选两门"}</label>
          <div class="choice-grid" id="ob-second">
            ${["physics","history","chemistry","biology","politics","geography"].map(s => {
              const hide = p.mode!=="3+3" && (s==="physics"||s==="history");
              if (hide) return "";
              const on = (p.secondChoices||[]).includes(s);
              return `<button type="button" class="choice ${on?"on":""}" data-second="${s}">${SUBJECT_META[s].name}</button>`;
            }).join("")}
          </div>
          <label class="lbl">目标总分（默认 600）</label>
          <input class="field" id="ob-target" type="number" min="100" max="750" value="${esc(p.targetScore||600)}">
          <div style="height:20px"></div>
          <button class="btn btn-primary btn-lg btn-block" id="ob-go">开始使用</button>
        </div>
      </div>`;
  }

  /* ---------- home ---------- */
  function pageHome() {
    const cd = countdown();
    const tasks = todayTasks();
    const done = tasks.filter(t => t.done).length;
    const weak = weakKnowledge(6);
    const recent = (state.practiceLog||[]).slice(0,5);
    const sel = selectedSubjects();
    return `
      <div class="hero">
        <div class="card hero-count">
          <p class="hero-kicker">距离 2027 年 6 月 7 日高考</p>
          <div class="hero-days"><span class="num" id="hero-days">${cd.days}</span><span class="unit">天</span></div>
          <div class="hero-clock" id="hero-clock">
            <div><b id="h-h">${pad(cd.hours)}</b><span>时</span></div>
            <div><b id="h-m">${pad(cd.mins)}</b><span>分</span></div>
            <div><b id="h-s">${pad(cd.secs)}</b><span>秒</span></div>
          </div>
        </div>
        <div class="card today-card">
          <div class="h2">今日计划 <a href="#/plan" style="font-size:13px;font-weight:500">全部</a></div>
          <ul class="task-list">
            ${tasks.slice(0,5).map(t => `
              <li>
                <button class="check ${t.done?"on":""}" data-task="${esc(t.id)}" aria-label="完成">${t.done?ic("check",12):""}</button>
                <a href="${t.href}">${esc(t.title)}</a>
              </li>`).join("") || "<li class='muted'>今天还没有任务，去计划页生成一份。</li>"}
          </ul>
          <div class="progress-line"><i style="width:${tasks.length?done/tasks.length*100:0}%"></i></div>
          <div class="muted" style="font-size:12.5px">${done}/${tasks.length} 已完成</div>
        </div>
      </div>
      <div class="section-title"><h2>我的科目</h2><a href="#/settings">更改选科</a></div>
      <div class="subject-row">
        ${SUBJECT_IDS.map(s => {
          const m = SUBJECT_META[s];
          const nK = (DATA.knowledge[s]||[]).length;
          const on = sel.includes(s);
          return `<a class="card card-hover subj-card ${on?"":"off"}" data-s="${s}" href="#/knowledge/${s}">
            <span class="dot">${m.short}</span>
            <span class="nm">${m.name}</span>
            <span class="meta">${nK} 个知识点</span>
          </a>`;
        }).join("")}
      </div>
      <div class="grid grid-2">
        <div>
          <div class="section-title"><h2>建议优先突破</h2><a href="#/stats">成绩分析</a></div>
          ${weak.length? weak.map(k => kpCard(k)).join("") : `<div class="card card-pad muted">先做几组练习，这里会根据正确率给出建议。</div>`}
        </div>
        <div>
          <div class="section-title"><h2>最近练习</h2><a href="#/stats">更多</a></div>
          <div class="card card-pad">
            ${recent.length? `<ul class="rec-list">${recent.map(l => `<li><a href="#/practice">${esc(l.title||"练习")}</a><div class="muted">${fmtDate(l.end||l.start)} · ${l.correct||0}/${l.total||0} 对</div></li>`).join("")}</ul>` : `<p class="muted">还没有练习记录。<a href="#/practice">开始刷题</a></p>`}
          </div>
        </div>
      </div>
    `;
  }

  function kpCard(k) {
    const mv = masteryOf(k.id);
    return `<a class="card card-hover kp-mini" href="#/knowledge/${k.subject}/${k.id}" style="display:block;margin-bottom:10px">
      <h3>${esc(k.title)}</h3>
      <p>${esc(subjName(k.subject))} · ${esc(k.chapter)}</p>
      <div class="meta-row">${tagFreq(k.freq)} <span class="muted">${Math.round(mv*100)}%</span></div>
      <div class="mastery-bar ${masteryClass(mv)}"><i style="width:${mv*100}%"></i></div>
    </a>`;
  }

  function weakKnowledge(n=8) {
    const sel = selectedSubjects();
    const items = allKnowledge().filter(k => sel.includes(k.subject));
    const ranked = items.map(k => {
      const m = state.mastery[k.id];
      const total = m ? m.correct+m.wrong : 0;
      const acc = total? m.correct/total : null;
      let score = 0;
      if (total>=2 && acc!=null) score = (1-acc)*2 + (k.freq==="high"?0.6:k.freq==="mid"?0.3:0);
      else if (k.freq==="high") score = 0.8;
      else score = 0.2;
      return {k, score, total};
    }).sort((a,b)=> b.score-a.score);
    // 只根据真实作答记录提示薄弱点，避免新访客看到像「已有成绩」的推荐。
    return ranked.filter(x => x.total>=1 && (state.mastery[x.k.id].correct/x.total < 0.8)).slice(0,n).map(x=>x.k);
  }

  function todayTasks() {
    const key = todayStr();
    const checked = (state.plan.checked||{})[key] || [];
    // generate stable daily tasks from date seed
    const seed = Number(key.replace(/-/g,""));
    const due = dueReviews();
    const weak = weakKnowledge(4);
    const tasks = [];
    if (due.length) tasks.push({ id:"rev", title:`复习 ${Math.min(due.length,10)} 道到期题目`, href:"#/review" });
    weak.slice(0,2).forEach(k => tasks.push({ id:"wk-"+k.id, title:`巩固「${k.title}」`, href:`#/knowledge/${k.subject}/${k.id}` }));
    const sel = selectedSubjects();
    const sub = sel[seed % sel.length] || "math";
    tasks.push({ id:"pr-"+sub, title:`练习 ${subjName(sub)} 10 题`, href:`#/practice/setup?mode=rand&subject=${sub}&n=10` });
    if (DATA.poetry && DATA.poetry.length) {
      const po = DATA.poetry[seed % DATA.poetry.length];
      tasks.push({ id:"po", title:`默写《${po.title}》`, href:`#/poetry/${po.id}` });
    }
    if (sel.includes("english") && DATA.words && DATA.words.length) {
      tasks.push({ id:"wd", title:"英语单词快速复习 15 个", href:"#/words" });
    }
    const days = countdown().days;
    if (days <= 45) tasks.push({ id:"ex", title:"做一套限时小测或模拟卷", href:"#/exam" });
    (state.plan.custom||[]).filter(t => !t.date || t.date===key).forEach(t => tasks.push({ id:"c-"+t.id, title:t.title, href:t.href||"#/plan" }));
    return tasks.map(t => ({...t, done: checked.includes(t.id)}));
  }
  function toggleTask(id) {
    const key = todayStr();
    const set = new Set((state.plan.checked||{})[key]||[]);
    if (set.has(id)) set.delete(id); else set.add(id);
    state.plan.checked = state.plan.checked||{};
    state.plan.checked[key] = [...set];
    if (set.size) checkinToday(0);
    save();
  }

  /* ---------- knowledge ---------- */
  function pageKnowledge() {
    const sel = selectedSubjects();
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/knowledge","知识点"]])}<h1 class="h1">知识点</h1>
      <p class="lead">按新课标模块梳理，点进去看要点、易错和相关练习。</p></div></div>
      <div class="grid grid-3">
        ${SUBJECT_IDS.map(s => {
          const ks = DATA.knowledge[s]||[];
          const done = ks.filter(k => masteryOf(k.id)>=0.75).length;
          return `<a class="card card-hover card-pad" href="#/knowledge/${s}" style="${sel.includes(s)?"":"opacity:.55"}">
            <div class="h2" style="margin:0 0 6px">${subjName(s)}</div>
            <p class="muted">${ks.length} 个知识点 · 已较熟 ${done}</p>
            <div class="progress-line"><i style="width:${ks.length?done/ks.length*100:0}%"></i></div>
          </a>`;
        }).join("")}
      </div>`;
  }
  function pageKnowledgeSubject(sid) {
    const ks = subjectKnowledge(sid);
    if (!ks.length) return empty("这一科的内容还在整理", "可以先看看其他科目。", "#/knowledge", "返回");
    const modules = [];
    ks.forEach(k => {
      let m = modules.find(x => x.name===k.module);
      if (!m) { m={name:k.module, chs:[]}; modules.push(m); }
      let c = m.chs.find(x => x.name===k.chapter);
      if (!c) { c={name:k.chapter, items:[]}; m.chs.push(c); }
      c.items.push(k);
    });
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/knowledge","知识点"],["#/knowledge/"+sid, subjName(sid)]])}
        <h1 class="h1">${subjName(sid)}</h1></div>
        <div class="chip-row"><input class="field" id="kp-filter" placeholder="筛选本章知识点" style="max-width:240px"></div>
      </div>
      <div class="tree">
        <div class="card tree-nav" id="tree-nav">
          ${modules.map(m => `<div class="mod">${esc(m.name)}</div>`+ m.chs.map(c => `<a class="ch" href="#ch-${encodeURIComponent(c.name)}">${esc(c.name)} <span class="muted">${c.items.length}</span></a>`).join("")).join("")}
        </div>
        <div class="kp-list" id="kp-list">
          ${modules.map(m => m.chs.map(c => `
            <h2 class="h2" id="ch-${esc(c.name)}" style="margin-top:8px">${esc(c.name)}</h2>
            ${c.items.map(k => `
              <a class="card card-hover kp-item" data-title="${esc(k.title)}" href="#/knowledge/${sid}/${k.id}">
                <h3>${esc(k.title)} ${tagFreq(k.freq)}</h3>
                <p>${esc(k.summary)}</p>
                <div class="mastery-bar ${masteryClass(masteryOf(k.id))}"><i style="width:${masteryOf(k.id)*100}%"></i></div>
              </a>`).join("")}
          `).join("")).join("")}
        </div>
      </div>`;
  }
  function pageKnowledgeDetail(sid, kid) {
    const k = DATA.kpIndex[kid];
    if (!k) return empty("没有找到这个知识点", "", "#/knowledge/"+sid, "返回");
    state.viewed[kid] = Date.now(); save();
    const fav = (state.favorites.knowledge||[]).includes(kid);
    const note = state.notes[kid]||"";
    const qs = (k.questionIds||[]).map(id => DATA.qIndex[id]).filter(Boolean);
    const ms = (k.methodIds||[]).map(id => DATA.mIndex[id]).filter(Boolean);
    const related = (k.relatedIds||[]).map(id => DATA.kpIndex[id]).filter(Boolean);
    return `
      <div class="page-head"><div>
        ${crumb([["#/","首页"],["#/knowledge","知识点"],["#/knowledge/"+sid, subjName(sid)],["#", k.title]])}
        <h1 class="h1">${esc(k.title)}</h1>
        <div class="meta-row">${tagFreq(k.freq)}<span class="tag">${esc(k.module)}</span><span class="tag">${esc(k.chapter)}</span></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm fav ${fav?"on":""}" id="fav-kp">${ic("star",16)} ${fav?"已收藏":"收藏"}</button>
        <a class="btn btn-primary btn-sm" href="#/practice/setup?mode=kp&subject=${sid}&kid=${kid}">练习本题组</a>
      </div></div>
      <div class="kd-layout">
        <div class="card card-pad prose" id="kp-prose">
          <h3>要点简述</h3>
          <p>${trusted(k.summary)}</p>
          <h3>关键结论</h3>
          <ul>${(k.points||[]).map(p=>`<li>${trusted(p)}</li>`).join("")}</ul>
          ${(k.formulas||[]).length?`<h3>公式与结论</h3><div class="formula-box">${(k.formulas||[]).map(f=>`<div>${trusted(f)}</div>`).join("")}</div>`:""}
          ${(k.pitfalls||[]).length?`<h3>易错点</h3><div class="pitfall"><strong>容易出错的地方</strong><ul style="margin:8px 0 0">${(k.pitfalls||[]).map(p=>`<li>${trusted(p)}</li>`).join("")}</ul></div>`:""}
          <div class="exam-how"><strong>高考怎么考</strong><p style="margin:6px 0 0">${trusted(k.examHow||"")}</p></div>
          <div class="note-box">
            <h3>我的笔记</h3>
            <textarea id="kp-note" placeholder="写一点自己的理解、老师强调的话，或易错提醒。">${esc(note)}</textarea>
          </div>
        </div>
        <div>
          <div class="card side-box">
            <h3>掌握程度</h3>
            <div class="mastery-bar ${masteryClass(masteryOf(kid))}" style="height:8px"><i style="width:${masteryOf(kid)*100}%"></i></div>
            <p class="muted" style="margin-top:8px">${(()=>{const m=state.mastery[kid]; return m?`对 ${m.correct} · 错 ${m.wrong}`:"还没有相关练习记录";})()}</p>
          </div>
          ${ms.length?`<div class="card side-box"><h3>相关方法</h3><ul class="link-list">${ms.map(x=>`<li><a href="#/methods/${x.subject}/${x.id}">${esc(x.name)}</a></li>`).join("")}</ul></div>`:""}
          ${qs.length?`<div class="card side-box"><h3>相关练习 ${qs.length}</h3><ul class="link-list">${qs.slice(0,12).map(x=>`<li><a href="#/practice/setup?mode=one&qid=${x.id}">${tagType(x.type)} ${esc(stripHtml(x.stem).slice(0,36))}…</a></li>`).join("")}</ul>
            <a class="btn btn-soft btn-sm btn-block" style="margin-top:8px" href="#/practice/setup?mode=kp&subject=${sid}&kid=${kid}">开始练习</a></div>`:""}
          ${related.length?`<div class="card side-box"><h3>相关知识点</h3><ul class="link-list">${related.map(x=>`<li><a href="#/knowledge/${x.subject}/${x.id}">${esc(x.title)}</a></li>`).join("")}</ul></div>`:""}
        </div>
      </div>`;
  }
  function stripHtml(s){
    s = String(s||"").replace(/<[^>]+>/g," ");
    s = s.replace(/\$+/g,"");
    s = s.replace(/\\(mathrm|text|textbf|textit|mathbf|mathbb|mathcal|overline|underline|boldsymbol|overrightarrow|vec|hat|bar|tilde)\{([^{}]*)\}/g,"$2");
    s = s.replace(/\\(dfrac|frac|tfrac)\{([^{}]*)\}\{([^{}]*)\}/g,"$2/$3");
    s = s.replace(/\\sqrt\{([^{}]*)\}/g,"√$1");
    s = s.replace(/\\(quad|qquad|,|;|:|~)/g," ");
    s = s.replace(/\\circ/g,"°");
    s = s.replace(/\\infty/g,"∞");
    s = s.replace(/\\(le|leq)/g,"≤");
    s = s.replace(/\\(ge|geq)/g,"≥");
    s = s.replace(/\\(times|cdot)/g,"×");
    s = s.replace(/\\[a-zA-Z]+/g,"");
    s = s.replace(/\^\{([^{}]*)\}/g,"$1");
    s = s.replace(/\^(\w)/g,"$1");
    s = s.replace(/_\{([^{}]*)\}/g,"$1");
    s = s.replace(/[{}]/g,"");
    return s.replace(/\s+/g," ").trim();
  }

  /* ---------- methods ---------- */
  function pageMethods() {
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/methods","解题方法"]])}<h1 class="h1">解题方法</h1>
      <p class="lead">每种方法说清何时用、怎么用，并配上例题。</p></div></div>
      <div class="grid grid-3">
        ${SUBJECT_IDS.map(s => {
          const ms = DATA.methods[s]||[];
          if (!ms.length) return "";
          return `<a class="card card-hover card-pad" href="#/methods/${s}"><div class="h2" style="margin:0 0 6px">${subjName(s)}</div><p class="muted">${ms.length} 种方法</p></a>`;
        }).join("")}
      </div>`;
  }
  function pageMethodsSubject(sid) {
    const ms = DATA.methods[sid]||[];
    if (!ms.length) return empty("这一科的方法还在整理","", "#/methods","返回");
    const cats = [...new Set(ms.map(m=>m.category))];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/methods","解题方法"],["#/methods/"+sid,subjName(sid)]])}
        <h1 class="h1">${subjName(sid)}的方法</h1></div></div>
      ${cats.map(c => `<h2 class="h2">${esc(c)}</h2>
        <div class="grid grid-2" style="margin-bottom:18px">
          ${ms.filter(m=>m.category===c).map(m => `
            <a class="card card-hover method-card" href="#/methods/${sid}/${m.id}">
              <h3>${esc(m.name)}</h3>
              <p>${esc(m.when)}</p>
              <div class="meta-row"><span class="muted">${(m.questionIds||[]).length} 道相关题</span></div>
            </a>`).join("")}
        </div>`).join("")}`;
  }
  function pageMethodDetail(sid, mid) {
    const m = DATA.mIndex[mid];
    if (!m) return empty("没有找到这种方法","","#/methods/"+sid,"返回");
    const fav = (state.favorites.methods||[]).includes(mid);
    const qs = (m.questionIds||[]).map(id=>DATA.qIndex[id]).filter(Boolean);
    return `
      <div class="page-head"><div>
        ${crumb([["#/","首页"],["#/methods","解题方法"],["#/methods/"+sid,subjName(sid)],["#",m.name]])}
        <h1 class="h1">${esc(m.name)}</h1>
        <p class="lead">${esc(m.when)}</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm fav ${fav?"on":""}" id="fav-md">${ic("star",16)} ${fav?"已收藏":"收藏"}</button>
        ${qs.length?`<a class="btn btn-primary btn-sm" href="#/practice/setup?mode=method&mid=${mid}">按方法练习</a>`:""}
      </div></div>
      <div class="card card-pad prose" id="md-prose">
        <h3>方法说明</h3>
        <p>${trusted(m.explanation)}</p>
        <h3>操作步骤</h3>
        <ol>${(m.steps||[]).map(s=>`<li>${trusted(s)}</li>`).join("")}</ol>
        ${(m.tips||[]).length?`<h3>使用提醒</h3><div class="pitfall"><ul style="margin:0">${(m.tips||[]).map(t=>`<li>${trusted(t)}</li>`).join("")}</ul></div>`:""}
      </div>
      ${qs.length?`<h2 class="h2" style="margin-top:22px">相关练习</h2>
        <div class="grid grid-2">${qs.map(q=>`<a class="card card-hover card-pad" href="#/practice/setup?mode=one&qid=${q.id}">${tagType(q.type)} ${tagDiff(q.difficulty)}<p style="margin:8px 0 0">${esc(stripHtml(q.stem).slice(0,80))}…</p></a>`).join("")}</div>`:""}`;
  }


  /* ---------- practice engine ---------- */
  let session = null; // {mode, subject, items, idx, answers, start, limit, title}

  function loadSession() {
    try { const s = sessionStorage.getItem("qingjin-session"); if (s) session = JSON.parse(s); } catch(e){}
  }
  function saveSession() {
    try { if (session) sessionStorage.setItem("qingjin-session", JSON.stringify(session)); else sessionStorage.removeItem("qingjin-session"); } catch(e){}
  }

  function pickQuestions({mode, subject, kid, mid, qid, n=10, diff}) {
    let pool;
    if (qid) {
      pool = allQuestions().filter(q => q.id===qid);
    } else {
      pool = subject && subject!=="all" ? subjectQuestions(subject) : allQuestions().filter(q => isSelected(q.subject));
      if (kid) pool = pool.filter(q => (q.knowledgeIds||[]).includes(kid));
      if (mid) pool = pool.filter(q => (q.methodIds||[]).includes(mid));
      if (diff) pool = pool.filter(q => String(q.difficulty)===String(diff));
    }
    const arr = [...pool];
    if (mode==="rand" || mode==="quiz" || mode==="mixed") {
      for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    }
    const take = Math.min(n||10, arr.length);
    return arr.slice(0, take);
  }

  function startSession(opts) {
    const items = pickQuestions(opts);
    if (!items.length) { toast("这一组暂时没有题目"); return false; }
    session = {
      mode: opts.mode||"rand",
      subject: opts.subject||"all",
      title: opts.title || sessionTitle(opts),
      items: items.map(q => q.id),
      idx: 0,
      answers: {},
      flags: {},
      start: Date.now(),
      limit: opts.limit||0, // seconds, 0 = no limit
      n: items.length,
      quiz: opts.mode==="quiz"
    };
    saveSession();
    go("/practice/run");
    return true;
  }
  function sessionTitle(o) {
    if (o.mode==="kp" && o.kid && DATA.kpIndex[o.kid]) return "知识点 · " + DATA.kpIndex[o.kid].title;
    if (o.mode==="method" && o.mid && DATA.mIndex[o.mid]) return "方法 · " + DATA.mIndex[o.mid].name;
    if (o.mode==="wrong") return "错题重练";
    if (o.mode==="quiz") return "限时小测";
    if (o.mode==="one") return "单题练习";
    if (o.subject && o.subject!=="all") return subjName(o.subject) + " · 练习";
    return "综合练习";
  }

  function pagePractice() {
    const modes = [
      ["kp","按知识点","从某一章或某个知识点入手，把一类问题吃透。","#/practice/setup?mode=kp", "book"],
      ["method","按方法","选定一种通法，专门练它的识别与运用。","#/practice/setup?mode=method", "lamp"],
      ["rand","综合随机","在你的选科范围内混合出题，模拟日常小练。","#/practice/setup?mode=rand&n=10", "pen"],
      ["quiz","限时小测","给定题量和时间，做完自动统计。","#/practice/setup?mode=quiz&n=8&limit=20", "clock"],
      ["wrong","错题重练","把错过的题按间隔再做一遍。","#/practice/setup?mode=wrong", "wrong"],
      ["exam","模拟卷","按试卷结构计时作答，客观题自动判分。","#/exam", "exam"],
    ];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/practice","刷题"]])}<h1 class="h1">刷题</h1>
      <p class="lead">选一种方式开始。做完后可以看逐步解答和方法分析。</p></div></div>
      <div class="mode-grid">
        ${modes.map(([id,t,d,h,i]) => `<a class="card card-hover mode-card" href="${h}">
          <div class="ic-wrap">${ic(i,20)}</div><h3>${t}</h3><p>${d}</p></a>`).join("")}
      </div>
      ${session && session.items && session.idx < session.items.length ? `<div class="card card-pad" style="margin-top:8px">你有一组未完成的练习「${esc(session.title)}」。<a class="btn btn-soft btn-sm" href="#/practice/run">继续</a> <button class="btn btn-ghost btn-sm" id="drop-sess">放弃</button></div>`:""}
    `;
  }

  function pagePracticeSetup(q) {
    const mode = q.mode||"rand";
    const sel = selectedSubjects();
    const subject = q.subject || (sel[0]||"math");
    if (mode==="one" && q.qid) {
      const ok = startSession({mode:"one", qid:q.qid, n:1, title:"单题练习"});
      if (!ok) return empty("没有找到这道题","题目可能已调整，或数据尚未载入。","#/practice","返回刷题");
      return `<div class="empty">正在打开题目…</div>`;
    }
    if (mode==="wrong") {
      const ids = state.wrong.filter(w=>!w.mastered).map(w=>w.qid);
      const items = ids.map(id=>DATA.qIndex[id]).filter(Boolean);
      if (!items.length) return empty("错题本是空的","做题时答错的会自动进来。","#/practice","去刷题");
      return setupForm(mode, subject, q, items.length);
    }
    return setupForm(mode, subject, q);
  }
  function setupForm(mode, subject, q, maxN) {
    const titles = {kp:"按知识点练习", method:"按方法练习", rand:"综合随机", quiz:"限时小测", wrong:"错题重练"};
    const ks = subjectKnowledge(subject);
    const ms = DATA.methods[subject]||[];
    const nDef = Number(q.n|| (mode==="quiz"?8:10));
    const limitDef = Number(q.limit|| (mode==="quiz"?20:0));
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/practice","刷题"],["#",titles[mode]||"练习"]])}
        <h1 class="h1">${titles[mode]||"练习"}</h1></div></div>
      <div class="card card-pad" style="max-width:640px">
        <label class="lbl">科目</label>
        <select class="field" id="su-subject">${SUBJECT_IDS.map(s=>`<option value="${s}" ${s===subject?"selected":""}>${subjName(s)}（${(DATA.questions[s]||[]).length} 题）</option>`).join("")}<option value="all">全部选科</option></select>
        <div style="height:12px"></div>
        ${mode==="kp"?`<label class="lbl">知识点</label>
          <select class="field" id="su-kid"><option value="">该科全部</option>${ks.map(k=>`<option value="${k.id}" ${q.kid===k.id?"selected":""}>${esc(k.chapter)} · ${esc(k.title)}</option>`).join("")}</select>
          <div style="height:12px"></div>`:""}
        ${mode==="method"?`<label class="lbl">方法</label>
          <select class="field" id="su-mid"><option value="">该科全部方法</option>${ms.map(m=>`<option value="${m.id}" ${q.mid===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select>
          <div style="height:12px"></div>`:""}
        <label class="lbl">题量 ${maxN?`（最多 ${maxN}）`:""}</label>
        <input class="field" id="su-n" type="number" min="1" max="${maxN||50}" value="${nDef}">
        <div style="height:12px"></div>
        <label class="lbl">难度（可选）</label>
        <select class="field" id="su-diff"><option value="">不限</option>${[1,2,3,4,5].map(d=>`<option value="${d}">${DIFF[d]}</option>`).join("")}</select>
        <div style="height:12px"></div>
        ${mode==="quiz"?`<label class="lbl">时限（分钟）</label>
          <input class="field" id="su-limit" type="number" min="5" max="180" value="${limitDef}">
          <div style="height:12px"></div>`:""}
        <button class="btn btn-primary btn-lg" id="su-start">开始</button>
      </div>`;
  }

  function pagePracticeRun() {
    loadSession();
    if (!session || !session.items || !session.items.length) return empty("没有进行中的练习","","#/practice","返回刷题");
    const q = DATA.qIndex[session.items[session.idx]];
    if (!q) return empty("题目缺失","","#/practice","返回");
    const total = session.items.length;
    const idx = session.idx;
    const remain = session.limit ? Math.max(0, session.limit*60 - Math.floor((Date.now()-session.start)/1000)) : null;
    const answered = session.answers[q.id];
    return `
      <div class="quiz-shell">
        <div class="quiz-top">
          <a class="icon-btn" href="#/practice" title="退出">${ic("close")}</a>
          <div class="quiz-meta">${esc(session.title)} · ${idx+1}/${total}</div>
          <div class="progress-line"><i style="width:${(idx)/total*100}%"></i></div>
          ${remain!=null?`<div class="timer ${remain<60?"warn":""}" id="quiz-timer">${fmtRemain(remain)}</div>`:""}
        </div>
        <div class="card card-pad">
          <div class="meta-row" style="margin-bottom:10px">${tagType(q.type)} ${tagDiff(q.difficulty)} <span class="tag">${esc(subjName(q.subject))}</span>
            ${(q.knowledgeIds||[]).slice(0,2).map(id=>DATA.kpIndex[id]?`<span class="tag">${esc(DATA.kpIndex[id].title)}</span>`:"").join("")}
          </div>
          ${q.passage?`<div class="passage" id="passage"><div class="passage-title">${esc(q.passageTitle||"阅读材料")}</div><div class="passage-body">${trusted(q.passage)}</div></div>`:""}
          <div class="stem" id="stem">${trusted(q.stem)}</div>
          ${renderInput(q, answered)}
          <div class="quiz-actions" id="quiz-act">
            ${answered ? `<button class="btn btn-primary" id="q-next">${idx+1>=total?"查看结果":"下一题"}</button>
                          <button class="btn btn-ghost" id="q-sol-toggle">看解析</button>` :
                         `<button class="btn btn-primary" id="q-submit">提交</button>
                          <button class="btn btn-ghost" id="q-skip">暂时跳过</button>`}
          </div>
          <div id="sol-slot">${answered ? renderSolution(q, answered) : ""}</div>
        </div>
      </div>`;
  }
  function fmtRemain(s){ const m=Math.floor(s/60), r=s%60; return `${pad(m)}:${pad(r)}`; }

  function renderInput(q, answered) {
    const locked = !!answered;
    if (q.type==="single") {
      return `<div class="options" id="opts">${(q.options||[]).map((o,i)=>{
        const L = String.fromCharCode(65+i);
        let cls = "opt";
        if (answered) {
          if (L===q.answer) cls+=" correct";
          else if (L===answered.user) cls+=" wrong";
        } else if (answered?.user===L) cls+=" picked";
        return `<button type="button" class="${cls}" data-v="${L}" ${locked?"disabled":""}><span class="lab">${L}</span><span>${trusted(o)}</span></button>`;
      }).join("")}</div>`;
    }
    if (q.type==="multi") {
      const picked = new Set((answered?.user||"").split("").filter(Boolean));
      return `<p class="muted" style="margin-bottom:8px">多选题，请选出所有正确选项。${locked?"":"（部分选对且没有错选，模拟卷中可得一半分）"}</p>
        <div class="options" id="opts">${(q.options||[]).map((o,i)=>{
        const L = String.fromCharCode(65+i);
        let cls = "opt";
        if (answered) {
          if (String(q.answer).includes(L)) cls+=" correct";
          else if (picked.has(L)) cls+=" wrong";
        } else if (picked.has(L)) cls+=" picked";
        return `<button type="button" class="${cls}" data-v="${L}" ${locked?"disabled":""}><span class="lab">${L}</span><span>${trusted(o)}</span></button>`;
      }).join("")}</div>`;
    }
    if (q.type==="fill"||q.type==="recite") {
      return `<input class="fill-input" id="fill-in" ${locked?"disabled":""} value="${esc(answered?.user||"")}" placeholder="在这里填写答案">
        ${locked?`<p class="muted" style="margin-top:8px">参考答案：${trusted(q.answer)}</p>`:""}`;
    }
    // essay
    const sc = answered?.user?.selfScore;
    return `<textarea class="essay-input" id="essay-in" ${locked?"disabled":""} placeholder="写出主要步骤与结论。提交后对照解析自行给分。">${esc(answered?.user?.text||"")}</textarea>
      ${locked?`<div class="self-score" id="self-score"><span class="muted">本题满分 ${q.score||12} 分，你给自己</span>
        ${Array.from({length:(q.score||12)+1},(_,i)=>`<button type="button" data-sc="${i}" class="${sc===i?"on":""}">${i}</button>`).join("")}
      </div>`:`<p class="muted" style="margin-top:8px">解答题提交后会显示解析和评分标准，请如实自评。</p>`}`;
  }

  function renderSolution(q, answered) {
    const r = answered.result || {};
    const ok = r.correct;
    const head = ok===true ? `<p style="color:var(--ok);font-weight:650;margin:0 0 8px">回答正确</p>` :
                 ok===false && r.partial ? `<p style="color:var(--warn);font-weight:650;margin:0 0 8px">部分正确（${r.score}/${r.full} 分）</p>` :
                 ok===false ? `<p style="color:var(--cinnabar);font-weight:650;margin:0 0 8px">回答不准确。参考答案：${trusted(typeof q.answer==="string"?q.answer:JSON.stringify(q.answer))}</p>` :
                 `<p class="muted">请根据评分标准给自己打分。</p>`;
    const an = q.analysis||{};
    let reason = "";
    if (ok===false && q.type!=="essay") {
      reason = `<div style="margin-top:10px"><div class="muted" style="font-size:13px">这次错在哪里？（可多选，便于以后复习）</div>
        <div class="reason-picks" id="reasons">${REASONS.map(([id,n])=>`<button type="button" class="chip ${(answered.reasons||[]).includes(id)?"on":""}" data-rs="${id}">${n}</button>`).join("")}</div>
        <input class="field" style="margin-top:8px" id="wrong-note" placeholder="补充一句（可选）" value="${esc(answered.note||"")}">
      </div>`;
    }
    return `<div class="solution" id="solution">
      ${head}
      <h3>逐步解答</h3>
      <ol class="sol-steps">${(q.steps||[]).map(s=>`<li>${trusted(s)}</li>`).join("")}</ol>
      <h3>方法分析</h3>
      <div class="analysis-grid">
        <div class="an-box"><h4>思路突破口</h4><p>${trusted(an.breakthrough||"")}</p></div>
        <div class="an-box"><h4>通法</h4><p>${trusted(an.method||"")}</p></div>
        <div class="an-box"><h4>易错提醒</h4><p>${trusted(an.pitfalls||"")}</p></div>
        <div class="an-box"><h4>变式</h4><p>${trusted(an.variant||"")}</p></div>
      </div>
      ${q.rubric?`<h3>评分标准</h3><ul>${q.rubric.map(r=>`<li>${esc(r.point||r.item||"")}（${r.score} 分）</li>`).join("")}</ul>`:""}
      ${reason}
      <div class="meta-row" style="margin-top:12px">
        ${(q.knowledgeIds||[]).map(id=>DATA.kpIndex[id]?`<a class="chip" href="#/knowledge/${DATA.kpIndex[id].subject}/${id}">${esc(DATA.kpIndex[id].title)}</a>`:"").join("")}
        ${(q.methodIds||[]).map(id=>DATA.mIndex[id]?`<a class="chip" href="#/methods/${DATA.mIndex[id].subject}/${id}">${esc(DATA.mIndex[id].name)}</a>`:"").join("")}
        <button class="icon-btn fav ${(state.favorites.questions||[]).includes(q.id)?"on":""}" id="fav-q" title="收藏">${ic("star")}</button>
      </div>
    </div>`;
  }

  function submitCurrent(user) {
    loadSession();
    const qid = session.items[session.idx];
    const q = DATA.qIndex[qid];
    const result = checkQuestion(q, user);
    const spent = Date.now() - (session.qStart || session.start);
    session.answers[qid] = { user, result, spent, reasons:[], note:"" };
    if (result.correct !== null) recordAnswer(qid, !!result.correct, spent, q.subject, q.knowledgeIds);
    saveSession();
    return result;
  }

  function pagePracticeResult() {
    loadSession();
    if (!session) return empty("没有结果","","#/practice","返回");
    const items = session.items.map(id => ({q:DATA.qIndex[id], a:session.answers[id]}));
    const scored = items.filter(x => x.a && x.a.result && x.a.result.score!=null);
    const totalFull = sum(items.map(x => x.q?.score||5));
    const totalGot = sum(scored.map(x => x.a.result.score||0));
    const correct = items.filter(x => x.a?.result?.correct===true).length;
    const pending = items.filter(x => x.a?.result?.pending).length;
    // log
    if (!session.logged) {
      state.practiceLog.unshift({
        id: uid(), title: session.title, subject: session.subject,
        start: session.start, end: Date.now(), total: items.length,
        correct, score: totalGot, full: totalFull, qids: session.items
      });
      session.logged = true;
      saveSession(); save();
      checkinToday(Math.round((Date.now()-session.start)/60000));
    }
    return `
      <div class="quiz-shell">
        <div class="card result-hero">
          <div class="score">${totalFull?Math.round(totalGot/totalFull*100):Math.round(correct/items.length*100)}<span style="font-size:22px">分</span></div>
          <div class="sub">${esc(session.title)} · 对 ${correct}/${items.length}${pending?` · ${pending} 道待自评`:""} · 得分 ${totalGot}/${totalFull}</div>
          <div style="margin-top:18px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <a class="btn btn-primary" href="#/practice">再练一组</a>
            <a class="btn btn-ghost" href="#/wrong">查看错题</a>
            <a class="btn btn-ghost" href="#/stats">成绩分析</a>
          </div>
        </div>
        <div class="card card-pad">
          ${items.map((x,i)=>{
            const ok = x.a?.result?.correct;
            const mark = ok===true?"✓":ok===false?"✗":"·";
            const color = ok===true?"var(--ok)":ok===false?"var(--cinnabar)":"var(--muted)";
            return `<a href="#/practice/run" data-jump="${i}" class="jump-q" style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:inherit;text-decoration:none">
              <b style="color:${color};width:24px">${mark}</b>
              <span>${i+1}. ${esc(stripHtml(x.q?.stem||"").slice(0,70))}…</span>
              <span class="muted" style="margin-left:auto">${x.a?.result?.score??"—"}/${x.q?.score||5}</span>
            </a>`;
          }).join("")}
        </div>
      </div>`;
  }

  /* ---------- exams ---------- */
  function pageExams() {
    const exams = DATA.exams||[];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/exam","模拟卷"]])}<h1 class="h1">模拟卷</h1>
      <p class="lead">结构接近新高考试卷。客观题自动判分，解答题对照评分标准自评。这些是精编练习卷，不是某一年的高考真题。</p></div></div>
      ${exams.length?`<div class="exam-grid">${exams.map(e=>{
        const logs = (state.examLog||[]).filter(l=>l.paperId===e.id);
        const last = logs[0];
        return `<div class="card exam-card card-hover">
          <h3>${esc(e.title)}</h3>
          <p class="meta">${esc(subjName(e.subject))} · ${e.minutes} 分钟 · 满分 ${e.full} 分 · ${e.questions?.length||0} 题</p>
          <p class="muted" style="margin:8px 0 14px">${esc(e.note||"")}</p>
          <div style="display:flex;gap:8px;align-items:center">
            <a class="btn btn-primary btn-sm" href="#/exam/${e.id}">开始作答</a>
            ${last?`<span class="muted">上次 ${last.score}/${e.full}</span>`:""}
          </div>
        </div>`;
      }).join("")}</div>`:empty("还没有模拟卷","题目准备好后会在这里出现。","#/practice","先去刷题")}
    `;
  }

  let examSess = null;
  function loadExam(){ try{ examSess = JSON.parse(sessionStorage.getItem("qingjin-exam")||"null"); }catch(e){ examSess=null; } }
  function saveExam(){ try{ if(examSess) sessionStorage.setItem("qingjin-exam", JSON.stringify(examSess)); else sessionStorage.removeItem("qingjin-exam"); }catch(e){} }

  function pageExamStart(id) {
    const e = (DATA.exams||[]).find(x=>x.id===id);
    if (!e) return empty("没有找到这份试卷","","#/exam","返回");
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/exam","模拟卷"],["#",e.title]])}
        <h1 class="h1">${esc(e.title)}</h1>
        <p class="lead">${esc(subjName(e.subject))} · ${e.minutes} 分钟 · 满分 ${e.full} 分<br>${esc(e.note||"精编练习，不是高考真题。")}</p>
      </div></div>
      <div class="card card-pad" style="max-width:640px">
        <p>计时开始后请尽量一次做完。中途关闭页面可以继续，时间会继续计算。到时会提示，可以补交。</p>
        <ul>${(e.sections||[]).map(s=>`<li>${esc(s.name)}：${s.count} 题，共 ${s.score} 分</li>`).join("")}</ul>
        <button class="btn btn-primary btn-lg" id="exam-go" data-id="${e.id}">开始计时作答</button>
      </div>`;
  }

  function pageExamRun() {
    loadExam();
    if (!examSess) return empty("没有进行中的试卷","","#/exam","返回");
    const e = (DATA.exams||[]).find(x=>x.id===examSess.paperId);
    const qid = examSess.items[examSess.idx];
    const q = DATA.qIndex[qid];
    if (!e||!q) return empty("试卷数据不完整","","#/exam","返回");
    const remain = Math.max(0, examSess.limit*60 - Math.floor((Date.now()-examSess.start)/1000));
    const answered = examSess.answers[qid];
    return `
      <div class="exam-layout">
        <div>
          <div class="quiz-top">
            <div class="quiz-meta">${esc(e.title)}</div>
            <div class="timer ${remain<300?"warn":""}" id="exam-timer">${fmtRemain(remain)}</div>
            <button class="btn btn-ghost btn-sm" id="exam-submit-all">交卷</button>
          </div>
          <div class="card card-pad">
            <div class="meta-row" style="margin-bottom:10px">第 ${examSess.idx+1} 题 ${tagType(q.type)} · ${q.score||5} 分</div>
            ${q.passage?`<div class="passage"><div class="passage-title">${esc(q.passageTitle||"阅读材料")}</div><div class="passage-body">${trusted(q.passage)}</div></div>`:""}
            <div class="stem">${trusted(q.stem)}</div>
            ${renderInput(q, answered ? {user:answered.user, result:null} : null)}
            <div class="quiz-actions">
              <button class="btn btn-ghost" id="ex-prev" ${examSess.idx===0?"disabled":""}>上一题</button>
              <button class="btn btn-primary" id="ex-save">${examSess.idx+1>=examSess.items.length?"保存并检查":"保存并下一题"}</button>
              <button class="btn btn-ghost" id="ex-flag">${examSess.flags?.[qid]?"取消标记":"标记"}</button>
            </div>
          </div>
        </div>
        <div class="card card-pad">
          <div class="muted" style="margin-bottom:8px">答题卡</div>
          <div class="exam-nav" id="exam-nav">
            ${examSess.items.map((id,i)=>{
              let cls="";
              if (i===examSess.idx) cls+=" cur";
              if (examSess.answers[id]) cls+=" did";
              if (examSess.flags?.[id]) cls+=" flag";
              return `<button type="button" class="${cls}" data-i="${i}">${i+1}</button>`;
            }).join("")}
          </div>
        </div>
      </div>`;
  }

  function finishExam() {
    loadExam();
    if (!examSess) return;
    const e = (DATA.exams||[]).find(x=>x.id===examSess.paperId);
    let score=0, full=e?.full||0, details=[];
    for (const id of examSess.items) {
      const q = DATA.qIndex[id];
      const u = examSess.answers[id]?.user;
      const r = q ? checkQuestion(q, u) : {score:0,full:0};
      if (q && r.correct!==null && u!=null) recordAnswer(id, !!r.correct, 0, q.subject, q.knowledgeIds);
      if (r.score!=null) score += r.score;
      details.push({qid:id, result:r, user:u});
      if (examSess.answers[id]) examSess.answers[id].result = r;
    }
    examSess.finished = true;
    examSess.score = score;
    examSess.details = details;
    examSess.end = Date.now();
    state.examLog.unshift({ id:uid(), paperId:examSess.paperId, title:e?.title, start:examSess.start, end:examSess.end, score, full, details });
    save(); saveExam();
    go("/exam/"+examSess.paperId+"/result");
  }

  function pageExamResult(id) {
    loadExam();
    const log = (examSess && examSess.paperId===id && examSess.finished) ? examSess :
      (state.examLog||[]).find(l=>l.paperId===id);
    const e = (DATA.exams||[]).find(x=>x.id===id);
    if (!log||!e) return empty("没有这份卷的成绩","","#/exam","返回");
    const score = log.score||0;
    return `
      <div class="quiz-shell">
        <div class="card result-hero">
          <div class="score">${score}<span style="font-size:20px">/${e.full}</span></div>
          <div class="sub">${esc(e.title)} · 用时 ${Math.round(((log.end||Date.now())-log.start)/60000)} 分钟</div>
        </div>
        <div class="card card-pad">
          ${(log.details||examSess?.items||[]).map((d,i)=>{
            const qid = d.qid||d;
            const q = DATA.qIndex[qid];
            const r = d.result||{};
            return `<div style="padding:12px 0;border-bottom:1px solid var(--line)">
              <div class="meta-row">${i+1}. ${tagType(q?.type)} ${r.correct===true?"<span style='color:var(--ok)'>正确</span>":r.correct===false?"<span style='color:var(--cinnabar)'>不准确</span>":"<span class='muted'>待自评</span>"}
                <span class="muted">${r.score??"—"}/${q?.score||5}</span></div>
              <div class="prose" style="margin-top:6px">${trusted(q?.stem||"")}</div>
              <details style="margin-top:8px"><summary>查看解析</summary>${q?renderSolution(q,{user:d.user,result:r,reasons:[]}):""}</details>
            </div>`;
          }).join("")}
        </div>
        <p style="margin-top:16px"><a class="btn btn-ghost" href="#/exam">返回试卷列表</a></p>
      </div>`;
  }


  /* ---------- wrong book / review ---------- */
  function pageWrong() {
    const filter = current.query || {};
    let items = state.wrong.filter(w => !w.mastered || filter.all==="1");
    if (filter.s) items = items.filter(w => w.subject===filter.s);
    if (filter.r) items = items.filter(w => w.reason===filter.r || (w.reasons||[]).includes(filter.r));
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/wrong","错题本"]])}<h1 class="h1">错题本</h1>
      <p class="lead">答错的题目会自动进来。加上错因后，复习队列会按间隔再推给你。</p></div>
      <div style="display:flex;gap:8px">
        ${items.length?`<a class="btn btn-primary btn-sm" href="#/practice/setup?mode=wrong">错题重练</a>`:""}
      </div></div>
      <div class="filter-bar">
        <a class="chip ${!filter.s?"on":""}" href="#/wrong">全部科目</a>
        ${selectedSubjects().map(s=>`<a class="chip ${filter.s===s?"on":""}" href="#/wrong?s=${s}">${subjName(s)}</a>`).join("")}
        ${REASONS.map(([id,n])=>`<a class="chip ${filter.r===id?"on":""}" href="#/wrong?r=${id}${filter.s?"&s="+filter.s:""}">${n}</a>`).join("")}
      </div>
      ${items.length? items.map(w => {
        const q = DATA.qIndex[w.qid];
        if (!q) return "";
        const due = state.sm2[w.qid];
        const isDue = due && due.due <= Date.now();
        return `<a class="card card-hover wrong-item" href="#/practice/setup?mode=one&qid=${w.qid}" style="margin-bottom:10px;display:block">
          <div class="meta-row">${tagType(q.type)} ${tagDiff(q.difficulty)} <span class="tag">${esc(subjName(q.subject))}</span>
            ${w.reason||(w.reasons||[])[0]?`<span class="tag">${esc((REASONS.find(r=>r[0]===(w.reason||w.reasons[0]))||[])[1]||"")}</span>`:""}
            ${isDue?`<span class="tag due-badge">待复习</span>`:""}
            <span class="muted">错 ${w.times||1} 次</span>
          </div>
          <div class="stem-s">${esc(stripHtml(q.stem).slice(0,110))}</div>
        </a>`;
      }).join("") : empty("错题本是空的","答题正确是好事。一旦有错题，会出现在这里。","#/practice","去刷题")}
    `;
  }

  function pageReview() {
    const due = dueReviews().map(c => ({...c, q: DATA.qIndex[c.id]})).filter(x=>x.q);
    // also add wrong items not in sm2
    const extra = state.wrong.filter(w => !w.mastered && !state.sm2[w.qid]).map(w => ({id:w.qid, q:DATA.qIndex[w.qid], due:0})).filter(x=>x.q);
    const items = [...due, ...extra];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/review","复习"]])}<h1 class="h1">间隔复习</h1>
      <p class="lead">根据艾宾浩斯间隔（SM-2）排出今天该看的题。记得越牢，下次隔得越久。</p></div></div>
      ${items.length? `
        <p class="muted">今天待复习 ${items.length} 题。</p>
        <div style="margin-bottom:14px"><button class="btn btn-primary" id="rev-start">开始复习</button></div>
        <div class="grid grid-2">${items.slice(0,20).map(x=>`<div class="card card-pad"><div class="meta-row">${tagType(x.q.type)} ${esc(subjName(x.q.subject))}</div><p>${esc(stripHtml(x.q.stem).slice(0,80))}…</p></div>`).join("")}</div>
      `: empty("今天没有到期的复习","先去做新题，错过的会按间隔回来。","#/practice","去刷题")}
    `;
  }

  /* ---------- stats ---------- */
  function pageStats() {
    const logs = state.practiceLog||[];
    const exams = state.examLog||[];
    const mocks = state.mockScores||[];
    const answered = sum(Object.values(state.mastery).map(m=>m.correct+m.wrong));
    const correct = sum(Object.values(state.mastery).map(m=>m.correct));
    const acc = answered? correct/answered : 0;
    const minutes = sum(Object.values(state.checkins).map(c=>c.minutes||0));
    const sel = selectedSubjects();
    // by subject accuracy
    const byS = sel.map(s => {
      const ks = subjectKnowledge(s);
      let c=0,w=0;
      ks.forEach(k => { const m=state.mastery[k.id]; if(m){c+=m.correct;w+=m.wrong;} });
      return {s, acc: (c+w)?c/(c+w):0, n:c+w};
    });
    const weak = weakKnowledge(8);
    // trend last 14 days
    const days = Array.from({length:14},(_,i)=>{
      const d=new Date(); d.setDate(d.getDate()-(13-i));
      const k=todayStr(d);
      const ls = logs.filter(l => fmtDate(l.end||l.start)===k);
      const n = sum(ls.map(l=>l.total||0)), c=sum(ls.map(l=>l.correct||0));
      return {k, acc:n?c/n:null, n, min:(state.checkins[k]||{}).minutes||0};
    });
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/stats","成绩"]])}<h1 class="h1">成绩与分析</h1>
      <p class="lead">正确率、薄弱点和模考走势都在这里。目标分可以在设置里改。</p></div></div>
      <div class="stat-nums">
        <div class="card stat-num"><div class="n">${answered?`${Math.round(acc*100)}<span style="font-size:16px">%</span>`:"—"}</div><div class="l">练习正确率</div></div>
        <div class="card stat-num"><div class="n">${answered}</div><div class="l">已做题次</div></div>
        <div class="card stat-num"><div class="n">${state.wrong.filter(w=>!w.mastered).length}</div><div class="l">未消化错题</div></div>
        <div class="card stat-num"><div class="n">${minutes}</div><div class="l">累计学习分钟</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card chart-box">
          <h2 class="h2">各科正确率</h2>
          ${radarSVG(byS)}
        </div>
        <div class="card chart-box">
          <h2 class="h2">近两周练习走势</h2>
          ${trendSVG(days)}
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:14px">
        <div>
          <div class="section-title"><h2>建议下一步</h2></div>
          ${weak.length?weak.map(k=>kpCard(k)).join(""):`<div class="card card-pad muted">多做几组题后会给出建议。</div>`}
        </div>
        <div>
          <div class="section-title"><h2>知识点热力</h2></div>
          <div class="card card-pad">${heatMap(sel)}</div>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:14px">
        <div class="section-title"><h2>真实模考记录</h2></div>
        <p class="muted">把学校或机构模考的分数记下来，对照目标分看趋势。</p>
        ${mocks.length?`<ul class="rec-list">${mocks.map(m=>`<li><b>${esc(m.name||"模考")}</b> · ${m.total} 分（目标 ${state.profile.targetScore||600}）${m.date? " · "+esc(m.date):""}
          <button class="btn btn-ghost btn-sm" data-del-mock="${m.id}">删除</button></li>`).join("")}</ul>`:""}
        ${mockTrendSVG(mocks)}
        <form id="mock-form" class="mock-form" style="margin-top:12px">
          <div class="row"><label class="lbl">名称</label><input class="field" name="name" placeholder="例如：第一次月考" required></div>
          <div class="row"><label class="lbl">日期</label><input class="field" name="date" type="date" value="${todayStr()}"></div>
          ${sel.map(s=>`<div class="row"><label class="lbl">${subjName(s)}</label><input class="field" name="sc-${s}" type="number" min="0" max="${SUBJECT_META[s].full}" placeholder="0-${SUBJECT_META[s].full}"></div>`).join("")}
          <div class="row"><label class="lbl">总分</label><input class="field" name="total" type="number" min="0" max="750" placeholder="可留空，按各科自动加总"></div>
          <button class="btn btn-primary btn-sm" type="submit">记上一笔</button>
        </form>
      </div>
      <div class="card card-pad" style="margin-top:14px">
        <h2 class="h2">练习与试卷记录</h2>
        <ul class="rec-list">${[...logs.slice(0,8),].map(l=>`<li>${esc(l.title)} · ${fmtDate(l.end||l.start)} · ${l.correct}/${l.total}</li>`).join("") || "<li class='muted'>暂无</li>"}</ul>
        ${exams.length?`<h3 class="h3">模拟卷</h3><ul class="rec-list">${exams.slice(0,6).map(l=>`<li><a href="#/exam/${l.paperId}/result">${esc(l.title)}</a> · ${l.score}/${l.full}</li>`).join("")}</ul>`:""}
      </div>
    `;
  }
  function radarSVG(byS) {
    if (!byS.some(d => d.n)) return `<p class="muted" style="padding:28px 12px;text-align:center">还没有各科练习记录。先去刷题，正确率会显示在这里。</p>`;
    const n = byS.length || 1;
    const R=80, cx=120, cy=100;
    const pts = byS.map((d,i)=>{
      const ang = -Math.PI/2 + i*2*Math.PI/n;
      const r = 16 + d.acc*R;
      return [cx+r*Math.cos(ang), cy+r*Math.sin(ang), d];
    });
    const grid = [0.25,0.5,0.75,1].map(t => {
      const g = byS.map((_,i)=>{
        const ang=-Math.PI/2+i*2*Math.PI/n;
        const r=16+t*R;
        return `${cx+r*Math.cos(ang)},${cy+r*Math.sin(ang)}`;
      }).join(" ");
      return `<polygon points="${g}" fill="none" stroke="var(--line)" stroke-width="1"/>`;
    }).join("");
    const axes = byS.map((d,i)=>{
      const ang=-Math.PI/2+i*2*Math.PI/n;
      const x=cx+(16+R)*Math.cos(ang), y=cy+(16+R)*Math.sin(ang);
      const lx=cx+(16+R+16)*Math.cos(ang), ly=cy+(16+R+16)*Math.sin(ang);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)"/>
        <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="var(--muted)">${esc(SUBJECT_META[d.s].short)} ${d.n?Math.round(d.acc*100)+"%":"—"}</text>`;
    }).join("");
    const poly = pts.map(p=>p[0]+","+p[1]).join(" ");
    return `<svg viewBox="0 0 240 210" role="img" aria-label="各科正确率雷达图">${grid}${axes}
      <polygon points="${poly}" fill="rgba(30,92,82,.18)" stroke="var(--teal)" stroke-width="2"/>
      ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--teal)"/>`).join("")}</svg>`;
  }
  function trendSVG(days) {
    const w=360,h=160, padL=28, padB=24;
    const vals = days.map(d=>d.acc);
    const max = 1;
    const pts = days.map((d,i)=>{
      const x = padL + i*(w-padL-8)/(days.length-1||1);
      const y = d.acc==null ? null : (h-padB) - d.acc*(h-padB-16);
      return {x,y,d};
    });
    const line = pts.filter(p=>p.y!=null);
    const path = line.map((p,i)=> (i?"L":"M")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="正确率走势">
      <line x1="${padL}" y1="${h-padB}" x2="${w-8}" y2="${h-padB}" stroke="var(--line)"/>
      <line x1="${padL}" y1="16" x2="${padL}" y2="${h-padB}" stroke="var(--line)"/>
      ${path?`<path d="${path}" fill="none" stroke="var(--teal)" stroke-width="2"/>`:""}
      ${line.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="var(--teal)"/>`).join("")}
      ${pts.filter((_,i)=>i%3===0).map(p=>`<text x="${p.x}" y="${h-8}" text-anchor="middle" font-size="10" fill="var(--faint)">${p.d.k.slice(5)}</text>`).join("")}
    </svg>`;
  }
  function mockTrendSVG(mocks) {
    if (mocks.length<2) return "";
    const arr = [...mocks].reverse();
    const w=400,h=120, padL=36, padB=20;
    const max = Math.max(750, ...arr.map(m=>m.total||0), state.profile.targetScore||600);
    const min = Math.min(400, ...arr.map(m=>m.total||0))-20;
    const pts = arr.map((m,i)=>{
      const x=padL+i*(w-padL-8)/(arr.length-1||1);
      const y=(h-padB)-( (m.total-min)/(max-min) )*(h-padB-10);
      return {x,y,m};
    });
    const path = pts.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ");
    const ty = (h-padB)-((state.profile.targetScore||600)-min)/(max-min)*(h-padB-10);
    return `<svg viewBox="0 0 ${w} ${h}" style="margin-top:8px" aria-label="模考走势">
      <line x1="${padL}" y1="${ty}" x2="${w-8}" y2="${ty}" stroke="var(--gold)" stroke-dasharray="4 3"/>
      <path d="${path}" fill="none" stroke="var(--teal)" stroke-width="2"/>
      ${pts.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--teal)"/>`).join("")}
    </svg>`;
  }
  function heatMap(sel) {
    return sel.map(s => {
      const ks = subjectKnowledge(s);
      const cells = ks.slice(0,48).map(k=>{
        const v = masteryOf(k.id);
        const m = state.mastery[k.id];
        let cls="";
        if (!m) cls="";
        else if (v>=0.75) cls="l4";
        else if (v>=0.55) cls="l3";
        else if (v>=0.4) cls="l2";
        else if ((m.correct+m.wrong)>0 && v>=0.25) cls="w1";
        else cls="w2";
        return `<i class="${cls}" title="${esc(k.title)} ${Math.round(v*100)}%"></i>`;
      }).join("");
      return `<div class="heat-row"><span>${esc(SUBJECT_META[s].short)}</span><div class="heat-cells">${cells}</div></div>`;
    }).join("") || "<p class='muted'>暂无</p>";
  }

  /* ---------- plan / pomodoro ---------- */
  let pomo = { running:false, mode:"focus", remain:25*60, timer:null, started:0 };
  function pagePlan() {
    const tasks = todayTasks();
    const done = tasks.filter(t=>t.done).length;
    const cd = countdown();
    let phase = "系统巩固";
    if (cd.days<=7) phase="回看与调整";
    else if (cd.days<=30) phase="模拟冲刺";
    else if (cd.days<=90) phase="专项突破";
    const cal = calendarHTML();
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/plan","冲刺计划"]])}<h1 class="h1">冲刺计划</h1>
      <p class="lead">现在处于「${phase}」阶段（距高考 ${cd.days} 天）。每天完成任务会自动打卡。</p></div></div>
      <div class="grid grid-2">
        <div class="card card-pad">
          <div class="h2">今日任务 <span class="muted">${done}/${tasks.length}</span></div>
          <ul class="task-list">${tasks.map(t=>`
            <li><button class="check ${t.done?"on":""}" data-task="${esc(t.id)}">${t.done?ic("check",12):""}</button>
            <a href="${t.href}">${esc(t.title)}</a></li>`).join("")}</ul>
          <form id="add-task" style="margin-top:12px;display:flex;gap:8px">
            <input class="field" name="title" placeholder="添加一项自己的任务" required>
            <button class="btn btn-soft btn-sm" type="submit">添加</button>
          </form>
        </div>
        <div class="card pomo" id="pomo">
          <div class="pomo-ring">
            ${pomoRing(pomo.remain, pomo.mode==="focus"?25*60:5*60)}
            <div class="pomo-time" id="pomo-time">${fmtRemain(pomo.remain)}</div>
          </div>
          <div class="muted" style="margin-bottom:12px">${pomo.mode==="focus"?"专注 25 分钟":"休息 5 分钟"}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary" id="pomo-tog">${pomo.running?"暂停":"开始"}</button>
            <button class="btn btn-ghost" id="pomo-reset">重置</button>
          </div>
          <p class="muted" style="margin-top:12px">今日专注 ${todayPomoMin()} 分钟 · 目标 ${state.pomodoro.goalMin||90} 分钟</p>
        </div>
      </div>
      <div class="card card-pad" style="margin-top:14px">
        <h2 class="h2">打卡日历</h2>
        ${cal}
        <p class="muted" style="margin-top:8px">连续打卡 ${streakCount()} 天</p>
      </div>
    `;
  }
  function pomoRing(remain, total) {
    const r=96, c=2*Math.PI*r, p=remain/total;
    const dash = c*p;
    return `<svg viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--bg-2)" stroke-width="10"/>
      <circle cx="110" cy="110" r="${r}" fill="none" stroke="var(--teal)" stroke-width="10"
        stroke-linecap="round" stroke-dasharray="${dash} ${c-dash}"/>
    </svg>`;
  }
  function todayPomoMin(){
    const k=todayStr();
    return sum((state.pomodoro.logs||[]).filter(l=>l.date===k).map(l=>l.minutes||0));
  }
  function calendarHTML() {
    const now=new Date();
    const y=now.getFullYear(), m=now.getMonth();
    const first=new Date(y,m,1);
    const start = first.getDay(); // 0 sun
    const days = new Date(y,m+1,0).getDate();
    const cells=[];
    for(let i=0;i<start;i++) cells.push(`<div class="d mute"></div>`);
    for(let d=1;d<=days;d++){
      const key=`${y}-${pad(m+1)}-${pad(d)}`;
      const on=!!state.checkins[key];
      const today=key===todayStr();
      cells.push(`<div class="d ${on?"on":""} ${today?"today":""}" title="${key}">${d}</div>`);
    }
    const hd=["日","一","二","三","四","五","六"].map(x=>`<div class="hd">${x}</div>`).join("");
    return `<div class="cal">${hd}${cells.join("")}</div>`;
  }

  /* ---------- extras: formulas, poetry, words, writing ---------- */
  function pageFormulas(sid) {
    const data = DATA.formulas||{};
    const subjects = Object.keys(data);
    const cur = sid && data[sid] ? sid : (subjects[0]||"");
    const secs = data[cur]||[];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/formulas","公式速查"]])}<h1 class="h1">公式速查</h1>
      <p class="lead">按科目查阅常用公式。可直接打印这一页。</p></div>
      <button class="btn btn-ghost btn-sm" onclick="window.print()">打印</button></div>
      <div class="chip-row" style="margin-bottom:16px">
        ${subjects.map(s=>`<a class="chip ${s===cur?"on":""}" href="#/formulas/${s}">${esc(data[s].name||subjName(s))}</a>`).join("")}
      </div>
      ${(secs.sections||secs||[]).map?"":""}
      ${renderFormulaSections(data[cur])}
    `;
  }
  function renderFormulaSections(pack) {
    if (!pack) return empty("还没有公式表","","#/","返回");
    const secs = pack.sections||pack;
    if (!Array.isArray(secs)) return "";
    return secs.map(sec => `
      <div class="card formula-sec" style="margin-bottom:14px">
        <h3 style="padding:16px 18px 0">${esc(sec.title||sec.name)}</h3>
        ${(sec.items||[]).map(it=>`<div class="formula-item"><div class="nm">${esc(it.name||"")}</div><div>${trusted(it.formula||it.content||"")}</div>${it.note?`<div class="muted">${trusted(it.note)}</div>`:""}</div>`).join("")}
      </div>`).join("");
  }

  function pagePoetry(pid) {
    const list = DATA.poetry||[];
    if (pid) {
      const p = list.find(x=>x.id===pid);
      if (!p) return empty("没有找到这篇","","#/poetry","返回");
      return poetryPractice(p);
    }
    const dyn = list.filter(x=>x.dynasty);
    const groups = [...new Set(list.map(x=>x.dynasty||"其他"))];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/poetry","古诗文默写"]])}<h1 class="h1">古诗文默写</h1>
      <p class="lead">篇目取自新课标推荐背诵范围，点击进入填空默写。文句以通行版本为准。</p></div></div>
      ${groups.map(g=>`<h2 class="h2">${esc(g)}</h2>
        <div class="grid grid-3" style="margin-bottom:16px">
          ${list.filter(x=>(x.dynasty||"其他")===g).map(p=>`<a class="card card-hover poetry-card" href="#/poetry/${p.id}">
            <h3>${esc(p.title)}</h3><div class="author">${esc(p.author||"")} · ${esc(p.dynasty||"")}</div>
          </a>`).join("")}
        </div>`).join("") || empty("篇目准备中","","#/","返回")}
    `;
  }
  function poetryPractice(p) {
    // blanks: hide some sentences or chunks
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/poetry","古诗文默写"],["#",p.title]])}
        <h1 class="h1" style="text-align:center;width:100%">${esc(p.title)}</h1>
        <p class="lead" style="text-align:center">${esc(p.author||"")} ${esc(p.dynasty||"")}</p></div></div>
      <div class="card poetry-card" id="poetry-box" data-id="${p.id}">
        ${renderVerse(p)}
        <div style="margin-top:18px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-primary" id="po-check">核对</button>
          <button class="btn btn-ghost" id="po-reveal">显示全文</button>
          <button class="btn btn-ghost" id="po-retry">再默一次</button>
        </div>
        <p class="muted" style="margin-top:14px;text-align:left">${esc(p.note||"")}</p>
      </div>`;
  }
  function renderVerse(p, reveal=false) {
    const lines = p.lines||[];
    const hide = p.blanks || defaultBlanks(lines);
    return `<div class="verse">${lines.map((ln,i)=>{
      if (reveal || !hide.includes(i)) return `<div>${esc(ln)}</div>`;
      const chars = ln.replace(/[，。？！、；：,.!?]/g,"");
      return `<div><span class="blank"><input data-i="${i}" data-ans="${esc(chars)}" aria-label="第${i+1}句"></span></div>`;
    }).join("")}</div>`;
  }
  function defaultBlanks(lines) {
    if (lines.length<=2) return [0];
    const n = Math.max(1, Math.ceil(lines.length/3));
    const idx=[];
    for (let i=1;i<lines.length && idx.length<n;i+=2) idx.push(i);
    return idx;
  }

  function pageWords() {
    const words = DATA.words||[];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/words","英语词句"]])}<h1 class="h1">英语词句快复习</h1>
      <p class="lead">高考范围内的高频词，看中文想英文，或看英文想中文。也可在「词韵」里做盲打练习。</p></div></div>
      <div class="chip-row" style="margin-bottom:14px">
        <button class="chip on" data-wm="en2zh" id="wm-en2zh">英译中</button>
        <button class="chip" data-wm="zh2en" id="wm-zh2en">中译英（可输入）</button>
      </div>
      <div class="card word-card" id="word-card">
        <p class="muted">点开始，进入一组 15 个词。</p>
        <button class="btn btn-primary" id="wd-start">开始</button>
      </div>
      <div id="wd-slot"></div>
    `;
  }

  function pageWriting(id) {
    const list = DATA.writing||[];
    if (id) {
      const w = list.find(x=>x.id===id);
      if (!w) return empty("没有找到这条素材","","#/writing","返回");
      const fav = (state.favorites.writing||[]).includes(id);
      return `
        <div class="page-head"><div>${crumb([["#/","首页"],["#/writing","作文素材"],["#",w.title]])}
          <h1 class="h1">${esc(w.title)}</h1>
          <div class="theme">${esc(w.theme||"")}</div></div>
          <button class="btn btn-ghost btn-sm fav ${fav?"on":""}" id="fav-wr">${ic("star",16)} ${fav?"已收藏":"收藏"}</button>
        </div>
        <div class="card card-pad prose">
          ${(w.points||[]).map(p=>`<p>${trusted(p)}</p>`).join("")}
          ${w.use?`<h3>可用角度</h3><p>${trusted(w.use)}</p>`:""}
          ${w.example?`<h3>示例表述</h3><p>${trusted(w.example)}</p>`:""}
        </div>`;
    }
    const themes = [...new Set(list.map(w=>w.theme||"综合"))];
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/writing","作文素材"]])}<h1 class="h1">作文素材</h1>
      <p class="lead">按主题整理的事实与角度，用来打开思路，不要整段照搬。</p></div></div>
      ${themes.map(t=>`<h2 class="h2">${esc(t)}</h2>
        <div class="grid grid-2" style="margin-bottom:16px">
          ${list.filter(w=>(w.theme||"综合")===t).map(w=>`<a class="card card-hover writing-card" href="#/writing/${w.id}">
            <div class="theme">${esc(w.theme)}</div><h3>${esc(w.title)}</h3>
            <p class="muted">${esc(stripHtml(w.points?.[0]||"").slice(0,60))}…</p>
          </a>`).join("")}
        </div>`).join("")||empty("素材准备中","","#/","返回")}
    `;
  }

  function pageFavorites() {
    const fk = (state.favorites.knowledge||[]).map(id=>DATA.kpIndex[id]).filter(Boolean);
    const fq = (state.favorites.questions||[]).map(id=>DATA.qIndex[id]).filter(Boolean);
    const fm = (state.favorites.methods||[]).map(id=>DATA.mIndex[id]).filter(Boolean);
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/favorites","收藏"]])}<h1 class="h1">收藏</h1></div></div>
      <h2 class="h2">知识点</h2>
      ${fk.length?fk.map(k=>kpCard(k)).join(""):"<p class='muted'>还没有收藏的知识点。</p>"}
      <h2 class="h2">方法</h2>
      ${fm.length?`<div class="grid grid-2">${fm.map(m=>`<a class="card card-hover method-card" href="#/methods/${m.subject}/${m.id}"><h3>${esc(m.name)}</h3><p>${esc(m.when)}</p></a>`).join("")}</div>`:"<p class='muted'>还没有收藏的方法。</p>"}
      <h2 class="h2">题目</h2>
      ${fq.length?fq.map(q=>`<a class="card card-pad" href="#/practice/setup?mode=one&qid=${q.id}" style="display:block;margin-bottom:8px">${tagType(q.type)} ${esc(stripHtml(q.stem).slice(0,80))}…</a>`).join(""):"<p class='muted'>还没有收藏的题目。</p>"}
    `;
  }

  function pageSearch(q) {
    const qq = (q||"").trim().toLowerCase();
    if (!qq) return `<div class="page-head"><h1 class="h1">搜索</h1><p class="lead">输入知识点、方法或题目中的关键词。</p></div>`;
    const kps = allKnowledge().filter(k => (k.title+k.summary+k.chapter+(k.points||[]).join("")).toLowerCase().includes(qq));
    const mds = allMethods().filter(m => (m.name+m.when+m.explanation).toLowerCase().includes(qq));
    const qs = allQuestions().filter(x => (stripHtml(x.stem)+" "+stripHtml(x.passage||"")+" "+(x.passageTitle||"")).toLowerCase().includes(qq));
    return `
      <div class="page-head"><h1 class="h1">搜索「${esc(q)}」</h1>
      <p class="lead">知识点 ${kps.length} · 方法 ${mds.length} · 题目 ${qs.length}</p></div>
      ${kps.slice(0,20).map(k=>kpCard(k)).join("")}
      ${mds.slice(0,10).map(m=>`<a class="card method-card" href="#/methods/${m.subject}/${m.id}" style="display:block;margin-bottom:8px"><h3>${esc(m.name)}</h3><p>${esc(m.when)}</p></a>`).join("")}
      ${qs.slice(0,15).map(x=>`<a class="card card-pad" href="#/practice/setup?mode=one&qid=${x.id}" style="display:block;margin-bottom:8px">${tagType(x.type)} ${esc(stripHtml(x.stem).slice(0,90))}…</a>`).join("")}
      ${!kps.length&&!mds.length&&!qs.length?empty("没有找到相关内容","换个关键词试试。"):""}
    `;
  }

  function pageSettings() {
    const p = state.profile;
    return `
      <div class="page-head"><div>${crumb([["#/","首页"],["#/settings","设置"]])}<h1 class="h1">设置</h1></div></div>
      <div class="card settings-sec">
        <h2>个人与选科</h2>
        <div class="row" style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-bottom:8px">
          <label class="lbl">称呼</label><input class="field" id="st-name" value="${esc(p.name)}" maxlength="16">
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-bottom:8px">
          <label class="lbl">省份</label>
          <select class="field" id="st-prov"><option value="">未选择</option>${(DATA.meta?.provinces||["北京","上海","广东","江苏","浙江","山东","河南","四川","湖北","湖南","河北","福建","安徽","陕西","辽宁"]).map(x=>`<option ${p.province===x?"selected":""}>${x}</option>`).join("")}</select>
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-bottom:8px">
          <label class="lbl">模式</label>
          <select class="field" id="st-mode"><option value="3+1+2" ${p.mode!=="3+3"?"selected":""}>3+1+2</option><option value="3+3" ${p.mode==="3+3"?"selected":""}>3+3</option></select>
        </div>
        <div id="st-first-wrap" ${p.mode==="3+3"?"hidden":""} style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-bottom:8px">
          <label class="lbl">首选</label>
          <select class="field" id="st-first"><option value="physics" ${p.firstChoice==="physics"?"selected":""}>物理</option><option value="history" ${p.firstChoice==="history"?"selected":""}>历史</option></select>
        </div>
        <div><label class="lbl">${p.mode==="3+3"?"选考三门":"再选两门"}</label>
          <div class="chip-row" id="st-second" style="margin-top:6px">
            ${["physics","history","chemistry","biology","politics","geography"].map(s=>{
              if (p.mode!=="3+3" && (s==="physics"||s==="history")) return "";
              const on=(p.secondChoices||[]).includes(s);
              return `<button type="button" class="chip ${on?"on":""}" data-s="${s}">${SUBJECT_META[s].name}</button>`;
            }).join("")}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;align-items:center;margin-top:10px">
          <label class="lbl">目标总分</label><input class="field" id="st-target" type="number" min="100" max="750" value="${esc(p.targetScore||600)}">
        </div>
      </div>
      <div class="card settings-sec">
        <h2>显示</h2>
        <div class="toggle"><span>护眼模式（偏绿、降低对比）</span><button class="switch ${p.theme==="eyecare"?"on":""}" id="st-eye" role="switch" aria-checked="${p.theme==="eyecare"}"><i></i></button></div>
        <div class="toggle"><span>正文字号</span>
          <span>${["sm","md","lg"].map(s=>`<button class="chip ${p.fontSize===s?"on":""}" data-sz="${s}">${s==="sm"?"小":s==="lg"?"大":"中"}</button>`).join("")}</span>
        </div>
      </div>
      <div class="card settings-sec">
        <h2>数据备份</h2>
        <p class="muted">进度保存在这个浏览器里。换设备或清理缓存前，请先导出。</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn-primary" id="st-export">${ic("download",16)} 导出 JSON</button>
          <label class="btn btn-ghost">${ic("upload",16)} 导入<input type="file" id="st-import" accept="application/json" hidden></label>
          <button class="btn btn-danger" id="st-reset">清空本地数据</button>
        </div>
      </div>
      <div class="card settings-sec">
        <h2>关于青衿</h2>
        <p>青衿是面向高三学生的高考冲刺学习站，用于梳理知识点、刷题、分析解题方法和跟踪成绩。题目为精编练习，不是某一年高考真题。公式与解答已尽量核对，若发现差错欢迎自行更正笔记并提醒维护者。</p>
        <p class="muted">2027 年高考全国统考语文于 6 月 7 日 9:00 开考，选考科目由各省安排，多为 6 月 8 日至 9 日或 10 日。倒计时以 6 月 7 日为准。</p>
      </div>
    `;
  }


  /* ---------- bind ---------- */
  function toggleFav(kind, id, btn) {
    const arr = state.favorites[kind] || (state.favorites[kind]=[]);
    const i = arr.indexOf(id);
    if (i>=0) arr.splice(i,1); else arr.unshift(id);
    save();
    if (btn) {
      const on = arr.includes(id);
      btn.classList.toggle("on", on);
      btn.innerHTML = ic("star",16)+" "+(on?"已收藏":"收藏");
    }
    toast(arr.includes(id)?"已收藏":"已取消收藏");
  }

  function bindPage(r) {
    const p = r.parts[0]||"";

    // countdown tick
    if (p==="" || p==="home") startClock();
    else stopClock();

    // tasks
    $$("[data-task]").forEach(b => b.addEventListener("click", () => {
      toggleTask(b.dataset.task);
      route();
    }));

    if (p==="onboard") bindOnboard();
    if (p==="knowledge") bindKnowledge();
    if (p==="methods") {
      $("#fav-md")?.addEventListener("click", ev => toggleFav("methods", r.parts[2], ev.currentTarget));
    }
    if (p==="practice") bindPractice(r);
    if (p==="exam") bindExam(r);
    if (p==="review") {
      $("#rev-start")?.addEventListener("click", () => {
        const due = [...dueReviews().map(c=>c.id), ...state.wrong.filter(w=>!w.mastered).map(w=>w.qid)];
        const ids = [...new Set(due)].filter(id=>DATA.qIndex[id]).slice(0,15);
        if (!ids.length) return toast("没有可复习的题目");
        session = { mode:"wrong", subject:"all", title:"间隔复习", items:ids, idx:0, answers:{}, start:Date.now(), limit:0, n:ids.length };
        saveSession(); go("/practice/run");
      });
    }
    if (p==="stats") bindStats();
    if (p==="plan") bindPlan();
    if (p==="poetry") bindPoetry();
    if (p==="words") bindWords();
    if (p==="writing") {
      $("#fav-wr")?.addEventListener("click", ev => toggleFav("writing", r.parts[1], ev.currentTarget));
    }
    if (p==="settings") bindSettings();
    if (p==="practice" && r.parts[1]==="setup") bindSetup(r.query);
  }

  function bindOnboard() {
    const pick = (sel, key, single) => {
      $$(sel).forEach(b => b.addEventListener("click", () => {
        if (key==="mode") state.profile.mode = b.dataset.mode;
        if (key==="first") state.profile.firstChoice = b.dataset.first;
        if (key==="second") {
          const s = b.dataset.second;
          let arr = state.profile.secondChoices||[];
          const need = state.profile.mode==="3+3"?3:2;
          if (arr.includes(s)) arr = arr.filter(x=>x!==s);
          else { arr = [...arr, s]; if (arr.length>need) arr = arr.slice(-need); }
          state.profile.secondChoices = arr;
        }
        save(); route();
      }));
    };
    pick("[data-mode]","mode");
    pick("[data-first]","first");
    pick("[data-second]","second");
    $("#ob-go")?.addEventListener("click", () => {
      state.profile.name = $("#ob-name")?.value.trim()||"";
      state.profile.targetScore = Number($("#ob-target")?.value)||600;
      const need = state.profile.mode==="3+3"?3:2;
      if ((state.profile.secondChoices||[]).length !== need) {
        toast(state.profile.mode==="3+3"?"请选三门选考科目":"请选两门再选科目");
        return;
      }
      state.profile.onboarded = true;
      save(); go("/");
    });
  }

  function bindKnowledge() {
    $("#fav-kp")?.addEventListener("click", ev => {
      const kid = current.parts[2];
      toggleFav("knowledge", kid, ev.currentTarget);
    });
    $("#kp-note")?.addEventListener("input", debounce(e => {
      state.notes[current.parts[2]] = e.target.value;
      save();
    }, 400));
    $("#kp-filter")?.addEventListener("input", e => {
      const q = e.target.value.trim();
      $$("#kp-list .kp-item").forEach(a => {
        a.style.display = !q || (a.dataset.title||"").includes(q) ? "" : "none";
      });
    });
  }

  function bindSetup(q) {
    $("#su-start")?.addEventListener("click", () => {
      const subject = $("#su-subject")?.value || q.subject;
      const n = Number($("#su-n")?.value)||10;
      const diff = $("#su-diff")?.value||"";
      const kid = $("#su-kid")?.value||q.kid||"";
      const mid = $("#su-mid")?.value||q.mid||"";
      const limit = Number($("#su-limit")?.value)||0;
      const mode = q.mode||"rand";
      if (mode==="wrong") {
        const ids = state.wrong.filter(w=>!w.mastered && (!subject||subject==="all"||w.subject===subject)).map(w=>w.qid);
        const items = ids.map(id=>DATA.qIndex[id]).filter(Boolean);
        for (let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}
        session = {mode:"wrong", subject, title:"错题重练", items:items.slice(0,n).map(x=>x.id), idx:0, answers:{}, start:Date.now(), limit:0, n};
        if (!session.items.length) { toast("没有符合条件的错题"); return; }
        saveSession(); go("/practice/run"); return;
      }
      startSession({mode, subject, kid, mid, n, diff, limit, title: sessionTitle({mode,subject,kid,mid})});
    });
  }

  function bindPractice(r) {
    $("#drop-sess")?.addEventListener("click", () => { session=null; saveSession(); route(); });
    if (r.parts[1]==="run") bindRun();
    if (r.parts[1]==="result") {
      $$(".jump-q").forEach(a => a.addEventListener("click", ev => {
        ev.preventDefault();
        loadSession();
        session.idx = Number(a.dataset.jump);
        saveSession(); go("/practice/run");
      }));
    }
  }

  function collectUser(q) {
    if (q.type==="single") {
      const p = $("#opts .opt.picked");
      return p ? p.dataset.v : "";
    }
    if (q.type==="multi") {
      return $$("#opts .opt.picked").map(x=>x.dataset.v).sort().join("");
    }
    if (q.type==="fill"||q.type==="recite") return $("#fill-in")?.value||"";
    if (q.type==="essay"||q.type==="write") return { text: $("#essay-in")?.value||"", selfScore: null };
    return "";
  }

  function bindRun() {
    loadSession();
    if (!session) return;
    const q = DATA.qIndex[session.items[session.idx]];
    session.qStart = Date.now();
    saveSession();
    // option picking
    $$("#opts .opt").forEach(b => b.addEventListener("click", () => {
      if (q.type==="single") {
        $$("#opts .opt").forEach(x=>x.classList.remove("picked"));
        b.classList.add("picked");
      } else {
        b.classList.toggle("picked");
      }
    }));
    $("#q-submit")?.addEventListener("click", () => {
      const user = collectUser(q);
      if (q.type==="single" && !user) { toast("请先选择一个选项"); return; }
      if ((q.type==="fill"||q.type==="recite") && !String(user).trim()) { toast("请先填写答案"); return; }
      submitCurrent(user);
      // re-render to show solution
      route();
    });
    $("#q-skip")?.addEventListener("click", () => {
      if (session.idx+1>=session.items.length) { go("/practice/result"); return; }
      session.idx++; saveSession(); route();
    });
    $("#q-next")?.addEventListener("click", () => {
      // save essay self score if any
      const a = session.answers[q.id];
      if (a && (q.type==="essay"||q.type==="write") && a.result && a.result.pending) {
        toast("请先给自己打分"); return;
      }
      if (session.idx+1>=session.items.length) { go("/practice/result"); return; }
      session.idx++; saveSession(); route();
    });
    $$("#self-score button").forEach(b => b.addEventListener("click", () => {
      const sc = Number(b.dataset.sc);
      const a = session.answers[q.id];
      if (!a) return;
      a.user = Object.assign(typeof a.user==="object"?a.user:{text:""}, {selfScore:sc});
      a.result = checkQuestion(q, a.user);
      if (a.result.correct!=null) recordAnswer(q.id, !!a.result.correct, a.spent, q.subject, q.knowledgeIds);
      saveSession();
      $$("#self-score button").forEach(x=>x.classList.toggle("on", Number(x.dataset.sc)===sc));
    }));
    $$("#reasons .chip").forEach(b => b.addEventListener("click", () => {
      const a = session.answers[q.id];
      if (!a) return;
      a.reasons = a.reasons||[];
      const id=b.dataset.rs;
      if (a.reasons.includes(id)) a.reasons=a.reasons.filter(x=>x!==id); else a.reasons.push(id);
      // write back to wrong book
      const w = state.wrong.find(x=>x.qid===q.id && !x.mastered);
      if (w) { w.reasons=a.reasons; w.reason=a.reasons[0]||""; }
      save(); saveSession();
      b.classList.toggle("on");
    }));
    $("#wrong-note")?.addEventListener("change", e => {
      const a = session.answers[q.id];
      if (a) a.note=e.target.value;
      const w = state.wrong.find(x=>x.qid===q.id && !x.mastered);
      if (w) w.note=e.target.value;
      save(); saveSession();
    });
    $("#fav-q")?.addEventListener("click", ev => {
      toggleFav("questions", q.id, ev.currentTarget);
      ev.currentTarget.classList.toggle("on", (state.favorites.questions||[]).includes(q.id));
    });
    // keyboard
    const onKey = (e) => {
      if (e.target && (e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")) return;
      if (q.type==="single"||q.type==="multi") {
        const n = e.key.toUpperCase().charCodeAt(0)-65;
        if (n>=0 && n< (q.options||[]).length) {
          const btn = $(`#opts .opt[data-v="${String.fromCharCode(65+n)}"]`);
          btn?.click();
        }
      }
      if (e.key==="Enter" && !e.shiftKey) {
        ($("#q-submit")||$("#q-next"))?.click();
      }
    };
    document.addEventListener("keydown", onKey, {once:false});
    // store to remove? we'll leave, route rebuilds. To avoid leaks, mark
    if (bindRun._prev) document.removeEventListener("keydown", bindRun._prev);
    bindRun._prev = onKey;

    // timer
    if (session.limit) {
      const tick = () => {
        const el = $("#quiz-timer");
        if (!el) return;
        const remain = Math.max(0, session.limit*60 - Math.floor((Date.now()-session.start)/1000));
        el.textContent = fmtRemain(remain);
        el.classList.toggle("warn", remain<60);
        if (remain<=0) { toast("时间到，正在结算"); go("/practice/result"); return; }
        session._tick = setTimeout(tick, 500);
      };
      clearTimeout(session._tick); tick();
    }
  }

  function bindExam(r) {
    $("#exam-go")?.addEventListener("click", ev => {
      const id = ev.currentTarget.dataset.id;
      const e = (DATA.exams||[]).find(x=>x.id===id);
      if (!e) return;
      examSess = { paperId:id, items:e.questions.slice(), idx:0, answers:{}, flags:{}, start:Date.now(), limit:e.minutes, finished:false };
      saveExam(); go("/exam/run");
    });
    if (r.parts[1]==="run") {
      loadExam();
      const q = DATA.qIndex[examSess.items[examSess.idx]];
      $$("#opts .opt").forEach(b => b.addEventListener("click", () => {
        if (q.type==="single") { $$("#opts .opt").forEach(x=>x.classList.remove("picked")); b.classList.add("picked"); }
        else b.classList.toggle("picked");
      }));
      const saveAns = () => {
        const user = collectUser(q);
        examSess.answers[q.id] = { user };
        saveExam();
      };
      $("#ex-save")?.addEventListener("click", () => {
        saveAns();
        if (examSess.idx+1>=examSess.items.length) { toast("已到最后一题，请检查答题卡后交卷"); route(); return; }
        examSess.idx++; saveExam(); route();
      });
      $("#ex-prev")?.addEventListener("click", () => { saveAns(); examSess.idx=Math.max(0,examSess.idx-1); saveExam(); route(); });
      $("#ex-flag")?.addEventListener("click", () => { examSess.flags=examSess.flags||{}; examSess.flags[q.id]=!examSess.flags[q.id]; saveExam(); route(); });
      $$("#exam-nav button").forEach(b => b.addEventListener("click", () => { saveAns(); examSess.idx=Number(b.dataset.i); saveExam(); route(); }));
      $("#exam-submit-all")?.addEventListener("click", () => {
        saveAns();
        modal(`<h3>确认交卷？</h3><p>未作答的题目将按 0 分计。解答题交卷后仍可在结果页自评。</p>
          <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
            <button class="btn btn-ghost" id="m-no">再检查</button>
            <button class="btn btn-primary" id="m-yes">交卷</button>
          </div>`, bg => {
            $("#m-no",bg).onclick=closeModal;
            $("#m-yes",bg).onclick=()=>{ closeModal(); finishExam(); };
          });
      });
      const tick = () => {
        const el=$("#exam-timer"); if(!el||!examSess||examSess.finished) return;
        const remain=Math.max(0, examSess.limit*60-Math.floor((Date.now()-examSess.start)/1000));
        el.textContent=fmtRemain(remain);
        el.classList.toggle("warn", remain<300);
        if (remain<=0) { toast("考试时间到"); finishExam(); return; }
        examSess._tick=setTimeout(tick,500);
      };
      clearTimeout(examSess?examSess._tick:0); tick();
    }
  }

  function bindStats() {
    $("#mock-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const subjects={}; let auto=0;
      selectedSubjects().forEach(s => { const v=Number(fd.get("sc-"+s)); if(Number.isFinite(v)&&fd.get("sc-"+s)!==""){ subjects[s]=v; auto+=v; } });
      const total = Number(fd.get("total"))||auto;
      state.mockScores.unshift({ id:uid(), name:fd.get("name"), date:fd.get("date"), subjects, total, at:Date.now() });
      save(); toast("已记录"); route();
    });
    $$("[data-del-mock]").forEach(b => b.addEventListener("click", () => {
      state.mockScores = state.mockScores.filter(m=>m.id!==b.dataset.delMock);
      save(); route();
    }));
  }

  function bindPlan() {
    $("#add-task")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const title = ev.target.title.value.trim();
      if (!title) return;
      state.plan.custom.push({ id:uid(), title, date:todayStr() });
      save(); route();
    });
    $("#pomo-tog")?.addEventListener("click", togglePomo);
    $("#pomo-reset")?.addEventListener("click", () => {
      stopPomo(); pomo.remain = pomo.mode==="focus"?25*60:5*60; pomo.running=false; route();
    });
    if (pomo.running) tickPomo();
  }
  function togglePomo() {
    pomo.running = !pomo.running;
    if (pomo.running) { pomo.started = Date.now(); tickPomo(); }
    else stopPomo();
    const btn=$("#pomo-tog"); if(btn) btn.textContent=pomo.running?"暂停":"开始";
  }
  function stopPomo(){ clearTimeout(pomo.timer); }
  function tickPomo(){
    const el=$("#pomo-time");
    if (!pomo.running) return;
    pomo.remain = Math.max(0, pomo.remain-1);
    if (el) el.textContent=fmtRemain(pomo.remain);
    const ring = $(".pomo-ring");
    if (ring) ring.innerHTML = pomoRing(pomo.remain, pomo.mode==="focus"?25*60:5*60) + `<div class="pomo-time" id="pomo-time">${fmtRemain(pomo.remain)}</div>`;
    if (pomo.remain<=0) {
      pomo.running=false;
      if (pomo.mode==="focus") {
        state.pomodoro.logs = state.pomodoro.logs||[];
        state.pomodoro.logs.push({date:todayStr(), minutes:25, at:Date.now()});
        checkinToday(25); save();
        toast("专注结束，休息五分钟");
        pomo.mode="break"; pomo.remain=5*60;
      } else {
        toast("休息结束，可以开始下一组");
        pomo.mode="focus"; pomo.remain=25*60;
      }
      route(); return;
    }
    pomo.timer=setTimeout(tickPomo,1000);
  }

  function bindPoetry() {
    $("#po-check")?.addEventListener("click", () => {
      $$("#poetry-box input").forEach(inp => {
        const ok = normAns(inp.value) === normAns(inp.dataset.ans);
        inp.parentElement.classList.toggle("ok", ok);
        inp.parentElement.classList.toggle("no", !ok);
      });
    });
    $("#po-reveal")?.addEventListener("click", () => {
      const id = $("#poetry-box")?.dataset.id;
      const p = (DATA.poetry||[]).find(x=>x.id===id);
      if (!p) return;
      $(".verse").outerHTML = renderVerse(p, true);
    });
    $("#po-retry")?.addEventListener("click", () => route());
  }

  let wordSess=null;
  function bindWords() {
    let mode="en2zh";
    $("#wm-en2zh")?.addEventListener("click", ev => { mode="en2zh"; $$("[data-wm]").forEach(x=>x.classList.toggle("on",x.dataset.wm==="en2zh")); });
    $("#wm-zh2en")?.addEventListener("click", ev => { mode="zh2en"; $$("[data-wm]").forEach(x=>x.classList.toggle("on",x.dataset.wm==="zh2en")); });
    $("#wd-start")?.addEventListener("click", () => {
      const pool=[...(DATA.words||[])];
      if (!pool.length) { toast("词表还没准备好"); return; }
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      wordSess={items:pool.slice(0,15), idx:0, mode, correct:0};
      renderWord();
    });
    function renderWord() {
      const slot = $("#word-card");
      if (!wordSess||!slot) return;
      if (wordSess.idx>=wordSess.items.length) {
        slot.innerHTML = `<p class="en">${wordSess.correct}/${wordSess.items.length}</p><p class="muted">本组结束</p><button class="btn btn-primary" id="wd-start2">再来一组</button>`;
        $("#wd-start2")?.addEventListener("click", ()=>$("#wd-start")?.click());
        return;
      }
      const w = wordSess.items[wordSess.idx];
      const zh = (w.m||w.zh||"").toString();
      if (wordSess.mode==="en2zh") {
        slot.innerHTML = `<div class="en">${esc(w.w||w.en)}</div>
          <div class="ipa">${esc(w.us||w.uk||w.ipa||"")}</div>
          <p class="muted">想一想中文意思，再点击显示</p>
          <button class="btn btn-soft" id="wd-show">显示释义</button>`;
        $("#wd-show")?.addEventListener("click", () => {
          slot.insertAdjacentHTML("beforeend", `<div class="zh" style="margin-top:12px">${esc(zh)}</div>
            <div style="margin-top:14px;display:flex;gap:8px;justify-content:center">
              <button class="btn btn-primary" id="wd-ok">记得</button>
              <button class="btn btn-ghost" id="wd-no">再看看</button>
            </div>`);
          $("#wd-ok").onclick=()=>{ wordSess.correct++; wordSess.idx++; renderWord(); };
          $("#wd-no").onclick=()=>{ wordSess.idx++; renderWord(); };
        });
      } else {
        slot.innerHTML = `<div class="zh" style="font-size:22px">${esc(zh)}</div>
          <input class="fill-input" id="wd-in" style="margin:16px auto 0;display:block" placeholder="输入英文单词" autocomplete="off" autocapitalize="off">
          <button class="btn btn-primary" style="margin-top:12px" id="wd-ck">核对</button>`;
        const ck=()=>{
          const ok = normAns($("#wd-in").value)===normAns(w.w||w.en);
          if (ok) wordSess.correct++;
          slot.insertAdjacentHTML("beforeend", `<p style="color:${ok?"var(--ok)":"var(--cinnabar)"}">${ok?"正确":"答案是 "+esc(w.w||w.en)}</p>
            <button class="btn btn-primary" id="wd-nx">下一个</button>`);
          $("#wd-nx").onclick=()=>{ wordSess.idx++; renderWord(); };
        };
        $("#wd-ck").onclick=ck;
        $("#wd-in")?.addEventListener("keydown", e=>{ if(e.key==="Enter") ck(); });
        $("#wd-in")?.focus();
      }
    }
  }

  function bindSettings() {
    const saveProf = () => {
      state.profile.name = $("#st-name")?.value||"";
      state.profile.province = $("#st-prov")?.value||"";
      state.profile.mode = $("#st-mode")?.value||"3+1+2";
      state.profile.firstChoice = $("#st-first")?.value||"physics";
      state.profile.targetScore = Number($("#st-target")?.value)||600;
      save();
    };
    ["st-name","st-prov","st-target"].forEach(id => $("#"+id)?.addEventListener("change", saveProf));
    $("#st-mode")?.addEventListener("change", () => { saveProf(); route(); });
    $("#st-first")?.addEventListener("change", saveProf);
    $$("#st-second .chip").forEach(b => b.addEventListener("click", () => {
      const s=b.dataset.s;
      let arr=state.profile.secondChoices||[];
      const need=state.profile.mode==="3+3"?3:2;
      if (arr.includes(s)) arr=arr.filter(x=>x!==s);
      else { arr=[...arr,s]; if(arr.length>need) arr=arr.slice(-need); }
      state.profile.secondChoices=arr; save(); route();
    }));
    $("#st-eye")?.addEventListener("click", () => {
      state.profile.theme = state.profile.theme==="eyecare"?"light":"eyecare";
      save(); applyTheme(); route();
    });
    $$("[data-sz]").forEach(b => b.addEventListener("click", () => {
      state.profile.fontSize=b.dataset.sz; save(); applyTheme();
      $$("[data-sz]").forEach(x=>x.classList.toggle("on",x.dataset.sz===b.dataset.sz));
    }));
    $("#st-export")?.addEventListener("click", () => { exportData(); toast("已开始下载"); });
    $("#st-import")?.addEventListener("change", ev => {
      const f=ev.target.files[0]; if(!f) return;
      const rd=new FileReader();
      rd.onload=()=>{ try{ importData(JSON.parse(rd.result)); toast("导入成功"); route(); } catch(e){ toast("导入失败，请检查文件"); } };
      rd.readAsText(f);
    });
    $("#st-reset")?.addEventListener("click", () => {
      modal(`<h3>清空所有本地数据？</h3><p>练习记录、错题、收藏和模考分数都会删除，且无法恢复。建议先导出备份。</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-ghost" id="m-no">取消</button>
          <button class="btn btn-danger" id="m-yes">确认清空</button>
        </div>`, bg=>{
          $("#m-no",bg).onclick=closeModal;
          $("#m-yes",bg).onclick=()=>{
            state=defaultState(); state.profile.onboarded=true; saveState(); applyTheme(); closeModal(); toast("已清空"); route();
          };
        });
    });
  }

  /* ---------- clocks ---------- */
  let clockTimer;
  function startClock(){
    stopClock();
    const tick=()=>{
      const cd=countdown();
      const d=$("#hero-days"), h=$("#h-h"), m=$("#h-m"), s=$("#h-s"), sd=$("#side-days");
      if (d) d.innerHTML = cd.days;
      if (h) h.textContent=pad(cd.hours);
      if (m) m.textContent=pad(cd.mins);
      if (s) s.textContent=pad(cd.secs);
      if (sd) sd.innerHTML = cd.days+"<em>天</em>";
      clockTimer=setTimeout(tick,1000);
    };
    tick();
  }
  function stopClock(){ clearTimeout(clockTimer); }

  /* ---------- service worker ---------- */
  function registerSW(){
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }

  /* ---------- boot ---------- */
  async function boot(){
    loadState();
    applyTheme();
    loadSession();
    try { await loadData(); }
    catch(e){ console.warn(e); }
    renderShell();
    window.addEventListener("hashchange", route);
    route();
    registerSW();
  }
  if (document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
