import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Mail, MessageCircle, Send, X, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const typeConfig = {
  incoming: { icon: PhoneIncoming, label: "Входящий", color: "text-success" },
  outgoing: { icon: PhoneOutgoing, label: "Исходящий", color: "text-primary" },
  missed: { icon: PhoneMissed, label: "Пропущенный", color: "text-destructive" },
};

const channelOptions = [
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "bg-green-500/10 text-green-600", buildUrl: (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}` },
  { id: "telegram", name: "Telegram", icon: Send, color: "bg-sky-500/10 text-sky-600", buildUrl: (phone: string) => `https://t.me/${phone.replace(/[^0-9]/g, "")}` },
  { id: "email", name: "Email", icon: Mail, color: "bg-blue-500/10 text-blue-600", buildUrl: (_: string, email?: string) => email ? `mailto:${email}` : "" },
];

interface CallLog {
  id: string;
  contact_name: string;
  phone: string;
  email: string;
  call_type: string;
  duration: string;
  call_time: string;
  notes: string;
}

function SendMessageDialog({ contact, onClose }: { contact: CallLog; onClose: () => void }) {
  const { toast } = useToast();
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) { toast({ title: "Введите сообщение", variant: "destructive" }); return; }
    const ch = channelOptions.find(c => c.id === channel)!;
    let url = "";
    if (channel === "whatsapp") url = `${ch.buildUrl(contact.phone)}?text=${encodeURIComponent(message)}`;
    else if (channel === "telegram") url = ch.buildUrl(contact.phone);
    else url = `mailto:${contact.email}?subject=${encodeURIComponent("Сообщение от CRM")}&body=${encodeURIComponent(message)}`;
    if (url) window.open(url, "_blank");
    toast({ title: `Сообщение через ${ch.name}`, description: `${contact.contact_name} — отправлено` });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md apple-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Написать клиенту</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{contact.contact_name} · {contact.phone}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase font-medium mb-2 block">Канал связи</label>
          <div className="flex gap-2">
            {channelOptions.map(ch => (
              <button key={ch.id} onClick={() => setChannel(ch.id)}
                className={`flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl transition-colors ${channel === ch.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                <ch.icon className="w-4 h-4" />{ch.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase font-medium mb-2 block">Быстрые шаблоны</label>
          <div className="flex gap-1.5 flex-wrap">
            {["Здравствуйте! Как мы можем вам помочь?", "Напоминаем о вашей записи завтра", "Ваш заказ готов к выдаче", "Спасибо за обращение!"].map((tpl, i) => (
              <button key={i} onClick={() => setMessage(tpl)} className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors truncate max-w-[200px]">
                {tpl.slice(0, 35)}{tpl.length > 35 ? "…" : ""}
              </button>
            ))}
          </div>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Введите сообщение..." rows={4} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y" />
        <button onClick={handleSend} className="w-full gradient-btn-purple flex items-center justify-center gap-2 text-sm"><Send className="w-4 h-4" />Отправить через {channelOptions.find(c => c.id === channel)?.name}</button>
      </motion.div>
    </motion.div>
  );
}

function AddCallDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [callType, setCallType] = useState("incoming");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) { toast({ title: "Заполните имя и телефон", variant: "destructive" }); return; }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("call_logs").insert({
      owner_id: user.id,
      contact_name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      call_type: callType,
      duration: duration.trim() || "—",
      notes: notes.trim(),
    });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Звонок записан" }); onAdded(); onClose(); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md apple-card p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Новый звонок</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Имя контакта *" className="col-span-2 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Телефон *" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground uppercase font-medium mb-2 block">Тип звонка</label>
          <div className="flex gap-2">
            {(Object.entries(typeConfig) as [string, typeof typeConfig.incoming][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setCallType(key)}
                className={`flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl transition-colors ${callType === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                <cfg.icon className="w-4 h-4" />{cfg.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Длительность (напр. 4:23)" className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Заметки..." rows={2} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y" />
        <button onClick={handleSave} disabled={saving} className="w-full gradient-btn-green flex items-center justify-center gap-2 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Записать звонок
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Telephony() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedContact, setSelectedContact] = useState<CallLog | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchCalls = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("call_logs")
      .select("*")
      .order("call_time", { ascending: false });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else setCalls((data || []) as CallLog[]);
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("call_logs").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setCalls(calls.filter(c => c.id !== id));
    toast({ title: "Запись удалена" });
  };

  const filtered = calls.filter(c => {
    if (filterType !== "all" && c.call_type !== filterType) return false;
    if (search && !c.contact_name.toLowerCase().includes(search.toLowerCase()) && !c.phone.includes(search)) return false;
    return true;
  });

  const counts = {
    all: calls.length,
    incoming: calls.filter(c => c.call_type === "incoming").length,
    outgoing: calls.filter(c => c.call_type === "outgoing").length,
    missed: calls.filter(c => c.call_type === "missed").length,
  };

  if (loading) {
    return <CRMLayout title={config.telephonyTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.telephonyTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { label: "Всего звонков", value: counts.all },
            { label: "Входящие", value: counts.incoming },
            { label: "Исходящие", value: counts.outgoing },
            { label: "Пропущенные", value: counts.missed },
          ]).map((s) => (
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или телефону..." className="h-9 w-64 rounded-xl bg-card border border-border pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-1">
              {([["all", "Все"], ["incoming", "Входящие"], ["outgoing", "Исходящие"], ["missed", "Пропущенные"]] as const).map(([key, label]) => (
                <button key={key} onClick={() => setFilterType(key)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterType === key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowAddDialog(true)} className="gradient-btn-green flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />Записать звонок
          </button>
        </div>

        <div className="apple-card">
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Журнал звонков</h3>
            <div className="flex gap-1">
              {channelOptions.map(ch => (
                <div key={ch.id} className={`w-6 h-6 rounded-lg flex items-center justify-center ${ch.color}`}>
                  <ch.icon className="w-3 h-3" />
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-border/30">
            {filtered.map((call) => {
              const cfg = typeConfig[call.call_type as keyof typeof typeConfig] || typeConfig.incoming;
              return (
                <div key={call.id} className="flex items-center gap-4 p-4 table-row-hover group">
                  <div className={`w-9 h-9 rounded-xl bg-secondary flex items-center justify-center ${cfg.color}`}><cfg.icon className="w-4 h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{call.contact_name}</p>
                    <p className="text-[10px] text-muted-foreground">{call.phone}{call.email ? ` · ${call.email}` : ""}</p>
                    {call.notes && <p className="text-[10px] text-muted-foreground/70 mt-0.5">💬 {call.notes}</p>}
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-xs text-foreground">{new Date(call.call_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(call.call_time).toLocaleDateString("ru-RU")}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5"><Clock className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{call.duration}</span></div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {channelOptions.map(ch => (
                      <button key={ch.id} onClick={() => setSelectedContact(call)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:scale-105 ${ch.color}`}
                        title={`Написать в ${ch.name}`}>
                        <ch.icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                    <button onClick={() => handleDelete(call.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {calls.length === 0 ? "Нет записей. Добавьте первый звонок." : "Нет звонков по фильтру"}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedContact && <SendMessageDialog contact={selectedContact} onClose={() => setSelectedContact(null)} />}
        {showAddDialog && <AddCallDialog onClose={() => setShowAddDialog(false)} onAdded={fetchCalls} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
