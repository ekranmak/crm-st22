import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Package, Clock, CheckCircle2, XCircle, Truck, X, User, Calendar, MapPin, Phone, Mail, CreditCard, Trash2, Edit3, Save, Loader2 } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const statusIcons: Record<string, typeof Package> = {
  "Новый": Package, "Новая": Package, "Бриф": Package,
  "В работе": Clock, "Обучение": Clock, "Собирается": Clock, "Замер": Clock, "Согласование": Clock,
  "Готов": CheckCircle2, "Отправлен": Truck, "Смета": Clock, "Оплачена": CheckCircle2,
  "Выдан": CheckCircle2, "Доставлен": CheckCircle2, "Сдан": CheckCircle2, "Завершён": CheckCircle2, "Закрыт": CheckCircle2,
  "Отменён": XCircle, "Возврат": XCircle,
};

const statusColors: Record<string, string> = {
  "Новый": "stock-medium", "Новая": "stock-medium", "Бриф": "stock-medium",
  "В работе": "stock-medium", "Обучение": "stock-medium", "Собирается": "stock-medium", "Замер": "stock-medium", "Согласование": "stock-medium",
  "Готов": "stock-high", "Отправлен": "stock-high", "Смета": "stock-medium", "Оплачена": "stock-high",
  "Выдан": "stock-high", "Доставлен": "stock-high", "Сдан": "stock-high", "Завершён": "stock-high", "Закрыт": "stock-high",
  "Отменён": "stock-low", "Возврат": "stock-low",
};

interface OrderType {
  id: string;
  order_number: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  items: string;
  total: number;
  status: string;
  payment_method: string;
  manager: string;
  notes: string;
  created_at: string;
}

