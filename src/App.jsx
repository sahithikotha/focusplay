import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Clock, Link as LinkIcon, Plus, Trash2, Trophy,
  Play, Pause, RotateCcw, Filter, Sparkles, BarChart3, Calendar,
  NotebookPen, ListChecks, Target, X
} from "lucide-react";



// --------- Helpers ---------
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const domainFromUrl = (url) => {
  try {
    const d = new URL(url);
    return d.hostname.replace("www.", "");
  } catch {
    return "";
  }
};
const fmtMin = (ms) => Math.floor(ms / 60000);

// --------- Types ---------
/** @typedef {Object} Task */
/** @type {Task} */
const emptyTask = {
  id: "",
  title: "",
  url: "",
  notes: "",
  status: "todo", // todo | doing | done
  progress: 0, // 0..100
  createdAt: Date.now(),
  due: "",
  tags: [],
};

const QUOTES = [
  "Small steps, big wins.",
  "Progress over perfection.",
  "You got this!",
  "Focus: do one great thing now.",
  "Be 1% better today.",
  "Deep work = future you smiling.",
];

// --------- Confetti (lightweight) ---------
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

// --------- Pomodoro Timer ---------
function useInterval(callback, delay) {
  const savedRef = useRef();
  useEffect(() => {
    savedRef.current = callback;
  }, [callback]);
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

  useInterval(
    () => {
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
            onTickComplete && onTickComplete();
          }
          return 0;
        }
        return s - 1;
      });
    },
    isRunning ? 1000 : null
  );

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
          <Button onClick={() => { setIsRunning(false); setIsBreak(false); setSecondsLeft(WORK); }} variant="secondary" size="icon" className="rounded-2xl">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --------- Storage ---------
const LS_KEY = "study_tracker_tasks_v1";
const LS_META = "study_tracker_meta_v1";

function useLocalStorage(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState];
}

