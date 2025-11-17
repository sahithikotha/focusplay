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
const Switch = ({ checked, onCheckedChange, className = "", ...props }) => (
  <input type="checkbox" checked={!!checked} onChange={(e) => onCheckedChange?.(e.target.checked)} className={className} {...props} />
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
  const daily = hoursDone / days || 0;
  if (daily <= 0) return Infinity;
  return Math.ceil(rem / daily);
};

/* ---------------- Types ---------------- */
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
  totalHours: 0,
  hoursDone: 0,
  startDate: Date.now(),
  lastUpdate: Date.now(),
};
const QUOTES = [
  "Small steps, big wins.",
  "Progress over perfection.",
  "You got this!",
  "Focus: do one great thing now.",
  "Be 1% better today.",
  "Deep work = future you smiling.",
];

/* ---------------- Confetti ---------------- */
function Confetti({ trigger }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const newPs = Array.from({ length: 20 }).map((_, i) => ({
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
  const WORK = 25 * 60;
  const BREAK = 5 * 60;
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WORK);

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
          onTickComplete && onTickComplete();
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
          <div className="text-4xl font-bold">{mm}:{ss}</div>
          <div className="mt-1 text-xs opacity-80">Mode: {isBreak ? "Break" : "Focus"}</div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRunning((v) => !v)} variant="secondary" size="icon" className="rounded-2xl">
            {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <Button onClick={() => { setIsRunning(false); setIsBreak(false); setSecondsLeft(WORK); }}
                  variant="secondary" size="icon" className="rounded-2xl">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Storage hook ---------------- */
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
  const [tasks, setTasks] = useLocalStorage("study_tracker_tasks_v2", []);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [draft, setDraft] = useState({ title: "", url: "", notes: "", tag: "General", due: "", totalHours: 0 });

  const addTask = () => {
    if (!draft.title && !draft.url) return;
    const t = { ...emptyTask, id: uid(), ...draft, createdAt: Date.now() };
    setTasks((arr) => [t, ...arr]);
    setDraft({ title: "", url: "", notes: "", tag: "General", due: "", totalHours: 0 });
  };
  const updateTask = (id, patch) => setTasks((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTask = (id) => setTasks((arr) => arr.filter((t) => t.id !== id));
  const markDone = (id) => { updateTask(id, { status: "done", progress: 100 }); setConfettiKey((k) => k + 1); };

  const addTimeToTask = (id, minutes) => {
    setTasks((arr) => arr.map((t) => {
      if (t.id !== id) return t;
      const hours = +(t.hoursDone + minutesToHours(minutes)).toFixed(2);
      const progress = t.totalHours > 0 ? pctFromHours(hours, t.totalHours) : t.progress;
      return { ...t, hoursDone: hours, progress, status: progress >= 100 ? "done" : t.status };
    }));
  };
  const onPomodoroComplete = () => { if (activeTaskId) addTimeToTask(activeTaskId, 25); };

  const filtered = useMemo(() => tasks.filter(t => {
    const q = query.trim().toLowerCase();
    return (!q || `${t.title} ${t.notes}`.toLowerCase().includes(q)) &&
      (filter === "all" ? true : filter === "done" ? t.status === "done" : t.status !== "done");
  }), [tasks, filter, query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-800">
      <Confetti trigger={confettiKey} />
      <header className="sticky top-0 bg-white/70 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-sky-600" />
          <h1 className="text-xl font-semibold">FocusPlay – Course Tracker</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card><CardContent className="p-5 space-y-3">
            <Input placeholder="Title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}/>
            <Input placeholder="Link" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}/>
            <Input type="number" placeholder="Total hours" value={draft.totalHours} onChange={e => setDraft(d => ({ ...d, totalHours: parseFloat(e.target.value||0) }))}/>
            <Button onClick={addTask} className="w-full"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </CardContent></Card>

          <Pomodoro onTickComplete={onPomodoroComplete} />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {filtered.map(t => (
            <Card key={t.id}><CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Button size="icon" variant={t.status === "done" ? "secondary" : "outline"}
                        onClick={() => (t.status === "done" ? updateTask(t.id, { status: "todo", progress: 0 }) : markDone(t.id))}>
                  <CheckCircle2 className={`h-5 w-5 ${t.status === "done" ? "text-emerald-600" : ""}`} />
                </Button>
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  {t.url && <Badge><LinkIcon className="h-3 w-3" />{domainFromUrl(t.url)}</Badge>}
                  <div className="text-sm mt-1">Progress: {t.progress}% | Hours: {t.hoursDone}/{t.totalHours}</div>
                  <Progress value={t.progress}/>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => addTimeToTask(t.id, 15)}>+15m</Button>
                    <Button size="sm" onClick={() => addTimeToTask(t.id, 60)}>+1h</Button>
                    <Button size="sm" variant={activeTaskId === t.id ? "secondary" : "outline"}
                            onClick={() => setActiveTaskId(prev => prev === t.id ? "" : t.id)}>
                      {activeTaskId === t.id ? "Focusing…" : "Focus Timer"}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeTask(t.id)}><Trash2 className="h-4 w-4"/></Button>
                  </div>
                </div>
              </div>
            </CardContent></Card>
          ))}
          {filtered.length === 0 && <div className="text-center text-slate-500 py-8">No tasks yet. Add one!</div>}
        </div>
      </main>
    </div>
  );
}
