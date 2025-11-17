import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, Link as LinkIcon, Plus, Trash2, Trophy,
  Play, Pause, RotateCcw, Filter, Sparkles, BarChart3, Calendar,
  ListChecks, Target, X
} from "lucide-react";

/* ---------------- Minimal UI components (inline, self-contained) ---------------- */
const Card = ({ className = "", ...props }) => (
  <div className={`rounded-2xl border ${className}`} {...props} />
);
const CardContent = ({ className = "", ...props }) => (
  <div className={`p-4 ${className}`} {...props} />
);
const Button = ({ children, variant = "default", size = "md", className = "", ...props }) => {
  const base = "inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-sm";
  const variants = {
    default: "bg-white",
    secondary: "bg-slate-100",
    outline: "bg-transparent",
    ghost: "bg-transparent border-0",
  };
  const sizes = { sm: "px-2 py-1 text-sm", md: "", icon: "p-2 aspect-square" };
  return (
    <button className={`${base} ${variants[variant] || ""} ${sizes[size] || ""} ${className}`} {...props}>
      {children}
    </button>
  );
};
const Input = ({ className = "", ...props }) => (
  <input className={`w-full border rounded-xl px-3 py-2 text-sm ${className}`} {...props} />
);
const Textarea = ({ className = "", ...props }) => (
  <textarea className={`w-full border rounded-xl px-3 py-2 text-sm ${className}`} {...props} />
);
const Badge = ({ className = "", children, ...props }) => (
  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${className}`} {...props}>
    {children}
  </span>
);
const Progress = ({ value = 0, className = "", ...props }) => (
  <div className={`h-2 w-full bg-gray-200 rounded-full overflow-hidden ${className}`} {...props}>
    <div className="h-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} className={`border rounded-xl px-3 py-2 text-sm ${className}`}>
      {items.map((it, i) => (
        <option key={i} value={it.props.value}>{it.props.children}</option>
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
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => onOpenChange?.(false)}>
      <div className="bg-white rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
const DialogContent = ({ className = "", ...props }) => <div className={`p-4 ${className}`} {...props} />;
const DialogHeader = ({ className = "", ...props }) => <div className={`p-4 pb-0 ${className}`} {...props} />;
const DialogTitle = ({ className = "", ...props }) => <h3 className={`text-lg font-semibold ${className}`} {...props} />;
const DialogDescription = ({ className = "", ...props }) => <p className={`text-sm text-slate-600 ${className}`} {...props} />;
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
  const daily = hoursDone / days || 0; // hours/day
  if (daily <= 0) return Infinity;
  return Math.ceil(rem / daily);
};
const startOfDay = (ts) => { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); };
const minsBetween = (a, b) => Math.max(0, Math.round((b - a) / 60000));
const ymd = (ts) => new Date(ts).toISOString().slice(0,10); // YYYY-MM-DD

/* ---------------- Types / defaults ---------------- */
const QUOTES = [
  "Small steps, big wins.",
  "Progress over perfection.",
  "You got this!",
  "Focus: do one great thing now.",
  "Be 1% better today.",
  "Deep work = future you smiling.",
];

const emptyTask = {
  id: "",
  title: "",
  url: "",
  notes: "",
  status: "todo",
  progress: 0,
  createdAt: Date.now(),
  due: "",
  tags: [],
  // Time-based tracking
  totalHours: 0,
  hoursDone: 0,
  startDate: Date.now(),
  lastUpdate: Date.now(),
  // Live session tracking
  sessions: [],       // [{ start, end, minutes }]
  isTiming: false,
  timerStart: null,
};

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
      emoji: ["🎉", "✨", "🎯", "🏆", "📚"][i % 5],
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
  const WORK = 25 * 60; // seconds
  const BREAK = 5 * 60;
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WORK);
  const [count, setCount] = useState(0);

  useInterval(() => {
    setSecondsLeft((s) => {
      if (s <= 1) {
        if (isBreak) {
          setIsBreak(false);
          setIsRunning(false);
          setSecondsLeft(WORK);
        } else {
          setIsBreak(true);
          setSecondsLeft(BREAK);
          setCount((c) => c + 1);
          onTickComplete && onTickComplete(); // add 25m to active task
        }
        return 0;
      }
      return s - 1;
    });
  }, isRunning ? 1000 : null);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Pomodoro</div>
          <div className="text-4xl font-bold tabular-nums leading-none">{mm}:{ss}</div>
          <div className="mt-1 text-xs opacity-80">Mode: {isBreak ? "Break" : "Focus"} • Sessions: {count}</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRunning((v) => !v)} variant="secondary" size="icon" className="rounded-2xl">
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button
            onClick={() => { setIsRunning(false); setIsBreak(false); setSecondsLeft(WORK); }}
            variant="secondary" size="icon" className="rounded-2xl"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Storage hooks ---------------- */
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

/* ---------------- Calendar Heatmap ---------------- */
function CalendarHeatmap({ sessions, months = 2 }) {
  const dayMap = new Map();
  sessions.forEach(s => {
    const dayKey = ymd(s.start);
    const add = s.minutes ?? minsBetween(s.start, s.end);
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + add);
  });
  const today = new Date(); today.setHours(0,0,0,0);
  const days = [];
  const totalDays = 30 * months + 7;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0,10);
    const min = dayMap.get(key) || 0;
    let bg = "#eef2ff";
    if (min >= 10) bg = "#c7d2fe";
    if (min >= 30) bg = "#a5b4fc";
    if (min >= 60) bg = "#818cf8";
    if (min >= 120) bg = "#6366f1";
    days.push({ key, bg, min });
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
      {days.map(({ key, bg, min }) => (
        <div key={key} title={`${key} • ${min} min`}
          style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: "1px solid rgba(0,0,0,0.06)" }} />
      ))}
    </div>
  );
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

  const [draft, setDraft] = useState({
    title: "",
    url: "",
    notes: "",
    due: "",
    tag: "General",
    totalHours: 0,
  });

  // Pretty animated background + pastel cards
  useEffect(() => {
    const css = `
    body {
      background: linear-gradient(120deg, #f5f7ff, #ecfeff, #fff5f7);
      background-size: 300% 300%;
      animation: bgMove 18s ease infinite;
    }
    @keyframes bgMove {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .pastel-card { background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(240,249,255,0.9)); }
    `;
    const style = document.createElement('style');
    style.id = 'fp-theme';
    style.innerHTML = css;
    document.head.appendChild(style);
    return () => { const s = document.getElementById('fp-theme'); if (s) s.remove(); };
  }, []);

  // Derived
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

  // Streaks & XP (counts once per day when something completed)
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
            ? m.streak + 1
            : 1,
        lastDoneDay: todayKey,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  /* -------- Task mutations -------- */
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
      status: "todo",
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalHours: Number(draft.totalHours || 0),
      hoursDone: 0,
      startDate: Date.now(),
      lastUpdate: Date.now(),
    };
    setTasks((arr) => [t, ...arr]);
    setDraft((d) => ({ ...d, title: "", url: "", notes: "", due: "" }));
  };
  const updateTask = (id, patch) =>
    setTasks((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  const removeTask = (id) => setTasks((arr) => arr.filter((t) => t.id !== id));

  const markDone = (id) => {
    updateTask(id, { status: "done", progress: 100 });
    setMeta((m) => ({ ...m, xp: m.xp + 20 }));
    setConfettiKey((k) => k + 1);
  };

  // Manual add minutes (also used by Pomodoro hook)
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
    if (activeTaskId) addTimeToTask(activeTaskId, 25); // 25 minutes
  };

  // Per-course live timer
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
    <div className="min-h-screen text-slate-800">
      <Confetti trigger={confettiKey} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-sky-600" />
          <h1 className="text-xl font-semibold">FocusPlay – Study & Course Tracker</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden sm:flex gap-1 items-center"><Trophy className="h-4 w-4" /> XP: {meta.xp}</Badge>
            <Badge className="hidden sm:flex">🔥 Streak: {meta.streak}</Badge>
            <Button size="sm" variant="outline" onClick={() => setShowHelp(true)}>
              <ListChecks className="h-4 w-4 mr-1" />How it works
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        {/* Left: Add & Timer & Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="pastel-card shadow-lg">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500">
                <Plus className="h-4 w-4" /> Add a course/task
              </div>
              <Input placeholder="Title (e.g., 'Azure Synapse course')" value={draft.title}
                     onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Link (paste URL)" value={draft.url}
                       onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} />
                <Button variant="secondary" type="button"
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

              {/* total hours goal */}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number" min="0" step="0.5"
                  placeholder="Total hours (e.g., 10)"
                  value={draft.totalHours}
                  onChange={(e) => setDraft((d) => ({ ...d, totalHours: parseFloat(e.target.value || 0) }))}
                />
                <div className="text-xs self-center text-slate-500">Set a goal (hours) for the course.</div>
              </div>

              <Button className="w-full" onClick={addTask}><Plus className="h-4 w-4 mr-1" />Add</Button>
              <div className="text-xs text-slate-500">Tip: Title auto-fills from the link.</div>
            </CardContent>
          </Card>

          <Pomodoro onTickComplete={onPomodoroComplete} />

          <Card className="pastel-card shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3 text-slate-600">
                <BarChart3 className="h-4 w-4" /> Overview
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-sky-50">
                  <div className="text-xs opacity-70">Total</div>
                  <div className="text-2xl font-semibold">{stats.total}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50">
                  <div className="text-xs opacity-70">Done</div>
                  <div className="text-2xl font-semibold">{stats.done}</div>
                </div>
                <div className="p-3 rounded-2xl bg-violet-50">
                  <div className="text-xs opacity-70">Avg Progress</div>
                  <div className="text-2xl font-semibold">{stats.progAvg}%</div>
                </div>
              </div>
              <div className="mt-4"><Progress value={stats.progAvg} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Right: List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="pastel-card shadow-lg">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1">
                  <Input placeholder="Search tasks, notes, links…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <Filter className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
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
                      <Card className={`pastel-card border-0 shadow-md ${t.status === "done" ? "ring-1 ring-emerald-200" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Button
                              size="icon"
                              variant={t.status === "done" ? "secondary" : "outline"}
                              className="rounded-2xl mt-0.5"
                              onClick={() => (t.status === "done" ? updateTask(t.id, { status: "todo", progress: 0 }) : markDone(t.id))}
                            >
                              <CheckCircle2 className={`h-5 w-5 ${t.status === "done" ? "text-emerald-600" : ""}`} />
                            </Button>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <a href={t.url || "#"} target="_blank" rel="noreferrer"
                                   className={`font-medium truncate hover:underline ${t.status === "done" ? "line-through" : ""}`}>
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

                              {t.notes && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.notes}</div>}

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
                                  className="w-48"
                                />
                                <div className="text-xs w-10 tabular-nums text-center">{t.progress}%</div>
                                <Progress className="flex-1" value={t.progress} />
                              </div>

                              {/* Hours + ETA */}
                              <div className="mt-2 text-sm text-slate-700 flex flex-wrap items-center gap-4">
                                <span>Hours: <strong>{t.hoursDone}</strong>{t.totalHours ? <> / <strong>{t.totalHours}</strong></> : null}</span>
                                <span>Percent: <strong>{t.progress}%</strong></span>
                                {t.totalHours > 0 && (() => {
                                  const daysLeft = forecastDaysLeft(t.hoursDone, t.totalHours, t.startDate);
                                  return <span>ETA: <strong>{daysLeft === Infinity ? "—" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}</strong></span>;
                                })()}
                              </div>

                              {/* Days studied + mini calendar */}
                              {t.sessions.length > 0 && (
                                <div className="mt-3">
                                  <div className="text-xs text-slate-600 mb-1">
                                    Days studied: <b>{new Set(t.sessions.map(s => ymd(s.start))).size}</b>
                                  </div>
                                  <CalendarHeatmap sessions={t.sessions} months={2} />
                                </div>
                              )}
                            </div>

                            {/* Right actions */}
                            <div className="flex flex-col gap-2 items-end">
                              <div className="flex flex-wrap items-center gap-2">
                                {!t.isTiming && (
                                  <Button size="sm" variant="secondary" onClick={() => startTimer(t.id)}>Start</Button>
                                )}
                                {t.isTiming && (
                                  <>
                                    <Button size="sm" variant="secondary" onClick={() => pauseTimer(t.id)}>Pause</Button>
                                    <Button size="sm" variant="secondary" onClick={() => endTimer(t.id)}>End</Button>
                                  </>
                                )}
                                <Button size="sm" variant={activeTaskId === t.id ? "secondary" : "outline"}
                                  onClick={() => setActiveTaskId(prev => prev === t.id ? "" : t.id)}>
                                  {activeTaskId === t.id ? "Focusing…" : "Focus with Timer"}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => addTimeToTask(t.id, 15)}>+15m</Button>
                                <Button size="sm" variant="secondary" onClick={() => addTimeToTask(t.id, 60)}>+1h</Button>
                                <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <div className="text-center py-10 text-slate-500">
                    <Target className="mx-auto h-8 w-8 mb-2" />
                    No tasks match. Add one or adjust filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="pastel-card shadow-lg">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <div>
                  <div className="text-sm">Daily Motivation</div>
                  <div className="font-medium">{QUOTES[Math.floor((Date.now() / 86400000) % QUOTES.length)]}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                XP: <span className="font-semibold">{meta.xp}</span> • Streak: <span className="font-semibold">{meta.streak}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How to use FocusPlay</DialogTitle>
            <DialogDescription>Track course links, study time, percentage, ETA, and days you've studied.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5" /><p>Add a course with title, link, and goal hours.</p></div>
            <div className="flex items-start gap-2"><ListChecks className="h-4 w-4 mt-0.5" /><p>Use Start/Pause/End to log sessions automatically. Or +15m/+1h for manual time.</p></div>
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" /><p>Pomodoro adds 25 minutes to the selected course and gives XP.</p></div>
            <div className="flex items-start gap-2"><BarChart3 className="h-4 w-4 mt-0.5" /><p>Overview shows total items, completed count, and average progress.</p></div>
            <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-0.5" /><p>Your data is saved in your browser (localStorage). No login needed.</p></div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}><X className="h-4 w-4 mr-1" />Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-xs text-slate-500">
        Built with ❤️ — stay curious & keep shipping.
      </footer>
    </div>
  );
}
