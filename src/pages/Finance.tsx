import { useState, useCallback, useEffect } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank, Receipt, FileSpreadsheet, FileText, Plus, Trash2, X, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COLORS = [
  "hsl(215, 80%, 55%)", "hsl(150, 60%, 45%)", "hsl(265, 60%, 55%)",
  "hsl(25, 85%, 55%)", "hsl(340, 70%, 55%)", "hsl(180, 50%, 45%)",
];

const formatMoney = (amount: number): string => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} млрд`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} млн`;
  return amount.toLocaleString("ru-RU");
};

interface FinanceEntry {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
}

export default function Finance() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<"income" | "expense">("income");
  const [newCategory, setNewCategory] = useState("");

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("finance_entries").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else {
      setEntries((data || []).map(e => ({
        id: e.id, name: e.name, amount: Number(e.amount),
        type: e.type as "income" | "expense", category: e.category || "",
      })));
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const income = entries.filter(c => c.type === "income");
  const expenses = entries.filter(c => c.type === "expense");
  const totalIncome = income.reduce((s, c) => s + c.amount, 0);
  const totalExpense = expenses.reduce((s, c) => s + c.amount, 0);
  const profit = totalIncome - totalExpense;
  const pieData = income.map(c => ({ name: c.name, value: c.amount }));

  // Group by month for chart
  const monthlyData = [
    { month: "Доходы", income: totalIncome / 1000, expense: 0 },
    { month: "Расходы", income: 0, expense: totalExpense / 1000 },
  ];

  const handleAdd = async () => {
    if (!newName.trim() || !newAmount.trim() || isNaN(Number(newAmount))) {
      toast({ title: "Ошибка", description: "Введите название и сумму", variant: "destructive" }); return;
    }
    if (!user) return;
    const { data, error } = await supabase.from("finance_entries").insert({
      owner_id: user.id, name: newName.trim(), amount: Number(newAmount),
      type: newType, category: newCategory.trim() || (newType === "income" ? "Доход" : "Расход"),
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setEntries(prev => [{ id: data.id, name: data.name, amount: Number(data.amount), type: data.type as "income" | "expense", category: data.category || "" }, ...prev]);
      toast({ title: "Статья добавлена", description: `${data.name} — ₽${Number(data.amount).toLocaleString()}` });
      setNewName(""); setNewAmount(""); setNewCategory(""); setShowAddForm(false);
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("finance_entries").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast({ title: "Статья удалена" });
  };

  const exportCSV = useCallback(() => {
    const rows = [
      ["Категория", "Тип", "Сумма (₽)"],
      ...entries.map(c => [c.name, c.type === "income" ? "Доход" : "Расход", c.amount.toString()]),
      [], ["Итого доходы", "", totalIncome.toString()], ["Итого расходы", "", totalExpense.toString()], ["Прибыль", "", profit.toString()],
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `finance-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Экспорт CSV", description: "Файл скачан" });
  }, [entries, totalIncome, totalExpense, profit, toast]);

  const exportPDF = useCallback(() => {
    const w = window.open("", "_blank");
    if (!w) { toast({ title: "Ошибка", description: "Разрешите всплывающие окна", variant: "destructive" }); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Финансовый отчёт</title>
<style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a1a}h1{font-size:22px;margin-bottom:4px}
.sub{color:#888;font-size:13px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #eee;font-size:13px}
th{background:#f8f8f8;font-weight:600}.income{color:#16a34a}.expense{color:#dc2626}
.summary{display:flex;gap:24px;margin-bottom:30px}.scard{background:#f8f9fa;border-radius:12px;padding:16px 20px}
.scard .label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px}
.scard .val{font-size:22px;font-weight:700;margin-top:4px}
@media print{body{padding:20px}}</style></head><body>
<h1>${config.financeTitle} — Отчёт</h1><p class="sub">Дата: ${new Date().toLocaleDateString("ru-RU")}</p>
<div class="summary"><div class="scard"><div class="label">Выручка</div><div class="val">₽${totalIncome.toLocaleString()}</div></div>
<div class="scard"><div class="label">Расходы</div><div class="val">₽${totalExpense.toLocaleString()}</div></div>
<div class="scard"><div class="label">Прибыль</div><div class="val">₽${profit.toLocaleString()}</div></div></div>
<table><thead><tr><th>Категория</th><th>Тип</th><th style="text-align:right">Сумма</th></tr></thead><tbody>
${entries.map(c => `<tr><td>${c.name}</td><td class="${c.type}">${c.type === "income" ? "Доход" : "Расход"}</td><td style="text-align:right;font-weight:600">₽${c.amount.toLocaleString()}</td></tr>`).join("")}
</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
    toast({ title: "PDF", description: "Откроется окно печати" });
  }, [entries, totalIncome, totalExpense, profit, config.financeTitle, toast]);

  if (loading) {
    return <CRMLayout title={config.financeTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.financeTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Обзор</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn-green flex items-center gap-1.5 text-xs">
              {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}{showAddForm ? "Отмена" : "Добавить"}
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" />CSV
            </button>
            <button onClick={exportPDF} className="gradient-btn flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5" />PDF
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название статьи" className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Сумма ₽" type="number" className="w-36 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Категория" className="w-36 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <select value={newType} onChange={(e) => setNewType(e.target.value as "income" | "expense")} className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    <option value="income">Доход</option>
                    <option value="expense">Расход</option>
                  </select>
                  <button onClick={handleAdd} className="gradient-btn flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Добавить</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Выручка", value: `₽${formatMoney(totalIncome)}`, icon: DollarSign, gradient: "var(--gradient-green)" },
            { label: "Расходы", value: `₽${formatMoney(totalExpense)}`, icon: Wallet, gradient: "var(--gradient-orange)" },
            { label: "Прибыль", value: `₽${formatMoney(profit)}`, icon: PiggyBank, gradient: "var(--gradient-blue)" },
            { label: "Статей", value: entries.length, icon: Receipt, gradient: "var(--gradient-purple)" },
          ].map(s => (
            <div key={s.label} className="kpi-card flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground shrink-0" style={{ background: s.gradient }}><s.icon className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
                <p className="text-base sm:text-lg font-bold text-foreground truncate">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="apple-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Структура</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[{ name: "Итого", income: totalIncome / 1000, expense: totalExpense / 1000 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,92%)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px" }} />
                <Bar dataKey="income" name="Доходы (тыс. ₽)" fill="hsl(150,60%,45%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Расходы (тыс. ₽)" fill="hsl(25,85%,55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="apple-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Доходы по статьям</h3>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-muted-foreground">{d.name}</span></div>
                      <span className="font-medium text-foreground">₽{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Добавьте статьи доходов</p>
            )}
          </div>
        </div>

        {/* Entries table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[{ title: "Доходы", items: income, color: "text-success" }, { title: "Расходы", items: expenses, color: "text-destructive" }].map(section => (
            <div key={section.title} className="apple-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">{section.title}</h3>
              {section.items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">Нет записей</p>
              ) : (
                <div className="space-y-2">
                  {section.items.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 group">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        {c.category && <p className="text-[10px] text-muted-foreground">{c.category}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${section.color}`}>₽{c.amount.toLocaleString()}</span>
                        <button onClick={() => handleRemove(c.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </CRMLayout>
  );
}
