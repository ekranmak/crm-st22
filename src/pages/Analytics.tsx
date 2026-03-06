import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, Target, ArrowUpRight, ArrowDownRight, Loader2, BarChart3 } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["hsl(215, 80%, 55%)", "hsl(145, 60%, 45%)", "hsl(265, 60%, 65%)", "hsl(35, 90%, 55%)", "hsl(340, 70%, 55%)"];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalIncome: 0, totalExpense: 0, profit: 0,
    totalBookings: 0, totalOrders: 0, totalProducts: 0,
    incomeByCategory: [] as { name: string; value: number }[],
    monthlyData: [] as { month: string; income: number; expense: number }[],
  });

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [finRes, bookRes, orderRes, prodRes] = await Promise.all([
      supabase.from("finance_entries").select("*"),
      supabase.from("bookings").select("id"),
      supabase.from("orders").select("id, total"),
      supabase.from("warehouse_products").select("id"),
    ]);

    const finance = finRes.data || [];
    const income = finance.filter(f => f.type === "income");
    const expenses = finance.filter(f => f.type === "expense");
    const totalIncome = income.reduce((s, f) => s + Number(f.amount), 0);
    const totalExpense = expenses.reduce((s, f) => s + Number(f.amount), 0);

    const incomeByCategory = income.reduce((acc, f) => {
      const name = f.category || f.name;
      const existing = acc.find(a => a.name === name);
      if (existing) existing.value += Number(f.amount);
      else acc.push({ name, value: Number(f.amount) });
      return acc;
    }, [] as { name: string; value: number }[]);

    // Group finance by month
    const monthMap = new Map<string, { income: number; expense: number }>();
    finance.forEach(f => {
      const d = new Date(f.created_at);
      const key = d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
      const entry = monthMap.get(key) || { income: 0, expense: 0 };
      if (f.type === "income") entry.income += Number(f.amount);
      else entry.expense += Number(f.amount);
      monthMap.set(key, entry);
    });
    const monthlyData = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));

    setData({
      totalIncome, totalExpense, profit: totalIncome - totalExpense,
      totalBookings: (bookRes.data || []).length,
      totalOrders: (orderRes.data || []).length,
      totalProducts: (prodRes.data || []).length,
      incomeByCategory, monthlyData,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <CRMLayout title="Аналитика"><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  const kpis = [
    { title: "Выручка", value: `₽${data.totalIncome.toLocaleString()}`, change: data.profit >= 0 ? `+₽${data.profit.toLocaleString()}` : `₽${data.profit.toLocaleString()}`, up: data.profit >= 0, icon: DollarSign },
    { title: "Записей", value: String(data.totalBookings), change: "всего", up: true, icon: Users },
    { title: "Заказов", value: String(data.totalOrders), change: "всего", up: true, icon: Target },
    { title: "Товаров", value: String(data.totalProducts), change: "на складе", up: true, icon: TrendingUp },
  ];

  const hasFinance = data.totalIncome > 0 || data.totalExpense > 0;

  return (
    <CRMLayout title="Аналитика">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.title} className="kpi-card flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{k.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {k.up ? <ArrowUpRight className="w-3 h-3 text-success" /> : <ArrowDownRight className="w-3 h-3 text-destructive" />}
                  <span className={`text-[10px] font-medium ${k.up ? "text-success" : "text-destructive"}`}>{k.change}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <k.icon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue chart */}
          <div className="apple-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Выручка и расходы</h3>
            {data.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.monthlyData}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(215,80%,55%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(215,80%,55%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(340,70%,55%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(340,70%,55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="income" stroke="hsl(215,80%,55%)" strokeWidth={2} fill="url(#gIncome)" name="Доходы" />
                  <Area type="monotone" dataKey="expense" stroke="hsl(340,70%,55%)" strokeWidth={2} fill="url(#gExpense)" name="Расходы" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-16">Добавьте финансовые записи для отображения графика</p>
            )}
          </div>

          {/* Income by category */}
          <div className="apple-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Доходы по категориям</h3>
            {data.incomeByCategory.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={data.incomeByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                      {data.incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px" }} />
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
              <p className="text-center text-sm text-muted-foreground py-16">Нет данных</p>
            )}
          </div>
        </div>

        {!hasFinance && (
          <div className="apple-card p-8 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Аналитика строится на основе реальных данных.<br />Добавьте финансовые записи, заказы и записи клиентов.</p>
          </div>
        )}
      </motion.div>
    </CRMLayout>
  );
}
