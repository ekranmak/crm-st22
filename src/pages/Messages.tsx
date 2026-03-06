import { useState, useEffect, useCallback, useRef } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MessageSquare, Send, Plus, CheckCircle2, Circle, Clock,
  Flag, User, ListTodo, X, Trash2, Search, PanelRightClose, PanelRightOpen
} from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Task {
  id: string;
  creator_id: string;
  assignee_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
}

type Tab = "messages" | "tasks";

const priorityColors: Record<string, string> = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

const priorityLabels: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const statusLabels: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("messages");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [sending, setSending] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [chatOpen, setChatOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load employees
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .neq("id", user.id);
      if (data) setEmployees(data);
    };
    load();
  }, [user]);

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("internal_messages")
      .select("sender_id")
      .eq("recipient_id", user.id)
      .eq("read", false);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnreadCounts(counts);
    }
  }, [user]);

  useEffect(() => { loadUnreadCounts(); }, [loadUnreadCounts]);

  // Load messages for selected employee
  const loadMessages = useCallback(async () => {
    if (!user || !selectedEmployee) return;
    const { data } = await supabase
      .from("internal_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedEmployee}),and(sender_id.eq.${selectedEmployee},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);

    // Mark as read
    await supabase
      .from("internal_messages")
      .update({ read: true })
      .eq("recipient_id", user.id)
      .eq("sender_id", selectedEmployee);
    
    loadUnreadCounts();
  }, [user, selectedEmployee, loadUnreadCounts]);

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("assigned_tasks")
      .select("*")
      .or(`creator_id.eq.${user.id},assignee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (data) setTasks(data as Task[]);
  }, [user]);

  useEffect(() => {
    if (tab === "messages") loadMessages();
    else loadTasks();
  }, [tab, selectedEmployee, loadMessages, loadTasks]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const msgChannel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_messages" }, () => {
        loadMessages();
        loadUnreadCounts();
      })
      .subscribe();

    const taskChannel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "assigned_tasks" }, () => {
        loadTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(taskChannel);
    };
  }, [user, loadMessages, loadTasks, loadUnreadCounts]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedEmployee || !user) return;
    setSending(true);
    const { error } = await supabase.from("internal_messages").insert({
      sender_id: user.id,
      recipient_id: selectedEmployee,
      content: newMessage.trim(),
    });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const createTask = async () => {
    if (!taskTitle.trim() || !selectedEmployee || !user) return;
    setSending(true);
    const { error } = await supabase.from("assigned_tasks").insert({
      creator_id: user.id,
      assignee_id: selectedEmployee,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      due_date: taskDueDate || null,
    });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Задача создана" });
      setTaskTitle(""); setTaskDesc(""); setTaskPriority("medium"); setTaskDueDate(""); setShowTaskForm(false);
    }
    setSending(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from("assigned_tasks").update({ status: newStatus }).eq("id", taskId);
    if (!error) loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("assigned_tasks").delete().eq("id", taskId);
    if (!error) { loadTasks(); toast({ title: "Задача удалена" }); }
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from("internal_messages").delete().eq("id", msgId);
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: "Сообщение удалено" });
    }
  };

  const clearChat = async () => {
    if (!user || !selectedEmployee) return;
    // Delete messages where current user is sender
    await supabase.from("internal_messages").delete()
      .eq("sender_id", user.id).eq("recipient_id", selectedEmployee);
    // Delete messages where current user is recipient
    await supabase.from("internal_messages").delete()
      .eq("sender_id", selectedEmployee).eq("recipient_id", user.id);
    setMessages([]);
    toast({ title: "Чат очищен" });
    loadUnreadCounts();
  };

  const selectedEmp = employees.find((e) => e.id === selectedEmployee);
  const filteredEmployees = employees.filter(e =>
    !empSearch || e.full_name.toLowerCase().includes(empSearch.toLowerCase())
  );

  const filteredTasks = selectedEmployee
    ? tasks.filter(t => t.assignee_id === selectedEmployee || (t.creator_id === user?.id && t.assignee_id === selectedEmployee))
    : tasks;

  return (
    <CRMLayout title="Сообщения и задачи">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-0 h-[calc(100vh-8rem)]">
        {/* Main content — employee list + tasks */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${chatOpen ? "flex-1 min-w-0" : "flex-1"}`}>
          {/* Top bar with toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setTab("messages")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === "messages" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}>
                <MessageSquare className="w-4 h-4" /> Сообщения
              </button>
              <button onClick={() => setTab("tasks")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === "tasks" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}>
                <ListTodo className="w-4 h-4" /> Задачи
                {tasks.filter(t => t.assignee_id === user?.id && t.status !== "done").length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {tasks.filter(t => t.assignee_id === user?.id && t.status !== "done").length}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {chatOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              {chatOpen ? "Свернуть чат" : "Открыть чат"}
            </button>
          </div>

          <div className="flex gap-4 flex-1 min-h-0">
            {/* Employee list */}
            <div className="w-56 shrink-0 apple-card p-3 flex flex-col">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">Сотрудники</h3>
              <div className="relative mb-2 px-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="Поиск..."
                  className="w-full h-8 rounded-lg bg-secondary/70 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1 flex-1 overflow-auto">
                {filteredEmployees.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-4 text-center">Нет сотрудников</p>
                )}
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmployee(emp.id); if (!chatOpen) setChatOpen(true); }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                      selectedEmployee === emp.id ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{emp.full_name || "Без имени"}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                    </div>
                    {unreadCounts[emp.id] > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unreadCounts[emp.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks area (shown when tasks tab is active) */}
            {tab === "tasks" && (
              <div className="flex-1 apple-card flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">{filteredTasks.length} задач</p>
                    {selectedEmployee && (
                      <button onClick={() => setShowTaskForm(!showTaskForm)} className="gradient-btn flex items-center gap-1.5 text-xs">
                        {showTaskForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {showTaskForm ? "Отмена" : "Новая задача"}
                      </button>
                    )}
                  </div>

                <AnimatePresence>
                  {showTaskForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3 mb-4">
                      <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Название задачи"
                        className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <textarea value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} placeholder="Описание (необязательно)" rows={2}
                        className="w-full rounded-xl bg-card border border-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                      <div className="flex gap-3">
                        <select value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}
                          className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                          <option value="low">Низкий</option>
                          <option value="medium">Средний</option>
                          <option value="high">Высокий</option>
                        </select>
                        <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)}
                          className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <button onClick={createTask} disabled={sending || !taskTitle.trim()} className="gradient-btn-green text-sm px-4 disabled:opacity-50">Создать</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-xl border border-border/30 hover:border-border/60 transition-all group">
                    <div className="flex items-start gap-3">
                      <button onClick={() => updateTaskStatus(task.id, task.status === "done" ? "todo" : task.status === "todo" ? "in_progress" : "done")} className="mt-0.5">
                        {task.status === "done" ? <CheckCircle2 className="w-5 h-5 text-success" /> :
                         task.status === "in_progress" ? <Clock className="w-5 h-5 text-primary" /> :
                         <Circle className="w-5 h-5 text-muted-foreground" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-[10px] font-medium ${priorityColors[task.priority]}`}>
                            <Flag className="w-3 h-3 inline mr-0.5" />{priorityLabels[task.priority]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{statusLabels[task.status]}</span>
                          {task.due_date && (
                            <span className={`text-[10px] ${new Date(task.due_date) < new Date() && task.status !== "done" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              до {new Date(task.due_date).toLocaleDateString("ru-RU")}
                            </span>
                          )}
                          {task.creator_id === user?.id && (
                            <span className="text-[10px] text-primary">Вы назначили</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => deleteTask(task.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredTasks.length === 0 && !showTaskForm && (
                  <p className="text-center text-xs text-muted-foreground py-8">Нет задач</p>
                )}
              </div>
            </div>
            )}

            {/* Messages tab — show placeholder in main area */}
            {tab === "messages" && !chatOpen && (
              <div className="flex-1 apple-card flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Чат свёрнут</p>
                  <button onClick={() => setChatOpen(true)} className="text-xs text-primary mt-1 hover:underline">Открыть</button>
                </div>
              </div>
            )}
            {tab === "messages" && chatOpen && !selectedEmployee && (
              <div className="flex-1 apple-card flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Выберите сотрудника для начала диалога</p>
              </div>
            )}
          </div>
        </div>

        {/* Right chat panel */}
        <AnimatePresence>
          {chatOpen && selectedEmployee && tab === "messages" && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="shrink-0 ml-4 overflow-hidden"
            >
              <div className="apple-card flex flex-col h-full w-[380px]">
                {/* Chat header */}
                <div className="flex items-center justify-between p-3 border-b border-border/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{selectedEmp?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedEmp?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {messages.length > 0 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Очистить чат?</AlertDialogTitle>
                            <AlertDialogDescription>Все сообщения будут удалены безвозвратно.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={clearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Удалить</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="flex-1 overflow-auto p-3 space-y-2.5">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">Нет сообщений. Напишите первое!</p>
                  )}
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
                        <div className="flex items-center gap-1">
                          {isMine && (
                            <button onClick={() => deleteMessage(msg.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/msg:opacity-100 transition-all">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs ${
                              isMine ? "text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                            }`}
                            style={isMine ? { background: "var(--gradient-blue)" } : {}}
                          >
                            <p>{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                              <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {isMine && msg.read && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground/60" />}
                            </div>
                          </div>
                          {!isMine && (
                            <button onClick={() => deleteMessage(msg.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/msg:opacity-100 transition-all">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-3 border-t border-border/30">
                  <div className="flex gap-2">
                    <input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Написать..."
                      className="flex-1 h-9 rounded-xl bg-secondary/70 border-0 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground disabled:opacity-50"
                      style={{ background: "var(--gradient-blue)" }}>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </CRMLayout>
  );
}
