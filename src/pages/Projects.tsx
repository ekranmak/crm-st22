import { useState, useCallback, useEffect, forwardRef } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, User, X, Clock, CheckCircle2, MessageSquare, Trash2, Edit3, Save, Loader2 } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const priorityColors = { high: "stock-low", medium: "stock-medium", low: "stock-high" };
const priorityLabels = { high: "Высокий", medium: "Средний", low: "Низкий" };

const gradientOptions = [
  "var(--gradient-pink)", "var(--gradient-blue)", "var(--gradient-green)",
  "var(--gradient-purple)", "var(--gradient-orange)", "var(--gradient-teal)",
];

interface TaskType {
  id: string;
  title: string;
  assignee: string;
  deadline: string;
  progress: number;
  priority: "high" | "medium" | "low";
  gradient: string;
  description?: string;
  status: string;
}

const statusToProgress: Record<string, number> = { todo: 0, in_progress: 50, done: 100 };
const progressToStatus = (p: number): string => {
  if (p >= 100) return "done";
  if (p > 0) return "in_progress";
  return "todo";
};

// Detail dialog wrapped with forwardRef to fix AnimatePresence warning
const TaskDetailDialog = forwardRef<HTMLDivElement, {
  task: TaskType; onClose: () => void;
  onUpdate: (id: string, updates: Partial<TaskType>) => void;
  onDelete: (id: string) => void;
}>(({ task, onClose, onUpdate, onDelete }, _ref) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editAssignee, setEditAssignee] = useState(task.assignee);
  const [editDeadline, setEditDeadline] = useState(task.deadline);
  const [editProgress, setEditProgress] = useState(task.progress);
  const [editPriority, setEditPriority] = useState(task.priority);

  const subtasks = [
    { name: "Подготовка материалов", done: task.progress > 20 },
    { name: "Основная работа", done: task.progress > 50 },
    { name: "Проверка качества", done: task.progress > 80 },
    { name: "Финальное согласование", done: task.progress >= 100 },
  ];

  const statusLabel = task.progress === 0 ? "К выполнению" : task.progress >= 100 ? "Готово" : "В работе";

  const statusOptions = [
    { label: "К выполнению", progress: 0 },
    { label: "В работе", progress: 50 },
    { label: "Готово", progress: 100 },
  ];

  const handleStatusChange = (newProgress: number) => {
    setEditProgress(newProgress);
    onUpdate(task.id, { progress: newProgress, status: progressToStatus(newProgress) });
    toast({ title: "Статус изменён", description: statusOptions.find(s => s.progress === newProgress)?.label });
  };

  const handleSave = () => {
    onUpdate(task.id, {
      title: editTitle, assignee: editAssignee, deadline: editDeadline,
      progress: editProgress, priority: editPriority, status: progressToStatus(editProgress),
    });
    setEditing(false);
    toast({ title: "Задача обновлена", description: editTitle });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg max-h-[85vh] overflow-y-auto apple-card p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {statusOptions.map((s) => (
                <button key={s.label} onClick={() => handleStatusChange(s.progress)}
                  className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                    statusLabel === s.label ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >{s.label}</button>
              ))}
              <span className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</span>
            </div>
            {editing ? (
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full text-lg font-bold bg-card border border-border rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            ) : (
              <h2 className="text-lg font-bold text-foreground">{task.title}</h2>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(task.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {task.description && <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>}

        {editing ? (
          <div className="apple-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Редактирование</h3>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Исполнитель</label>
                <input value={editAssignee} onChange={(e) => setEditAssignee(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Дедлайн</label>
                <input value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} type="date" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Прогресс: {editProgress}%</label>
                <input type="range" min="0" max="100" value={editProgress} onChange={(e) => setEditProgress(Number(e.target.value))} className="w-full mt-1 accent-primary" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Приоритет</label>
                <div className="flex gap-2 mt-1">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button key={p} onClick={() => setEditPriority(p)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${editPriority === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{priorityLabels[p]}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="apple-card p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Исполнитель</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{task.assignee}</p>
              </div>
              <div className="apple-card p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Дедлайн</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{task.deadline}</p>
              </div>
              <div className="apple-card p-3 space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Статус</p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{statusLabel}</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground font-medium">Прогресс</span>
                <span className="font-bold text-foreground">{task.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${task.progress}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: task.gradient }} />
              </div>
            </div>
          </>
        )}

        <div className="apple-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Подзадачи</h3>
          {subtasks.map((s) => (
            <div key={s.name} className="flex items-center gap-3 text-sm">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${s.done ? "bg-success border-success" : "border-border"}`}>
                {s.done && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
              </div>
              <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>{s.name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
});
TaskDetailDialog.displayName = "TaskDetailDialog";

export default function Projects() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [newDescription, setNewDescription] = useState("");

  const mapRow = useCallback((row: any, idx: number): TaskType => ({
    id: row.id,
    title: row.title,
    assignee: row.assignee_id || "—",
    deadline: row.due_date ? new Date(row.due_date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : "—",
    progress: statusToProgress[row.status] ?? 0,
    priority: (["high", "medium", "low"].includes(row.priority) ? row.priority : "medium") as "high" | "medium" | "low",
    gradient: gradientOptions[idx % gradientOptions.length],
    description: row.description || "",
    status: row.status,
  }), []);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("assigned_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setTasks((data || []).map((r, i) => mapRow(r, i)));
    }
    setLoading(false);
  }, [user, toast, mapRow]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleUpdate = async (id: string, updates: Partial<TaskType>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSelectedTask(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);

    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.deadline !== undefined) dbUpdates.due_date = updates.deadline;
    if (updates.assignee !== undefined) dbUpdates.assignee_id = updates.assignee;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from("assigned_tasks").update(dbUpdates).eq("id", id);
      if (error) toast({ title: "Ошибка сохранения", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from("assigned_tasks").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); fetchTasks(); return; }
    toast({ title: "Задача удалена" });
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Ошибка", description: "Введите название задачи", variant: "destructive" }); return;
    }
    if (!user) return;

    const { data, error } = await supabase.from("assigned_tasks").insert({
      title: newTitle.trim(),
      creator_id: user.id,
      assignee_id: user.id,
      priority: newPriority,
      status: "todo",
      description: newDescription.trim() || null,
      due_date: newDeadline || null,
    }).select().single();

    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      const newTask = mapRow(data, tasks.length);
      newTask.assignee = newAssignee.trim() || "Я";
      setTasks(prev => [newTask, ...prev]);
      toast({ title: "Задача создана", description: newTitle.trim() });
      setNewTitle(""); setNewAssignee(""); setNewDeadline(""); setNewDescription(""); setShowAddForm(false);
    }
  };

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const columns = [
    { key: "todo", title: "К выполнению", tasks: tasks.filter(t => t.progress === 0) },
    { key: "inprogress", title: "В работе", tasks: tasks.filter(t => t.progress > 0 && t.progress < 100) },
    { key: "done", title: "Готово", tasks: tasks.filter(t => t.progress >= 100) },
  ];

  const columnStatusMap: Record<string, string> = { todo: "todo", inprogress: "in_progress", done: "done" };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null); setDragOverCol(null);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.style.opacity = "1";
  };

  const handleDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      const newStatus = columnStatusMap[colKey] ?? "todo";
      const newProgress = statusToProgress[newStatus] ?? 0;
      handleUpdate(taskId, { progress: newProgress, status: newStatus });
      toast({ title: "Задача перемещена", description: columns.find(c => c.key === colKey)?.title });
    }
    setDraggedTaskId(null); setDragOverCol(null);
  };

  if (loading) {
    return <CRMLayout title={config.projectsTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.projectsTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Канбан-доска</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn-purple flex items-center gap-2 text-sm">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAddForm ? "Отмена" : "Новая задача"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Название задачи" className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} placeholder="Исполнитель" className="w-40 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} type="date" className="w-40 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Описание (необязательно)" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button key={p} onClick={() => setNewPriority(p)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${newPriority === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{priorityLabels[p]}</button>
                    ))}
                  </div>
                  <button onClick={handleAdd} className="gradient-btn flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Создать</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div
              key={col.key}
              className={`space-y-3 rounded-2xl p-2 transition-colors duration-200 min-h-[120px] ${
                dragOverCol === col.key ? "bg-primary/10 ring-2 ring-primary/30 ring-inset" : ""
              }`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{col.title}</h3>
                  <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">{col.tasks.length}</span>
                </div>
              </div>
              <div className="space-y-2">
                {col.tasks.map((task) => (
                  <motion.div
                    key={task.id} layout whileHover={{ y: -2 }}
                    className={`apple-card-hover p-4 cursor-grab active:cursor-grabbing group ${draggedTaskId === task.id ? "opacity-50" : ""}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, task.id)}
                    onDragEnd={(e) => handleDragEnd(e as unknown as React.DragEvent)}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={priorityColors[task.priority]}>{priorityLabels[task.priority]}</span>
                      <button className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-3 leading-snug">{task.title}</h4>
                    {task.progress > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>Прогресс</span><span>{task.progress}%</span></div>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${task.progress}%`, background: task.gradient }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-muted-foreground"><User className="w-3 h-3" /><span className="text-[10px]">{task.assignee}</span></div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" /><span className="text-[10px]">{task.deadline}</span></div>
                    </div>
                  </motion.div>
                ))}
                {col.tasks.length === 0 && (
                  <div className={`rounded-xl border-2 border-dashed p-6 text-center text-[11px] text-muted-foreground transition-colors ${
                    dragOverCol === col.key ? "border-primary/40 bg-primary/5" : "border-border/40"
                  }`}>
                    Перетащите задачу сюда
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedTask && <TaskDetailDialog task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