// --------- Main App ---------
export default function StudyTrackerApp() {
  const [tasks, setTasks] = useLocalStorage(LS_KEY, []);
  const [meta, setMeta] = useLocalStorage(LS_META, { xp: 0, streak: 0, lastDoneDay: "" });
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [confettiKey, setConfettiKey] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const [draft, setDraft] = useState({ title: "", url: "", notes: "", due: "", tag: "General", est: 30 });

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

  // Streaks
  useEffect(() => {
    const doneToday = tasks.some((t) => t.status === "done" && new Date(t.updatedAt || t.createdAt).toDateString() === new Date().toDateString());
    const todayKey = new Date().toDateString();
    if (doneToday && meta.lastDoneDay !== todayKey) {
      setMeta((m) => ({ xp: m.xp + 10, streak: m.lastDoneDay && new Date(m.lastDoneDay).toDateString() === new Date(Date.now() - 86400000).toDateString() ? m.streak + 1 : 1, lastDoneDay: todayKey }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const addTask = () => {
    if (!draft.title && !draft.url) return;
    const t = { ...emptyTask, id: uid(), title: draft.title || domainFromUrl(draft.url) || "Untitled", url: draft.url.trim(), notes: draft.notes.trim(), due: draft.due, tags: [draft.tag], status: "todo", progress: 0, createdAt: Date.now(), updatedAt: Date.now() };
    setTasks((arr) => [t, ...arr]);
    setDraft({ title: "", url: "", notes: "", due: "", tag: draft.tag, est: draft.est });
  };

  const updateTask = (id, patch) => setTasks((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  const removeTask = (id) => setTasks((arr) => arr.filter((t) => t.id !== id));

  const markDone = (id) => {
    updateTask(id, { status: "done", progress: 100 });
    setMeta((m) => ({ ...m, xp: m.xp + 20 }));
    setConfettiKey((k) => k + 1);
  };

  const onPomodoroComplete = () => {
    setMeta((m) => ({ ...m, xp: m.xp + 15 }));
    setConfettiKey((k) => k + 1);
  };

  // --------- UI ---------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-800">
      <Confetti trigger={confettiKey} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/70 border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-sky-600" />
          <h1 className="text-xl font-semibold">FocusPlay – Study & Task Tracker</h1>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:flex gap-1 items-center"><Trophy className="h-4 w-4"/> XP: {meta.xp}</Badge>
            <Badge variant="secondary" className="hidden sm:flex">🔥 Streak: {meta.streak}</Badge>
            <Button size="sm" variant="outline" onClick={() => setShowHelp(true)}><NotebookPen className="h-4 w-4 mr-1"/>How it works</Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-3">
        {/* Left column: Add & Timer */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-slate-500"><Plus className="h-4 w-4"/> Add a task</div>
              <Input placeholder="Task title (e.g., 'Read Delta Lake docs')" value={draft.title} onChange={(e)=>setDraft((d)=>({...d,title:e.target.value}))} />
              <div className="flex gap-2">
                <Input placeholder="Link (paste URL)" value={draft.url} onChange={(e)=>setDraft((d)=>({...d,url:e.target.value}))} />
                <Button variant="secondary" type="button" onClick={()=>setDraft((d)=>({...d,title: d.title || domainFromUrl(d.url)}))}><LinkIcon className="h-4 w-4"/></Button>
              </div>
              <Textarea placeholder="Notes (what to learn, key points)" value={draft.notes} onChange={(e)=>setDraft((d)=>({...d,notes:e.target.value}))} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={draft.due} onChange={(e)=>setDraft((d)=>({...d,due:e.target.value}))} />
                <Select value={draft.tag} onValueChange={(v)=>setDraft((d)=>({...d,tag:v}))}>
                  <SelectTrigger><SelectValue placeholder="Tag"/></SelectTrigger>
                  <SelectContent>
                    {['General','Azure','Data','Coding','Reading','Practice'].map((t)=>(<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={addTask}><Plus className="h-4 w-4 mr-1"/>Add Task</Button>
              <div className="text-xs text-slate-500">Tip: Title is optional — we can auto-name from the link.</div>
            </CardContent>
          </Card>

          <Pomodoro onTickComplete={onPomodoroComplete} />

          <Card className="shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3 text-slate-600"><BarChart3 className="h-4 w-4"/> Overview</div>
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
              <div className="mt-4">
                <Progress value={stats.progAvg} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-lg">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1">
                  <Input placeholder="Search tasks, notes, links…" value={query} onChange={(e)=>setQuery(e.target.value)} />
                  <Filter className="absolute right-3 top-2.5 h-4 w-4 text-slate-400"/>
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
                      <Card className={`border-0 shadow-md ${t.status === 'done' ? 'bg-emerald-50' : 'bg-white'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Button size="icon" variant={t.status === 'done' ? 'secondary' : 'outline'} className="rounded-2xl mt-0.5" onClick={() => t.status === 'done' ? updateTask(t.id, { status: 'todo', progress: 0 }) : markDone(t.id)}>
                              <CheckCircle2 className={`h-5 w-5 ${t.status === 'done' ? 'text-emerald-600' : ''}`} />
                            </Button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <a href={t.url || '#'} target="_blank" rel="noreferrer" className={`font-medium truncate hover:underline ${t.status === 'done' ? 'line-through' : ''}`}>{t.title}</a>
                                {t.url ? (
                                  <Badge variant="outline" className="flex items-center gap-1"><LinkIcon className="h-3 w-3" />{domainFromUrl(t.url)}</Badge>
                                ) : null}
                                {t.due && (
                                  <Badge className="bg-slate-800"><Calendar className="h-3 w-3 mr-1" />{new Date(t.due).toLocaleDateString()}</Badge>
                                )}
                                {t.tags?.map((tg) => (
                                  <Badge key={tg} variant="secondary">{tg}</Badge>
                                ))}
                              </div>
                              {t.notes && <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.notes}</div>}
                              <div className="mt-3 flex items-center gap-3">
                                <input type="range" min={0} max={100} value={t.progress} onChange={(e)=>updateTask(t.id,{progress: clamp(parseInt(e.target.value||'0',10),0,100), status: parseInt(e.target.value,10) >= 100 ? 'done' : t.status})} className="w-48"/>
                                <div className="text-xs w-10 tabular-nums text-center">{t.progress}%</div>
                                <Progress className="flex-1" value={t.progress} />
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1"><Clock className="h-3 w-3"/> Added {new Date(t.createdAt).toLocaleDateString()}</div>
                                <div className="flex items-center gap-1"><ListChecks className="h-3 w-3"/> Status: {t.status}</div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Select value={t.status} onValueChange={(v)=>updateTask(t.id,{status:v, progress: v==='done'?100:t.progress})}>
                                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue/></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todo">To do</SelectItem>
                                  <SelectItem value="doing">In progress</SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" onClick={()=>removeTask(t.id)}><Trash2 className="h-4 w-4"/></Button>
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
                    <Target className="mx-auto h-8 w-8 mb-2"/>
                    No tasks match. Add one or adjust filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Motivation */}
          <Card className="shadow-lg">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500"/>
                <div>
                  <div className="text-sm">Daily Motivation</div>
                  <div className="font-medium">{QUOTES[Math.floor((Date.now()/86400000)%QUOTES.length)]}</div>
                </div>
              </div>
              <div className="text-sm text-slate-600">XP: <span className="font-semibold">{meta.xp}</span> • Streak: <span className="font-semibold">{meta.streak}</span></div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>How to use FocusPlay</DialogTitle>
            <DialogDescription>Track study links, mark progress, and gamify your focus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 mt-0.5"/><p>Add tasks with a title and optional link. Use the link button to auto-name from the URL.</p></div>
            <div className="flex items-start gap-2"><ListChecks className="h-4 w-4 mt-0.5"/><p>Update <strong>Status</strong> or drag the <strong>progress slider</strong>. Marking done gives you XP and confetti 🎉</p></div>
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5"/><p>Use the built-in <strong>Pomodoro</strong> to focus. Each completed session grants bonus XP.</p></div>
            <div className="flex items-start gap-2"><BarChart3 className="h-4 w-4 mt-0.5"/><p>Overview shows total tasks, completed count, and average progress.</p></div>
            <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 mt-0.5"/><p>Your data is saved to <strong>your browser</strong> (localStorage). No login needed.</p></div>
          </div>
          <DialogFooter>
            <Button onClick={()=>setShowHelp(false)}><X className="h-4 w-4 mr-1"/>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="max-w-5xl mx-auto px-4 py-10 text-center text-xs text-slate-500">
        Built with ❤️ — stay curious & keep shipping.
      </footer>
    </div>
  );
}