function OrderDetailDialog({ order, onClose, ordersTitle, allStatuses, onStatusChange, onDelete, onUpdate }: {
  order: OrderType; onClose: () => void; ordersTitle: string; allStatuses: string[];
  onStatusChange: (id: string, status: string) => void; onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OrderType>) => void;
}) {
  const { toast } = useToast();
  const Icon = statusIcons[order.status] || Package;
  const color = statusColors[order.status] || "stock-medium";

  const [editing, setEditing] = useState(false);
  const [editClient, setEditClient] = useState(order.client_name);
  const [editPhone, setEditPhone] = useState(order.client_phone);
  const [editEmail, setEditEmail] = useState(order.client_email);
  const [editItems, setEditItems] = useState(order.items);
  const [editTotal, setEditTotal] = useState(order.total.toString());
  const [editNotes, setEditNotes] = useState(order.notes);

  const handleSave = () => {
    onUpdate(order.id, {
      client_name: editClient.trim(),
      client_phone: editPhone.trim(),
      client_email: editEmail.trim(),
      items: editItems.trim(),
      total: Number(editTotal) || 0,
      notes: editNotes.trim(),
    });
    setEditing(false);
    toast({ title: "Заказ обновлён" });
  };

  const timeline = [
    { label: "Создан", date: new Date(order.created_at).toLocaleDateString("ru-RU"), done: true },
    { label: "Подтверждён", done: !["Новый", "Новая", "Отменён", "Возврат"].includes(order.status) },
    { label: "В работе", done: ["В работе", "Собирается", "Готов", "Отправлен", "Выдан", "Доставлен", "Сдан", "Завершён", "Закрыт"].includes(order.status) },
    { label: "Завершён", done: ["Выдан", "Доставлен", "Сдан", "Завершён", "Закрыт"].includes(order.status) },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg max-h-[85vh] overflow-y-auto apple-card p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center"><Icon className="w-6 h-6 text-muted-foreground" /></div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{ordersTitle}: {order.order_number}</h2>
              <span className={color}>{order.status}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(order.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="apple-card p-4 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Изменить статус</h3>
          <div className="flex gap-1.5 flex-wrap">
            {allStatuses.map((s) => (
              <button key={s} onClick={() => onStatusChange(order.id, s)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${order.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="apple-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Клиент</h3>
          {editing ? (
            <div className="space-y-2">
              <input value={editClient} onChange={(e) => setEditClient(e.target.value)} placeholder="Имя клиента" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Телефон" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /><span className="text-foreground font-medium">{order.client_name}</span></div>
              {order.client_phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{order.client_phone}</span></div>}
              {order.client_email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">{order.client_email}</span></div>}
            </div>
          )}
        </div>

        <div className="apple-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Состав заказа</h3>
          {editing ? (
            <div className="space-y-2">
              <input value={editItems} onChange={(e) => setEditItems(e.target.value)} placeholder="Товары через запятую" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <input value={editTotal} onChange={(e) => setEditTotal(e.target.value)} type="number" placeholder="Сумма" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Заметки" rows={2} className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y" />
              <button onClick={handleSave} className="w-full h-9 rounded-xl text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>Сохранить</button>
            </div>
          ) : (
            <div className="space-y-2">
              {order.items.split(",").map((item, i) => (
                <div key={i} className="flex justify-between text-sm p-2 rounded-lg bg-secondary/50">
                  <span className="text-foreground">{item.trim()}</span>
                  <span className="text-muted-foreground font-medium">₽{Math.round(order.total / Math.max(order.items.split(",").length, 1)).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/30">
                <span className="text-foreground">Итого</span>
                <span className="text-foreground">₽{order.total.toLocaleString()}</span>
              </div>
              {order.notes && <p className="text-xs text-muted-foreground mt-2">💬 {order.notes}</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Дата</p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{new Date(order.created_at).toLocaleDateString("ru-RU")}</p>
          </div>
          <div className="apple-card p-3 space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase">Оплата</p>
            <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />{order.payment_method || "—"}</p>
          </div>
          {order.manager && (
            <div className="apple-card p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">Менеджер</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{order.manager}</p>
            </div>
          )}
        </div>

        <div className="apple-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">История заказа</h3>
          {timeline.map((step) => (
            <div key={step.label} className="flex items-center gap-3 py-2">
              <div className={`w-3 h-3 rounded-full shrink-0 ${step.done ? "bg-success" : "bg-secondary"}`} />
              <span className={`text-sm ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{step.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Orders() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("Все");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderType | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newItems, setNewItems] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [newPayment, setNewPayment] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else setOrders((data || []) as OrderType[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const statuses = ["Все", ...config.orderStatuses];
  const filtered = orders.filter(
    (o) =>
      (activeStatus === "Все" || o.status === activeStatus) &&
      (o.client_name.toLowerCase().includes(search.toLowerCase()) || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.items.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setOrders(orders.map((o) => o.id === id ? { ...o, status } : o));
    setSelectedOrder((prev) => prev && prev.id === id ? { ...prev, status } : prev);
    toast({ title: "Статус обновлён" });
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setOrders(orders.filter((o) => o.id !== id));
    toast({ title: "Заказ удалён" });
  };

  const handleUpdate = async (id: string, updates: Partial<OrderType>) => {
    const { error } = await supabase.from("orders").update(updates).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setOrders(orders.map((o) => o.id === id ? { ...o, ...updates } : o));
    setSelectedOrder((prev) => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleAdd = async () => {
    if (!newClient.trim() || !newItems.trim()) {
      toast({ title: "Ошибка", description: "Заполните имя клиента и состав заказа", variant: "destructive" }); return;
    }
    if (!user) return;
    const orderNum = `${config.ordersTitle.charAt(0).toUpperCase()}-${String(orders.length + 1).padStart(3, "0")}`;
    const { data, error } = await supabase.from("orders").insert({
      owner_id: user.id,
      order_number: orderNum,
      client_name: newClient.trim(),
      client_phone: newPhone.trim(),
      items: newItems.trim(),
      total: Number(newTotal) || 0,
      status: config.orderStatuses[0],
      payment_method: newPayment.trim(),
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setOrders([data as OrderType, ...orders]);
      toast({ title: "Заказ создан", description: `${orderNum} — ${newClient.trim()}` });
      setNewClient(""); setNewPhone(""); setNewItems(""); setNewTotal(""); setNewPayment(""); setShowAddForm(false);
    }
  };

  if (loading) {
    return <CRMLayout title={config.ordersTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.ordersTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Всего", value: orders.length },
            { label: "Активные", value: orders.filter((o) => !["Выдан", "Доставлен", "Сдан", "Завершён", "Закрыт", "Отменён", "Возврат"].includes(o.status)).length },
            { label: "Завершённые", value: orders.filter((o) => ["Выдан", "Доставлен", "Сдан", "Завершён", "Закрыт"].includes(o.status)).length },
            { label: "Сумма", value: `₽${totalRevenue.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="kpi-card">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск..." className="h-9 w-56 rounded-xl bg-card border border-border pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statuses.map((s) => (
                <button key={s} onClick={() => setActiveStatus(s)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{s}</button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn-green flex items-center gap-2 text-sm">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAddForm ? "Отмена" : "Создать"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Имя клиента *" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="Телефон клиента" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <input value={newItems} onChange={(e) => setNewItems(e.target.value)} placeholder="Состав заказа *" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <div className="flex gap-3">
                  <input value={newTotal} onChange={(e) => setNewTotal(e.target.value)} placeholder="Сумма ₽" type="number" className="w-40 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <select value={newPayment} onChange={(e) => setNewPayment(e.target.value)} className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    <option value="">Способ оплаты</option>
                    <option value="Картой онлайн">Картой онлайн</option>
                    <option value="Наличные">Наличные</option>
                    <option value="Безнал">Безнал</option>
                    <option value="СБП">СБП</option>
                  </select>
                  <button onClick={handleAdd} className="gradient-btn flex items-center gap-2 text-sm ml-auto"><Plus className="w-4 h-4" />Добавить</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="apple-card divide-y divide-border/30">
          {filtered.map((order) => {
            const Icon = statusIcons[order.status] || Package;
            const color = statusColors[order.status] || "stock-medium";
            return (
              <div key={order.id} className="flex items-center gap-4 p-4 table-row-hover cursor-pointer group" onClick={() => setSelectedOrder(order)}>
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                    <span className="text-sm font-medium text-foreground truncate">{order.client_name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{order.items}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">₽{Number(order.total).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
                <span className={color}>{order.status}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {orders.length === 0 ? "Создайте первый заказ" : "Нет заказов по выбранным фильтрам"}
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedOrder && <OrderDetailDialog order={selectedOrder} onClose={() => setSelectedOrder(null)} ordersTitle={config.ordersTitle} allStatuses={config.orderStatuses} onStatusChange={handleStatusChange} onDelete={handleDelete} onUpdate={handleUpdate} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
