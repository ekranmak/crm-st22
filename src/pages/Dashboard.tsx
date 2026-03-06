import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion } from "framer-motion";
import { useCRM, TeamMember } from "@/contexts/CRMContext";
import { ManagerCardDialog } from "@/components/ManagerCardDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Users, DollarSign, Target, ArrowUpRight, ArrowDownRight,
  CalendarDays, FileText, Mail, Package, Loader2, MessageSquare, CheckSquare,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const COLORS = ["hsl(215, 80%, 55%)", "hsl(145, 60%, 45%)", "hsl(265, 60%, 65%)", "hsl(35, 90%, 55%)", "hsl(340, 70%, 55%)"];

interface DashboardData {
  totalBookings: number;
  pendingBookings: number;
  totalIncome: number;
  totalExpense: number;
  totalDocs: number;
  draftDocs: number;
  totalCampaigns: number;
  sentCampaigns: number;
  totalProducts: number;
  lowStockProducts: number;
  totalTasks: number;
  todoTasks: number;
  unreadMessages: number;
  recentBookings: { name: string; service: string; date: string }[];
  incomeByCategory: { name: string; value: number }[];
}

export default function Dashboard() {
  const { config, teamMembers, businessType, getBusinessLabel } = useCRM();
  const { user } = useAuth();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalBookings: 0, pendingBookings: 0, totalIncome: 0, totalExpense: 0,
    totalDocs: 0, draftDocs: 0, totalCampaigns: 0, sentCampaigns: 0,
    totalProducts: 0, lowStockProducts: 0, totalTasks: 0, todoTasks: 0,
    unreadMessages: 0, recentBookings: [], incomeByCategory: [],
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [bookingsRes, financeRes, docsRes, campaignsRes, productsRes, tasksRes, messagesRes] = await Promise.all([
      supabase.from("bookings").select("*"),
      supabase.from("finance_entries").select("*"),
      supabase.from("documents").select("id, status"),
      supabase.from("email_campaigns").select("id, status"),
      supabase.from("warehouse_products").select("id, qty, min_qty"),
      supabase.from("assigned_tasks").select("id, status"),
      supabase.from("internal_messages").select("id, read, recipient_id").eq("recipient_id", user.id).eq("read", false),
    ]);

    const bookings = bookingsRes.data || [];
    const finance = financeRes.data || [];
    const docs = docsRes.data || [];
    const campaigns = campaignsRes.data || [];
    const products = productsRes.data || [];
    const tasks = tasksRes.data || [];
    const messages = messagesRes.data || [];

    const income = finance.filter(f => f.type === "income");
    const expenses = finance.filter(f => f.type === "expense");

    const incomeByCategory = income.reduce((acc, f) => {
      const existing = acc.find(a => a.name === (f.category || f.name));
      if (existing) existing.value += Number(f.amount);
      else acc.push({ name: f.category || f.name, value: Number(f.amount) });
      return acc;
    }, [] as { name: string; value: number }[]);

    setData({
      totalBookings: bookings.length,
      pendingBookings: bookings.filter(b => b.status === "pending").length,
      totalIncome: income.reduce((s, f) => s + Number(f.amount), 0),
      totalExpense: expenses.reduce((s, f) => s + Number(f.amount), 0),
      totalDocs: docs.length,
      draftDocs: docs.filter(d => d.status === "Черновик").length,
      totalCampaigns: campaigns.length,
      sentCampaigns: campaigns.filter(c => c.status === "sent").length,
      totalProducts: products.length,
      lowStockProducts: products.filter(p => p.min_qty > 0 && p.qty <= p.min_qty).length,
      totalTasks: tasks.length,
      todoTasks: tasks.filter(t => t.status === "todo").length,
      unreadMessages: messages.length,
      recentBookings: bookings.slice(0, 5).map(b => ({ name: b.client_name, service: b.service, date: new Date(b.booking_date).toLocaleDateString("ru-RU") })),
      incomeByCategory,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const profit = data.totalIncome - data.totalExpense;

  if (loading) {
    return <CRMLayout title="Дашборд"><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  const kpis = [
    { title: "Выручка", value: `₽${data.totalIncome.toLocaleString()}`, change: profit > 0 ? `+₽${profit.toLocaleString()}` : `₽${profit.toLocaleString()}`, up: profit >= 0, icon: DollarSign, gradient: "var(--gradient-green)" },
    { title: "Записей", value: String(data.totalBookings), change: `${data.pendingBookings} ожидает`, up: true, icon: CalendarDays, gradient: "var(--gradient-blue)" },
    { title: "Документов", value: String(data.totalDocs), change: `${data.draftDocs} черновиков`, up: true, icon: FileText, gradient: "var(--gradient-purple)" },
    { title: "Склад", value: String(data.totalProducts), change: data.lowStockProducts > 0 ? `${data.lowStockProducts} мало` : "Всё в норме", up: data.lowStockProducts === 0, icon: Package, gradient: "var(--gradient-orange)" },
  ];

  const activityFeed = [
    ...(data.unreadMessages > 0 ? [{ icon: MessageSquare, text: `${data.unreadMessages} непрочитанных сообщений`, gradient: "var(--gradient-blue)" }] : []),
    ...(data.todoTasks > 0 ? [{ icon: CheckSquare, text: `${data.todoTasks} задач ожидают выполнения`, gradient: "var(--gradient-green)" }] : []),
    ...(data.pendingBookings > 0 ? [{ icon: CalendarDays, text: `${data.pendingBookings} записей ожидают подтверждения`, gradient: "var(--gradient-purple)" }] : []),
    ...(data.lowStockProducts > 0 ? [{ icon: Package, text: `${data.lowStockProducts} товаров с низким остатком`, gradient: "var(--gradient-orange)" }] : []),
    ...(data.sentCampaigns > 0 ? [{ icon: Mail, text: `${data.sentCampaigns} рассылок отправлено`, gradient: "var(--gradient-teal)" }] : []),
  ];

  const revenueData = [
    { name: "Доход", value: data.totalIncome / 1000 },
    { name: "Расход", value: data.totalExpense / 1000 },
    { name: "Прибыль", value: Math.max(0, profit) / 1000 },
  ];

  return (
    <CRMLayout title={`Дашборд — ${getBusinessLabel(businessType)}`}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <motion.div key={kpi.title} variants={item} className="kpi-card flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.title}</p>
                <p className="text-2xl font-bold text-foreground tracking-tight">{kpi.value}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  {kpi.up ? <ArrowUpRight className="w-3.5 h-3.5 text-success" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                  <span className={`text-xs font-medium ${kpi.up ? "text-success" : "text-destructive"}`}>{kpi.change}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: kpi.gradient }}><kpi.icon className="w-5 h-5" /></div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={item} className="apple-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Финансы (тыс. ₽)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 92%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="value" fill="hsl(215, 80%, 55%)" radius={[6, 6, 0, 0]}>
                  {revenueData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={item} className="apple-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Доходы по статьям</h3>
            {data.incomeByCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.incomeByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                      {data.incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {data.incomeByCategory.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-muted-foreground">{d.name}</span></div>
                      <span className="font-medium text-foreground">₽{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Добавьте финансовые записи</p>
            )}
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div variants={item} className="apple-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Последние записи</h3>
            {data.recentBookings.length > 0 ? (
              <div className="space-y-2">
                {data.recentBookings.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: COLORS[i % COLORS.length] }}><CalendarDays className="w-3.5 h-3.5" /></div>
                      <div><p className="text-sm font-medium text-foreground">{b.name}</p><p className="text-[10px] text-muted-foreground">{b.service}</p></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{b.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Нет записей</p>
            )}
          </motion.div>

          <motion.div variants={item} className="apple-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Уведомления</h3>
            {activityFeed.length > 0 ? (
              <div className="space-y-3">
                {activityFeed.map((a, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground shrink-0" style={{ background: a.gradient }}><a.icon className="w-3.5 h-3.5" /></div>
                    <p className="text-xs text-foreground leading-relaxed pt-1.5">{a.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Всё под контролем ✅</p>
            )}
          </motion.div>
        </div>

        <ManagerCardDialog member={selectedMember} open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)} />
      </motion.div>
    </CRMLayout>
  );
}
