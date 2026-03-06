import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, User, CreditCard, RefreshCw, Trash2, Edit3, Save, Loader2, Search } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; class: string }> = {
  active: { label: "Активна", class: "stock-high" },
  expiring: { label: "Истекает", class: "stock-medium" },
  expired: { label: "Истекла", class: "stock-low" },
};

const planGradients = ["var(--gradient-purple)", "var(--gradient-blue)", "var(--gradient-teal)"];

interface SubType {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  plan: string;
  amount: number;
  status: string;
  started_at: string;
  next_payment: string | null;
  auto_renew: boolean;
  payment_method: string;
  total_paid: number;
  created_at: string;
}

function SubscriptionDetailDialog({ sub, onClose, onUpdate, onDelete, plans }: {
  sub: SubType; onClose: () => void;
  onUpdate: (id: string, updates: Partial<SubType>) => void;
  onDelete: (id: string) => void;
  plans: string[];
}) {
  const { toast } = useToast();
  const st = statusConfig[sub.status] || statusConfig.active;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(sub.client_name);
  const [editEmail, setEditEmail] = useState(sub.client_email);
  const [editPhone, setEditPhone] = useState(sub.client_phone);
  const [editAmount, setEditAmount] = useState(sub.amount.toString());
  const [editPlan, setEditPlan] = useState(sub.plan);

  const handleSave = () => {
    onUpdate(sub.id, {
      client_name: editName.trim(),
      client_email: editEmail.trim(),
      client_phone: editPhone.trim(),
      amount: Number(editAmount) || 0,
      plan: editPlan,
    });
    setEditing(false);
    toast({ title: "Подписка обновлена" });
  };

  const initials = sub.client_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const planIdx = plans.indexOf(sub.plan);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg max-h-[85vh] overflow-y-auto apple-card p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground text-sm font-bold" style={{ background: planGradients[planIdx >= 0 ? planIdx % 3 : 0] }}>{initials}</div>
            <div>
              {editing ? (
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-lg font-bold bg-card border border-border rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              ) : (
                <h2 className="text-lg font-bold text-foreground">{sub.client_name}</h2>
              )}
              {editing ? (
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="text-xs bg-card border border-border rounded-lg px-2 py-1 mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full" />
              ) : (
                <p className="text-xs text-muted-foreground">{sub.client_email || "—"}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(sub.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={st.class}>{st.label}</span>
          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{sub.plan}</span>
        </div>

        <div className="apple-card p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Изменить статус</h3>
          <div className="flex gap-2">
            {Object.entries(statusConfig).map(([key, val]) => (
              <button key={key} onClick={() => { onUpdate(sub.id, { status: key }); toast({ title: "Статус обновлён" }); }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${sub.status === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{val.label}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Стоимость</p>
            {editing ? (
              <input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} type="number" className="w-full h-8 rounded-lg bg-card border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            ) : (
              <p className="text-sm font-bold text-foreground">₽{Number(sub.amount).toLocaleString()}/мес</p>
            )}
          </div>
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Подписка с</p>
            <p className="text-sm font-medium text-foreground">{new Date(sub.started_at).toLocaleDateString("ru-RU")}</p>
          </div>
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Следующий платёж</p>
            <p className={`text-sm font-medium ${sub.status === "expired" ? "text-destructive" : "text-foreground"}`}>
              {sub.status === "expired" ? "Просрочен" : sub.next_payment ? new Date(sub.next_payment).toLocaleDateString("ru-RU") : "—"}
            </p>
          </div>
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Всего оплачено</p>
            <p className="text-sm font-bold text-foreground">₽{Number(sub.total_paid).toLocaleString()}</p>
          </div>
        </div>

        <div className="apple-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Детали</h3>
          <div className="space-y-2">
            {sub.client_phone && <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Телефон</span><span className="text-foreground">{sub.client_phone}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Оплата</span><span className="text-foreground">{sub.payment_method || "—"}</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Автопродление</span>
              <button onClick={() => onUpdate(sub.id, { auto_renew: !sub.auto_renew })} className={sub.auto_renew ? "text-success font-medium" : "text-destructive font-medium"}>
                {sub.auto_renew ? "Включено" : "Выключено"}
              </button>
            </div>
          </div>
        </div>

        {editing && (
          <div className="space-y-2">
            <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Телефон" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
              {plans.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={handleSave} className="w-full h-9 rounded-xl text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>Сохранить</button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Subscriptions() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const plans = config.subscriptionPlans;
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubType[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubType | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlan, setNewPlan] = useState(plans[0]);
  const [newAmount, setNewAmount] = useState("");

  const fetchSubs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else setSubs((data || []) as SubType[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const handleUpdate = async (id: string, updates: Partial<SubType>) => {
    const { error } = await supabase.from("subscriptions").update(updates).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setSubs(subs.map(s => s.id === id ? { ...s, ...updates } : s));
    setSelectedSub(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setSubs(subs.filter(s => s.id !== id));
    toast({ title: "Подписка удалена" });
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast({ title: "Ошибка", description: "Введите имя клиента", variant: "destructive" }); return;
    }
    if (!user) return;
    const nextPayment = new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);
    const { data, error } = await supabase.from("subscriptions").insert({
      owner_id: user.id,
      client_name: newName.trim(),
      client_email: newEmail.trim(),
      client_phone: newPhone.trim(),
      plan: newPlan,
      amount: Number(newAmount) || 2900,
      next_payment: nextPayment.toISOString(),
      payment_method: "Картой онлайн",
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setSubs([data as SubType, ...subs]);
      toast({ title: "Подписка создана", description: newName.trim() });
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewAmount(""); setShowAddForm(false);
    }
  };

  const filtered = subs.filter(s => {
    if (activeFilter !== "all" && s.status !== activeFilter) return false;
    if (search && !s.client_name.toLowerCase().includes(search.toLowerCase()) && !s.client_email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: subs.length,
    active: subs.filter(s => s.status === "active").length,
    expiring: subs.filter(s => s.status === "expiring").length,
    expired: subs.filter(s => s.status === "expired").length,
  };

  if (loading) {
    return <CRMLayout title={config.subscriptionsTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.subscriptionsTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap items-center">
            {([["all", "Все"], ["active", "Активные"], ["expiring", "Истекающие"], ["expired", "Истекшие"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveFilter(key)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeFilter === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                {label} ({counts[key]})
              </button>
            ))}
            <div className="relative ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..." className="h-8 w-40 rounded-xl bg-card border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn flex items-center gap-2 text-sm">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAddForm ? "Отмена" : "Создать"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя клиента *" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Телефон" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex gap-3">
                  <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    {plans.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Сумма ₽/мес" type="number" className="w-40 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <button onClick={handleAdd} className="gradient-btn flex items-center gap-2 text-sm ml-auto"><Plus className="w-4 h-4" />Добавить</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const st = statusConfig[s.status] || statusConfig.active;
            const initials = s.client_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
            const planIdx = plans.indexOf(s.plan);
            return (
              <motion.div key={s.id} whileHover={{ y: -2 }} className="apple-card-hover p-5 cursor-pointer group" onClick={() => setSelectedSub(s)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground text-xs font-bold" style={{ background: planGradients[planIdx >= 0 ? planIdx % 3 : 0] }}>{initials}</div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{s.client_name}</h4>
                      <p className="text-[10px] text-muted-foreground">{s.client_email || "—"}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">План</span><span className="font-medium text-foreground">{s.plan}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Стоимость</span><span className="font-medium text-foreground">₽{Number(s.amount).toLocaleString()}/мес</span></div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">С</span><span className="text-muted-foreground">{new Date(s.started_at).toLocaleDateString("ru-RU")}</span></div>
                </div>
                <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                  <span className={st.class}>{st.label}</span>
                  {s.auto_renew && <span className="text-[10px] text-success flex items-center gap-1"><RefreshCw className="w-3 h-3" />Авто</span>}
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground text-sm apple-card">
              {subs.length === 0 ? "Создайте первую подписку" : "Нет подписок по выбранным фильтрам"}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedSub && <SubscriptionDetailDialog sub={selectedSub} onClose={() => setSelectedSub(null)} onUpdate={handleUpdate} onDelete={handleDelete} plans={plans} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
