import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, Link as LinkIcon, Plus, Trash2, Trophy,
  Play, Pause, RotateCcw, Filter, Calendar, ListChecks, Target, X
} from "lucide-react";

/* ---------------- Minimal UI (inline) ---------------- */
const Card = ({ className = "", style, ...props }) => (
  <div className={`rounded-2xl border ${className}`} style={style} {...props} />
);
const CardContent = ({ className = "", ...props }) => (
  <div className={`p-4 ${className}`} {...props} />
);
const Button = ({ children, size = "md", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm transition";
  const sizes = { sm: "px-2 py-1 text-xs", md: "", icon: "p-2 aspect-square" };
  return (
    <button className={`${base} ${sizes[size] || ""} ${className}`} {...props}>
      {children}
    </button>
  );
};
const Input = ({ className = "", ...props }) => (
  <input className={`w-full border rounded-xl px-3 py-2 text-sm bg-transparent placeholder:text-slate-300/70 border-stroke text-slate-100 ${className}`} {...props} />
);
const Textarea = ({ className = "", ...props }) => (
  <textarea className={`w-full border rounded-xl px-3 py-2 text-sm bg-transparent placeholder:text-slate-300/70 border-stroke text-slate-100 ${className}`} {...props} />
);
const Badge = ({ className = "", children, ...props }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full chip ${className}`} {...props}>
    {children}
  </span>
);
const Progress = ({ value = 0, className = "", ...props }) => (
  <div className={`bar ${className}`} {...props}>
    <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);
const Select = ({ value, onValueChange, className = "", children }) => {
  const items = [];
  const collect = (kids) => {
    React.Children.forEach(kids, (c) => {
      if (!c) return;
      if (c.type && c.type.displayName === "SelectItem") items.push(c);
      if (c.props && c.props.children) collect(c.props.children);
    });
  };
  collect(children);
  return (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={`border rounded-xl px-3 py-2 text-sm bg-transparent border-stroke text-slate-100 ${className}`}
    >
      {items.map((it, i) => (
        <option key={i} value={it.props.value} className="bg-bgDeep2 text-slate-100">
          {it.props.children}
        </option>
      ))}
    </select>
  );
};
const SelectTrigger = ({ children }) => <>{children}</>;
const SelectValue = () => null;
const SelectContent = ({ children }) => <>{children}</>;
const SelectItem = ({ value, children }) => <option value={value}>{children}</option>;
SelectItem.displayName = "SelectItem";

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => onOpenChange?.(false)}>
      <div className="bg-bgDeep2 rounded-2xl w-full max-w-lg border border-stroke" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
const DialogContent = ({ className = "", ...props }) => <div className={`p-4 ${className}`} {...props} />;
const DialogHeader = ({ className = "", ...props }) => <div className={`p-4 pb-0 ${className}`} {...props} />;
const DialogTitle = ({ className = "", ...props }) => <h3 className={`text-lg font-semibold ${className}`} {...props} />;
const DialogDescription = ({ className = "", ...props }) => <p className={`text-sm text-slate-300 ${className}`} {...props} />;
const DialogFooter = ({ className = "", ...props }) => <div className={`p-4 pt-0 flex justify-end gap-2 ${className}`} {...props} />;

/* ---------------- Helpers ---------------- */
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const domainFromUrl = (url) => { try { const d = new URL(url); return d.hostname.replace("www.", ""); } catch { return ""; } };
const minutesToHours = (m) => +(m / 60).toFixed(2);
const clamp0 = (n) => Math.max(0, n);
const pctFromHours = (hoursDone, totalHours) =>
  totalHours > 0 ? Math.min(100, Math.round((hoursDone / totalHours) * 100)) : 0;
const forecastDaysLeft = (hoursDone, totalHours, startDate) => {
  const rem = clamp0(totalHours - hoursDone);
  if (rem <= 0) return 0;
  const days = Math.max(1, Math.floor((Date.now() - startDate) / 86400000));
  const daily = hoursDone / days || 0;
  if (daily <= 0) return Infinity;
  return Math.ceil(rem / daily);
};
const minsBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));
const ymd = (ts) => new Date(ts).toISOString().slice(0,10);

/* ---------------- Quotes (daily rotates) ---------------- */
const QUOTES = [
  "Your future is created by what you do today.",
  "Small steps, big wins.",
  "Focus beats talent when talent doesn’t focus.",
  "Be 1% better than yesterday.",
  "Deep work today, freedom tomorrow.",
  "Success is the sum of small efforts repeated daily.",
  "Discipline is destiny."
];
function DailyQuote() {
  const dayIndex = Math.floor(Date.now() / 86400000) % QUOTES.length;
  return <div className="text-base md:text-lg font-semibold">{QUOTES[dayIndex]}</div>;
}

/* ---------------- Calendar (weekly) ---------------- */
function WeeklyCalendar({ sessions }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const idx = today.getDay();
  const start = new Date(today.getTime() - idx * 86400000);
  const days = Array.from({length:7}).map((_,i)=>{
    const d = new Date(start.getTime() + i*86400000);
    const k = d.toISOString().slice(0,10);
    return { k, d, label: d.getDate() };
  });
  const studied = new Set(sessions.map(s=> new Date(s.start).toISOString().slice(0,10)));

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(({k,label})=>{
        const on = studied.has(k);
        return (
          <div key={k}
            className={`h-12 rounded-xl grid place-items-center border ${on ? 'bg-candyPink/40 border-candyPink/60' : 'bg-glass border-stroke'} text-slate-100`}>
            {label}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Stats: Week in Review (right side panel) ---------------- */
function StatsView({ tasks }) {
  const allSessions = tasks.flatMap(t => t.sessions || []);
  const today = new Date(); today.setHours(0,0,0,0);
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86400000);
    d.setHours(0,0,0,0);
    return d;
  });
  const byDay = days.map(d => {
    const key = d.toISOString().slice(0,10);
    const mins = allSessions.reduce((sum, s) => {
      const k = new Date(s.start).toISOString().slice(0,10);
      return k === key ? sum + (s.minutes ?? Math.max(0, Math.round((s.end - s.start)/60000))) : sum;
    }, 0);
    return { key, d, mins, hrs: +(mins/60).toFixed(2) };
  });
  const totalWeekMin = byDay.reduce((a,b)=>a+b.mins,0);
  const totalWeekHrs = +(totalWeekMin/60).toFixed(2);
  const avgPerDay = +((totalWeekMin/7)/60).toFixed(2);

  const totals = tasks.reduce((acc,t)=>{
    acc.total += t.totalHours || 0;
    acc.done  += t.hoursDone || 0;
    return acc;
  }, {total:0, done:0});
  const overallPct = totals.total>0 ? Math.min(100, Math.round((totals.done/totals.total)*100)) : 0;

  const byTask = tasks.map(t=>{
    const mins = (t.sessions||[]).reduce((sum,s)=>{
      const dayKey = new Date(s.start).toISOString().slice(0,10);
      return byDay.some(d=>d.key===dayKey) ? sum + (s.minutes ?? Math.max(0,Math.round((s.end-s.start)/60000))) : sum;
    },0);
    return { id:t.id, title:t.title, mins };
  }).sort((a,b)=>b.mins-a.mins);
  const top = byTask[0];

  const R = 46, C = 2*Math.PI*R;
  const dash = (overallPct/100)*C;
  const maxMin = Math.max(60, ...byDay.map(d=>d.mins));

  return (
    <div className="grid gap-4">
      <Card className="glass shadow-xl">
        <CardContent className="p-6 flex items-center gap-6">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="12"/>
            <circle cx="60" cy="60" r={R} fill="none"
              stroke="url(#grad)" strokeWidth="12"
              strokeDasharray={`${dash} ${C-dash}`} strokeLinecap="round"
              transform="rotate(-90 60 60)" />
            <defs>
              <linearGradient id="grad" x1="0" x2="1">
                <stop offset="0%" stopColor="#22d3ee"/><stop offset="60%" stopColor="#ff80b5"/><stop offset="100%" stopColor="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
          <div>
            <div className="text-sm text-slate-300/80">Overall completion</div>
            <div className="text-4xl font-extrabold">{overallPct}%</div>
            <div className="text-xs text-slate-300/80 mt-1">
              {totals.done.toFixed(1)}h / {totals.total.toFixed(1)}h total
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass shadow-xl">
        <CardContent className="p-6">
          <div className="mb-2 text-sm text-slate-300/80">This week (hours/day)</div>
          <div className="h-40 w-full flex items-end gap-3">
            {byDay.map((d)=> {
              const h = Math.max(4, Math.round((d.mins/maxMin)*150));
              return (
                <div key={d.key} className="flex-1 flex flex-col items-center">
                  <div className="w-full rounded-xl" style={{
                    height: h,
                    background: "linear-gradient(180deg, #22d3ee, #ff80b5 60%, #a855f7)"
                  }} />
                  <div className="text-[10px] mt-1 opacity-75">{d.d.getDate()}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-sm">
            <span className="mr-4">Total: <b>{totalWeekHrs}</b> h</span>
            <span>Avg/day: <b>{avgPerDay}</b> h</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass shadow-xl">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-300/80">Most focused task this week</div>
            <div className="text-xl font-semibold">{top?.title || "—"}</div>
          </div>
          <div className="text-sm text-slate-300/80">
            {top ? `${Math.round(top.mins/60)}h ${top.mins%60}m` : "No study yet"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Confetti ---------------- */
function Confetti({ trigger }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const newPs = Array.from({ length: 24 }).map((_, i) => ({
      id: uid(),
      x: Math.random() * 100,
      rot: (Math.random() * 2 - 1) * 30,
      delay: i * 0.01,
      emoji: ["🎉", "✨", "🎯", "🏆", "💖"][i % 5],
    }));
    setParticles(newPs);
    const t = setTimeout(() => setParticles([]), 1600);
    return () => clearTimeout(t);
  }, [trigger]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: -20, x: `${p.x}%`, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: p.rot }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.8, delay: p.delay, ease: "easeOut" }}
            className="absolute top-12 text-2xl"
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Pomodoro ---------------- */
function useInterval(callback, delay) {
  const savedRef = useRef();
  useEffect(() => { savedRef.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => savedRef.current && savedRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
function Pomodoro({ onTickComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25*60);
  const [count, setCount] = useState(0);

  useInterval(() => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        if (isBreak) {
          setIsBreak(false);
          setIsRunning(false);
          setSecondsLeft(25*60);
        } else {
          setIsBreak(true);
          setSecondsLeft(5*60);
          setCount((c) => c + 1);
          onTickComplete && onTickComplete(); // +25m
        }
        return 0;
      }
      return s - 1;
    });
  }, isRunning ? 1000 : null);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card className="glass shadow-2xl" style={{ "--card": "rgba(255,128,181,0.10)" }}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-300/80 mb-1">Pomodoro</div>
            <div className="text-5xl md:text-6xl font-extrabold tabular-nums leading-none">{mm}:{ss}</div>
            <div className="mt-1 text-xs text-slate-300/80">Mode: {isBreak ? "Break" : "Focus"} • Sessions: {count}</div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsRunning((v) => !v)} size="icon" className="rounded-xl btn">
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button
              onClick={() => { setIsRunning(false); setIsBreak(false); setSecondsLeft(25*60); }}
              size="icon" className="rounded-xl btn"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Presets + custom */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {[25,45,60].map(min => (
            <Button key={min} className="btn" onClick={() => { setIsBreak(false); setSecondsLeft(min*60); }}>
              {min} min
            </Button>
          ))}
          <label className="text-xs text-slate-300/80 ml-1">Custom:
            <input type="number" min="1" max="180" className="ml-2 w-16 bg-transparent border border-stroke rounded-md px-2 py-1 text-slate-100"
                   onChange={(e)=>{ const m=parseInt(e.target.value||"0",10); if(m>0) { setIsBreak(false); setSecondsLeft(m*60); }}}/>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Storage ---------------- */
const LS_KEY = "study_tracker_tasks_v2";
const LS_META = "study_tracker_meta_v2";
function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

/* ---------------- Main App ---------------- */
export default function App() {
  const [tasks, setTasks] = useLocalStorage(LS_KEY, []);
  const [meta, setMeta] = useLocalStorage(LS_META, { xp: 0, streak: 0, lastDoneDay: "" });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [profile, setProfile] = useLocalStorage("fp_profile", { name: "Friend" });
  const [rightView, setRightView] = useState("tasks"); // 'tasks' | 'stats'

  const [draft, setDraft] = useState({
    title: "", url: "", notes: "", due: "", tag: "General", totalHours: 0,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchQuery = !q || `${t.title} ${t.notes} ${t.url} ${t.tags?.join(" ")}`.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ? true :
        filter === "active" ? t.status !== "done" :
        filter === "done" ? t.status === "done" :
        filter === "today" ? (t.due && new Date(t.due).toDateString() === new Date().toDateString()) : true;
      return matchQuery && matchFilter;
    });
  }, [tasks, filter, query]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const progAvg = total ? Math.round(tasks.reduce((a, b) => a + (b.progress || 0), 0) / total) : 0;
    return { total, done, progAvg };
  }, [tasks]);

  useEffect(() => {
    const doneToday = tasks.some(
      (t) => t.status === "done" &&
      new Date(t.updatedAt || t.lastUpdate || t.createdAt).toDateString() === new Date().toDateString()
    );
    const todayKey = new Date().toDateString();
    if (doneToday && meta.lastDoneDay !== todayKey) {
      setMeta((m) => ({
        xp: m.xp + 10,
        streak:
          m.lastDoneDay && new Date(m.lastDoneDay).toDateString() === new Date(Date.now() - 86400000).toDateString()
            ? m.streak + 1 : 1,
        lastDoneDay: todayKey,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  /* -------- Task mutations -------- */
  const emptyTask = {
    id: "", title: "", url: "", notes: "", status: "todo",
    progress: 0, createdAt: Date.now(), due: "", tags: [],
    totalHours: 0, hoursDone: 0, startDate: Date.now(), lastUpdate: Date.now(),
    sessions: [], isTiming: false, timerStart: null,
  };

  const addTask = () => {
    if (!draft.title && !draft.url) return;
    const t = {
      ...emptyTask,
      id: uid(),
      title: draft.title || domainFromUrl(draft.url) || "Untitled",
      url: draft.url.trim(),
      notes: draft.notes.trim(),
      due: draft.due,
      tags: [draft.tag],
      totalHours: Number(draft.totalHours || 0),
    };
    setTasks((arr) => [t, ...arr]);
    setDraft((d) => ({ ...d, title: "", url: "", notes: "", due: "", totalHours: 0 }));
  };
  const updateTask = (id, patch) =>
    setTasks((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  const removeTask = (id) => setTasks((arr) => arr.filter((t) => t.id !== id));

  const markDone = (id) => {
    updateTask(id, { status: "done", progress: 100 });
    setMeta((m) => ({ ...m, xp: m.xp + 20 }));
    setConfettiKey((k) => k + 1);
  };

  const addTimeToTask = (id, minutes) => {
    setTasks((arr) =>
      arr.map((t) => {
        if (t.id !== id) return t;
        const hours = +(t.hoursDone + minutesToHours(minutes)).toFixed(2);
        const progress = t.totalHours > 0 ? pctFromHours(hours, t.totalHours) : t.progress;
        return {
          ...t,
          hoursDone: hours,
          progress,
          lastUpdate: Date.now(),
          status: progress >= 100 ? "done" : t.status === "todo" ? "doing" : t.status,
        };
      })
    );
  };

  const onPomodoroComplete = () => {
    setMeta((m) => ({ ...m, xp: m.xp + 15 }));
    setConfettiKey((k) => k + 1);
    if (activeTaskId) addTimeToTask(activeTaskId, 25);
  };

  // Live timer
  const startTimer = (id) => {
    setTasks(arr => arr.map(t => t.id === id
      ? (t.isTiming ? t : { ...t, isTiming: true, timerStart: Date.now() })
      : t));
  };
  const pauseTimer = (id) => {
    setTasks(arr => arr.map(t => {
      if (t.id !== id || !t.isTiming || !t.timerStart) return t;
      const minutes = minsBetween(t.timerStart, Date.now());
      const hours = +(t.hoursDone + minutesToHours(minutes)).toFixed(2);
      const progress = t.totalHours > 0 ? pctFromHours(hours, t.totalHours) : t.progress;
      return {
        ...t,
        isTiming: false,
        timerStart: null,
        hoursDone: hours,
        progress,
        sessions: [...t.sessions, { start: t.timerStart, end: Date.now(), minutes }],
        status: progress >= 100 ? "done" : (t.status === "todo" ? "doing" : t.status),
        lastUpdate: Date.now(),
      };
    }));
  };
  const endTimer = (id) => { pauseTimer(id); };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen shell font-sans">
      <Confetti trigger={confettiKey} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-transparent">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold">FocusPlay</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden sm:flex gap-1 items-center"><Trophy className="h-4 w-4" /> {meta.xp} XP</Badge>
            <Badge className="hidden sm:flex">🔥 Streak: {meta.streak}</Badge>
            <span className="chip">Hi, {profile.name} 👋</span>
            <Button size="sm" className="btn" onClick={()=>{
              const name = prompt("Your name", profile.name || "");
              if(name!==null){ setProfile(p=>({...p, name: name.trim() || "Friend"})); }
            }}>
              Edit
            </Button>
            <Button size="sm" className="btn" onClick={()=>setShowHelp(true)}>
              <ListChecks className="h-4 w-4 mr-1" />Help
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 grid gap-6 lg:grid-cols-3">
        {/* LEFT: Add, Pomodoro, Quote, Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass shadow-xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-300/80">
                <Plus className="h-4 w-4" /> Add a course/task
              </div>
              <Input placeholder="Title" value={draft.title}
                     onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Link (paste URL)" value={draft.url}
                       onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} />
                <Button className="btn" type="button"
                        onClick={() => setDraft((d) => ({ ...d, title: d.title || domainFromUrl(d.url) }))}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
              <Textarea placeholder="Notes (what to learn, key points)" value={draft.notes}
                        onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={draft.due} onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))} />
                <Select value={draft.tag} onValueChange={(v) => setDraft((d) => ({ ...d, tag: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tag" /></SelectTrigger>
                  <SelectContent>
                    {["General", "Azure", "Data", "Coding", "Reading", "Practice"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min="0" step="0.5" placeholder="Total hours"
                       value={draft.totalHours}
                       onChange={(e) => setDraft((d) => ({ ...d, totalHours: parseFloat(e.target.value || 0) }))}/>
                <div className="text-xs self-center text-slate-300/80">Set a goal (hours) for the course.</div>
              </div>

              <Button className="w-full btn btn-primary" onClick={addTask}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
              <div className="text-xs text-slate-300/70">Tip: Title can auto-fill from link.</div>
            </CardContent>
          </Card>

          <Pomodoro onTickComplete={onPomodoroComplete} />

          <Card className="glass shadow-xl" style={{"--card":"rgba(34,211,238,0.12)"}}>
            <CardContent className="p-5">
              <div className="text-sm opacity-80 mb-1">Today</div>
              <DailyQuote />
            </CardContent>
          </Card>

          <Card className="glass shadow-xl">
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl border border-stroke">
                  <div className="text-xs text-slate-300/80">Total</div>
                  <div className="text-2xl font-semibold">{stats.total}</div>
                </div>
                <div className="p-3 rounded-2xl border border-stroke">
                  <div className="text-xs text-slate-300/80">Done</div>
                  <div className="text-2xl font-semibold">{stats.done}</div>
                </div>
                <div className="p-3 rounded-2xl border border-stroke">
                  <div className="text-xs text-slate-300/80">Avg Progress</div>
                  <div className="text-2xl font-semibold">{stats.progAvg}%</div>
                </div>
              </div>
              <div className="mt-4"><Progress value={stats.progAvg} /></div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Toggle between TASKS and STATS */}
        <div className="lg:col-span-2 space-y-4">
          {/* tabs */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-300/80">Right panel</div>
            <div className="flex gap-2">
              <Button size="sm" className={`btn ${rightView==='tasks'?'ring-2 ring-candyAqua/60':''}`} onClick={()=>setRightView('tasks')}>
                Tasks
              </Button>
              <Button size="sm" className={`btn ${rightView==='stats'?'ring-2 ring-candyAqua/60':''}`} onClick={()=>setRightView('stats')}>
                Stats
              </Button>
            </div>
          </div>

          {rightView === "stats" ? (
            <StatsView tasks={tasks} />
          ) : (
            <Card className="glass shadow-xl">
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1">
                    <Input placeholder="Search tasks, notes, links…" value={query} onChange={(e) => setQuery(e.target.value)} />
                    <Filter className="absolute right-3 top-2.5 h-4 w-4 text-slate-300/70" />
                  </div>
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="today">Due Today</SelectItem>
                      <SelectItem value="done">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  <AnimatePresence>
                    {filtered.map((t) => (
                      <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <Card className={`glass border-0 shadow-md ${t.status === "done" ? "ring-1 ring-candyAqua/40" : ""}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Button
                                size="icon"
                                className="rounded-xl btn"
                                onClick={() => (t.status === "done" ? updateTask(t.id, { status: "todo", progress: 0 }) : markDone(t.id))}
                              >
                                <CheckCircle2 className={`h-5 w-5 ${t.status === "done" ? "text-candyAqua" : ""}`} />
                              </Button>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <a href={t.url || "#"} target="_blank" rel="noreferrer"
                                     className={`font-semibold truncate hover:underline ${t.status === "done" ? "line-through text-slate-300" : ""}`}>
                                    {t.title}
                                  </a>
                                  {t.url ? (
                                    <Badge className="flex items-center gap-1"><LinkIcon className="h-3 w-3" />{domainFromUrl(t.url)}</Badge>
                                  ) : null}
                                  {t.due && (
                                    <Badge><Calendar className="h-3 w-3 mr-1" />{new Date(t.due).toLocaleDateString()}</Badge>
                                  )}
                                  {t.tags?.map((tg) => (<Badge key={tg}>{tg}</Badge>))}
                                </div>

                                {t.notes && <div className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{t.notes}</div>}

                                {/* Progress slider */}
                                <div className="mt-3 flex items-center gap-3">
                                  <input
                                    type="range" min={0} max={100} value={t.progress}
                                    onChange={(e) => {
                                      const p = clamp(parseInt(e.target.value || "0", 10), 0, 100);
                                      setTasks(arr => arr.map(x => {
                                        if (x.id !== t.id) return x;
                                        let hoursDone = x.hoursDone;
                                        if (x.totalHours > 0) hoursDone = +((p / 100) * x.totalHours).toFixed(2);
                                        return {
                                          ...x,
                                          progress: p,
                                          hoursDone,
                                          status: p >= 100 ? "done" : (x.status === "done" ? "doing" : x.status),
                                          updatedAt: Date.now()
                                        };
                                      }));
                                    }}
                                    className="w-48 accent-candyPink"
                                  />
                                  <div className="text-xs w-10 tabular-nums text-center">{t.progress}%</div>
                                  <Progress className="flex-1" value={t.progress} />
                                </div>

                                {/* Hours + ETA */}
                                <div className="mt-2 text-sm text-slate-200 flex flex-wrap items-center gap-4">
                                  <span>Hours: <strong>{t.hoursDone}</strong>{t.totalHours ? <> / <strong>{t.totalHours}</strong></> : null}</span>
                                  <span>Percent: <strong>{t.progress}%</strong></span>
                                  {t.totalHours > 0 && (() => {
                                    const daysLeft = forecastDaysLeft(t.hoursDone, t.totalHours, t.startDate);
                                    return <span>ETA: <strong>{daysLeft === Infinity ? "—" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}</strong></span>;
                                  })()}
                                </div>

                                {/* Weekly calendar */}
                                {t.sessions.length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-xs text-slate-300 mb-1">This week</div>
                                    <WeeklyCalendar sessions={t.sessions} />
                                  </div>
                                )}
                              </div>

                              {/* Right actions */}
                              <div className="flex flex-col gap-2 items-end">
                                <div className="flex flex-wrap items-center gap-2">
                                  {!t.isTiming && (
                                    <Button size="sm" className="btn" onClick={() => startTimer(t.id)}>Start</Button>
                                  )}
                                  {t.isTiming && (
                                    <>
                                      <Button size="sm" className="btn" onClick={() => pauseTimer(t.id)}>Pause</Button>
                                      <Button size="sm" className="btn" onClick={() => endTimer(t.id)}>End</Button>
                                    </>
                                  )}
                                  <Button size="sm" className={`btn ${activeTaskId===t.id ? "ring-2 ring-candyAqua/60" : ""}`}
                                    onClick={() => setActiveTaskId(prev => prev === t.id ? "" : t.id)}>
                                    {activeTaskId === t.id ? "Focusing…" : "Focus with Timer"}
                                  </Button>
                                  <Button size="sm" className="btn" onClick={() => addTimeToTask(t.id, 15)}>+15m</Button>
                                  <Button size="sm" className="btn" onClick={() => addTimeToTask(t.id, 60)}>+1h</Button>
                                  <Button size="icon" className="btn" onClick={() => removeTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {filtered.length === 0 && (
                    <div className="text-center py-10 text-slate-300">
                      <Target className="mx-auto h-8 w-8 mb-2" />
                      No tasks match. Add one or adjust filters.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How to use FocusPlay</DialogTitle>
            <DialogDescription>Track links, time, %, ETA, and your study days.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-200">
            <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5" /><p>Add a course with title, link, and goal hours.</p></div>
            <div className="flex items-start gap-2"><ListChecks className="h-4 w-4 mt-0.5" /><p>Use Start/Pause/End to log sessions automatically. Or +15m/+1h for manual time.</p></div>
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" /><p>Pomodoro adds 25 minutes to the selected course and gives XP.</p></div>
          </div>
          <DialogFooter>
            <Button className="btn" onClick={() => setShowHelp(false)}><X className="h-4 w-4 mr-1" />Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-center text-xs text-slate-400">
        Built with ❤️ — keep going!
      </footer>
    </div>
  );
}
