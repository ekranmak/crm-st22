import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, ShoppingCart, FileText, Phone, FolderKanban,
  MessageSquare, CreditCard, Package, TrendingUp, Clock,
  BarChart3, X, Loader2, Activity,
} from "lucide-react";

interface EmployeeKPICardProps {
  userId: string;
  userName: string;
  userRole: string;
  customTitle: string;
  open: boolean;
  onClose: () => void;
}

interface KPIData {
  bookings: number;
  orders: number;
  ordersTotal: number;
  documents: number;
  calls: number;
  tasks: { total: number; done: number; inProgress: number };
  messages: number;
  subscriptions: number;
  lastActivity: string | null;
}

export function EmployeeKPICard({ userId, userName, userRole, customTitle, open, onClose }: EmployeeKPICardProps) {
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActions, setRecentActions] = useState<{ label: string; time: string; icon: React.ElementType }[]>([]);

  const loadKPI = useCallback(async () => {
    setLoading(true);

    const [
      { count: bookingsCount },
      { count: ordersCount },
      { data: ordersData },
      { count: docsCount },
      { count: callsCount },
      { data: tasksAll },
      { count: sentMessages },
      { count: subsCount },
    ] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("orders").select("total").eq("owner_id", userId),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("call_logs").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase.from("assigned_tasks").select("id, status, created_at").eq("assignee_id", userId),
      supabase.from("internal_messages").select("id", { count: "exact", head: true }).eq("sender_id", userId),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    ]);

    const tasksDone = tasksAll?.filter(t => t.status === "done").length || 0;
    const tasksInProgress = tasksAll?.filter(t => t.status === "in_progress").length || 0;
    const ordersTotal = ordersData?.reduce((s, o) => s + Number(o.total), 0) || 0;

    // Get last activity timestamps
    const [
      { data: lastBooking },
      { data: lastOrder },
      { data: lastMessage },
      { data: lastTask },
      { data: lastCall },
    ] = await Promise.all([
      supabase.from("bookings").select("created_at, client_name").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("orders").select("created_at, client_name").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("internal_messages").select("created_at").eq("sender_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("assigned_tasks").select("created_at, title").eq("assignee_id", userId).order("created_at", { ascending: false }).limit(1),
      supabase.from("call_logs").select("created_at, contact_name").eq("owner_id", userId).order("created_at", { ascending: false }).limit(1),
    ]);

    const actions: { label: string; time: string; icon: React.ElementType }[] = [];
    if (lastBooking?.[0]) actions.push({ label: `Запись: ${lastBooking[0].client_name}`, time: lastBooking[0].created_at, icon: CalendarDays });
    if (lastOrder?.[0]) actions.push({ label: `Заказ: ${lastOrder[0].client_name}`, time: lastOrder[0].created_at, icon: ShoppingCart });
    if (lastMessage?.[0]) actions.push({ label: "Отправил сообщение", time: lastMessage[0].created_at, icon: MessageSquare });
    if (lastTask?.[0]) actions.push({ label: `Задача: ${lastTask[0].title}`, time: lastTask[0].created_at, icon: FolderKanban });
    if (lastCall?.[0]) actions.push({ label: `Звонок: ${lastCall[0].contact_name}`, time: lastCall[0].created_at, icon: Phone });

    actions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActions(actions.slice(0, 5));

    const allDates = actions.map(a => a.time).filter(Boolean);
    const lastActivity = allDates.length > 0 ? allDates[0] : null;

    setKpi({
      bookings: bookingsCount || 0,
      orders: ordersCount || 0,
      ordersTotal,
      documents: docsCount || 0,
      calls: callsCount || 0,
      tasks: { total: tasksAll?.length || 0, done: tasksDone, inProgress: tasksInProgress },
      messages: sentMessages || 0,
      subscriptions: subsCount || 0,
      lastActivity,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (open) loadKPI();
  }, [open, loadKPI]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} дн назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const taskCompletion = kpi && kpi.tasks.total > 0 ? Math.round((kpi.tasks.done / kpi.tasks.total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-bold" style={{ background: "var(--gradient-blue)" }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{userName}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{customTitle || userRole}</span>
                    {kpi?.lastActivity && (
                      <>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(kpi.lastActivity)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : kpi && (
              <div className="p-5 space-y-5 max-h-[70vh] overflow-auto">
                {/* KPI Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    Показатели KPI
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { label: "Записи", value: kpi.bookings, icon: CalendarDays, gradient: "var(--gradient-blue)" },
                      { label: "Заказы", value: kpi.orders, icon: ShoppingCart, gradient: "var(--gradient-orange)" },
                      { label: "Сумма заказов", value: `₽${kpi.ordersTotal.toLocaleString("ru-RU")}`, icon: TrendingUp, gradient: "var(--gradient-green)" },
                      { label: "Документы", value: kpi.documents, icon: FileText, gradient: "var(--gradient-purple)" },
                      { label: "Звонки", value: kpi.calls, icon: Phone, gradient: "var(--gradient-pink)" },
                      { label: "Сообщения", value: kpi.messages, icon: MessageSquare, gradient: "var(--gradient-teal)" },
                      { label: "Подписки", value: kpi.subscriptions, icon: CreditCard, gradient: "var(--gradient-orange)" },
                      { label: "Задачи", value: kpi.tasks.total, icon: FolderKanban, gradient: "var(--gradient-blue)" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-secondary/30 border border-border/20">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground shrink-0" style={{ background: item.gradient }}>
                          <item.icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task progress */}
                {kpi.tasks.total > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" />
                      Прогресс задач
                    </h4>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Выполнено {kpi.tasks.done} из {kpi.tasks.total}</span>
                        <span className="text-xs font-semibold text-foreground">{taskCompletion}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${taskCompletion}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: "var(--gradient-green)" }}
                        />
                      </div>
                      <div className="flex gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground">✅ Готово: {kpi.tasks.done}</span>
                        <span className="text-[10px] text-muted-foreground">🔄 В работе: {kpi.tasks.inProgress}</span>
                        <span className="text-[10px] text-muted-foreground">📋 Ожидает: {kpi.tasks.total - kpi.tasks.done - kpi.tasks.inProgress}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                <div>
                  <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    Последняя активность
                  </h4>
                  {recentActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Нет активности</p>
                  ) : (
                    <div className="space-y-1.5">
                      {recentActions.map((action, i) => {
                        const Icon = action.icon;
                        return (
                          <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground truncate">{action.label}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(action.time)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
