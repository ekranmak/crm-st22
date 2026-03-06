import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Handshake, Phone, UserPlus, X, BellOff, Check, Trash2, Mail, ListTodo, Volume2 } from "lucide-react";
import { useCRM, CRMNotification } from "@/contexts/CRMContext";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const typeConfig: Record<CRMNotification["type"], { icon: typeof Bell; color: string; gradient: string }> = {
  task_completed: { icon: CheckCircle2, color: "text-success", gradient: "var(--gradient-green)" },
  deal_closed: { icon: Handshake, color: "text-primary", gradient: "var(--gradient-blue)" },
  call_made: { icon: Phone, color: "text-warning", gradient: "var(--gradient-orange)" },
  client_added: { icon: UserPlus, color: "text-accent-foreground", gradient: "var(--gradient-purple)" },
};

function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "только что";
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  if (s < 86400) return `${Math.floor(s / 3600)} ч назад`;
  return `${Math.floor(s / 86400)} д назад`;
}

export function NotificationBell() {
  const { notifications, notificationsEnabled, setNotificationsEnabled, unreadCount: crmUnread, markAsRead, markAllAsRead, clearNotifications } = useCRM();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [dbUnreadMessages, setDbUnreadMessages] = useState(0);
  const [dbPendingTasks, setDbPendingTasks] = useState(0);
  const prevUnreadRef = useRef(0);

  // Play notification sound
  const playSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  const fetchDbCounts = useCallback(async () => {
    if (!user) return;
    const [msgRes, taskRes] = await Promise.all([
      supabase.from("internal_messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).eq("read", false),
      supabase.from("assigned_tasks").select("id", { count: "exact", head: true }).eq("assignee_id", user.id).in("status", ["todo", "in_progress"]),
    ]);
    const newUnread = msgRes.count || 0;
    setDbUnreadMessages(newUnread);
    setDbPendingTasks(taskRes.count || 0);
    return newUnread;
  }, [user]);

  useEffect(() => {
    fetchDbCounts().then(count => { prevUnreadRef.current = count || 0; });
    const interval = setInterval(fetchDbCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchDbCounts]);

  // Realtime listener for new messages — play sound
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-bell-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages", filter: `recipient_id=eq.${user.id}` }, () => {
        if (notificationsEnabled) playSound();
        fetchDbCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, notificationsEnabled, playSound, fetchDbCounts]);

  const totalBadge = crmUnread + dbUnreadMessages + dbPendingTasks;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) fetchDbCounts(); }}
        className="relative w-9 h-9 rounded-xl bg-secondary/70 flex items-center justify-center hover:bg-secondary transition-colors"
      >
        {notificationsEnabled ? (
          <Bell className="w-4 h-4 text-muted-foreground" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
        {totalBadge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-primary-foreground"
            style={{ background: "var(--gradient-pink)" }}
          >
            {totalBadge > 9 ? "9+" : totalBadge}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-80 sm:w-96 rounded-2xl bg-card border border-border/50 overflow-hidden z-50"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {/* Header */}
            <div className="p-3 border-b border-border/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Уведомления</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${notificationsEnabled ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                  title={notificationsEnabled ? "Выключить уведомления" : "Включить уведомления"}
                >
                  {notificationsEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                </button>
                {crmUnread > 0 && (
                  <button onClick={markAllAsRead} className="p-1.5 rounded-lg text-xs bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Прочитать все">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} className="p-1.5 rounded-lg text-xs bg-secondary text-muted-foreground hover:text-destructive transition-colors" title="Очистить все">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-xs bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status */}
            {!notificationsEnabled && (
              <div className="px-3 py-2 bg-destructive/5 border-b border-border/30 text-[11px] text-destructive flex items-center gap-2">
                <BellOff className="w-3 h-3" /> Уведомления выключены руководителем
              </div>
            )}

            {/* DB counters */}
            {(dbUnreadMessages > 0 || dbPendingTasks > 0) && (
              <div className="px-3 py-2 border-b border-border/30 flex gap-3">
                {dbUnreadMessages > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                      <Mail className="w-3 h-3" />
                    </div>
                    <span className="text-foreground font-medium">{dbUnreadMessages}</span>
                    <span className="text-muted-foreground">непрочит.</span>
                  </div>
                )}
                {dbPendingTasks > 0 && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-orange)" }}>
                      <ListTodo className="w-3 h-3" />
                    </div>
                    <span className="text-foreground font-medium">{dbPendingTasks}</span>
                    <span className="text-muted-foreground">задач</span>
                  </div>
                )}
              </div>
            )}

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && dbUnreadMessages === 0 && dbPendingTasks === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Нет уведомлений
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = typeConfig[n.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => markAsRead(n.id)}
                      className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-secondary/50 ${!n.read ? "bg-primary/[0.03]" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-primary-foreground" style={{ background: cfg.gradient }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-relaxed">
                          <span className="font-semibold">{n.member}</span>{" "}
                          <span className="text-muted-foreground">{n.message}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{timeAgo(n.timestamp)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
