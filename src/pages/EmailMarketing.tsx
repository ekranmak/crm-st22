import { useState, useCallback, useEffect, useMemo } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Mail, Send, Eye, MousePointer, Users, X, Edit3, Save, Trash2, Loader2, Sparkles, MessageCircle, Phone, CheckSquare, UserCheck, Search } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const statusLabels: Record<string, { label: string; class: string }> = {
  sent: { label: "Отправлена", class: "stock-high" },
  draft: { label: "Черновик", class: "stock-low" },
  scheduled: { label: "Запланирована", class: "stock-medium" },
};

const segments = [
  { id: "all", name: "Все клиенты", desc: "Полная база" },
  { id: "active", name: "Активные (30 дней)", desc: "Недавние покупатели" },
  { id: "vip", name: "VIP клиенты", desc: "Высокий LTV" },
  { id: "new", name: "Новые (7 дней)", desc: "Новые регистрации" },
];

const channels = [
  { id: "email", name: "Email", icon: Mail, color: "bg-blue-500/10 text-blue-600", pieColor: "hsl(215, 80%, 55%)" },
  { id: "whatsapp", name: "WhatsApp", icon: MessageCircle, color: "bg-green-500/10 text-green-600", pieColor: "hsl(142, 70%, 45%)" },
  { id: "telegram", name: "Telegram", icon: Send, color: "bg-sky-500/10 text-sky-600", pieColor: "hsl(199, 80%, 50%)" },
  { id: "sms", name: "SMS", icon: Phone, color: "bg-amber-500/10 text-amber-600", pieColor: "hsl(38, 90%, 50%)" },
];

const emailTemplates = [
  { name: "Промо-акция", subject: "🔥 Специальное предложение для вас!", body: "Уважаемый клиент!\n\nМы рады предложить вам эксклюзивную скидку 20% на все услуги.\n\nАкция действует до конца месяца.\n\nС уважением,\nВаша команда" },
  { name: "Новости компании", subject: "📢 Новости и обновления", body: "Здравствуйте!\n\nДелимся последними новостями:\n\n• Новая линейка услуг\n• Обновлённый прайс-лист\n• Специальные условия для постоянных клиентов\n\nС уважением,\nВаша команда" },
  { name: "Напоминание", subject: "⏰ Напоминание о записи", body: "Уважаемый клиент!\n\nНапоминаем о вашей предстоящей записи.\n\nЕсли вы хотите перенести или отменить запись, свяжитесь с нами.\n\nДо встречи!" },
  { name: "День рождения", subject: "🎂 С днём рождения!", body: "Дорогой клиент!\n\nПоздравляем вас с днём рождения! 🎉\n\nВ подарок — скидка 30% на любую услугу в течение недели.\n\nС наилучшими пожеланиями!" },
];

function parseChannels(ch: string | undefined | null): string[] {
  if (!ch) return ["email"];
  if (ch.includes(",")) return ch.split(",").filter(Boolean);
  return [ch];
}

function serializeChannels(arr: string[]): string {
  return arr.length > 0 ? arr.join(",") : "email";
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: string;
  segment: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  scheduled_at: string | null;
  created_at: string;
  channel: string;
}

interface CRMClient {
  name: string;
  phone: string | null;
}

function ChannelToggle({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      if (selected.length > 1) onChange(selected.filter(c => c !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  return (
    <div className="flex gap-2 flex-wrap">
      {channels.map(ch => {
        const active = selected.includes(ch.id);
        return (
          <button key={ch.id} type="button" onClick={() => toggle(ch.id)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
            {active && <CheckSquare className="w-3 h-3" />}
            <ch.icon className="w-3 h-3" />{ch.name}
          </button>
        );
      })}
    </div>
  );
}

function ChannelBadges({ channelStr }: { channelStr: string }) {
  const arr = parseChannels(channelStr);
  return (
    <div className="flex items-center gap-1">
      {arr.map(id => {
        const ch = channels.find(x => x.id === id);
        if (!ch) return null;
        return <div key={id} className={`w-5 h-5 rounded flex items-center justify-center ${ch.color}`}><ch.icon className="w-3 h-3" /></div>;
      })}
    </div>
  );
}

// --- Client Picker ---
function ClientPicker({ clients, selected, onChange }: {
  clients: CRMClient[];
  selected: CRMClient[];
  onChange: (v: CRMClient[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [clients, search]);

  const isSelected = (client: CRMClient) => selected.some(s => s.name === client.name && s.phone === client.phone);

  const toggle = (client: CRMClient) => {
    if (isSelected(client)) {
      onChange(selected.filter(s => !(s.name === client.name && s.phone === client.phone)));
    } else {
      onChange([...selected, client]);
    }
  };

  const selectAll = () => onChange([...clients]);
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-muted-foreground uppercase font-medium">Получатели из CRM</label>
        <div className="flex gap-2">
          <button type="button" onClick={selectAll} className="text-[10px] text-primary hover:underline">Выбрать всех ({clients.length})</button>
          {selected.length > 0 && <button type="button" onClick={clearAll} className="text-[10px] text-destructive hover:underline">Очистить</button>}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.slice(0, 10).map((c, i) => (
            <span key={i} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg flex items-center gap-1">
              {c.name}
              <button type="button" onClick={() => toggle(c)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {selected.length > 10 && <span className="text-[11px] text-muted-foreground">+{selected.length - 10} ещё</span>}
        </div>
      )}

      <button type="button" onClick={() => setOpen(!open)}
        className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm text-left flex items-center justify-between hover:border-primary/30 transition-colors">
        <span className="text-muted-foreground flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          {selected.length > 0 ? `Выбрано: ${selected.length} клиентов` : "Выбрать клиентов..."}
        </span>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="border border-border rounded-xl bg-card">
              <div className="flex items-center border-b border-border px-3 gap-2">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по имени или телефону..."
                  className="h-9 w-full bg-transparent text-sm focus:outline-none" />
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/30">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Клиенты не найдены</div>
                ) : filtered.map((c, i) => (
                  <div key={i} onClick={() => toggle(c)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors ${isSelected(c) ? "bg-primary/5" : ""}`}>
                    <div>
                      <p className="text-sm text-foreground">{c.name}</p>
                      {c.phone && <p className="text-[10px] text-muted-foreground">{c.phone}</p>}
                    </div>
                    {isSelected(c) && <CheckSquare className="w-4 h-4 text-primary" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Campaign Dialog ---
function CampaignDialog({ campaign, onClose, onUpdate, onDelete, onSend }: {
  campaign: Campaign; onClose: () => void;
  onUpdate: (id: string, updates: Partial<Campaign>) => void;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(campaign.name);
  const [editSubject, setEditSubject] = useState(campaign.subject);
  const [editBody, setEditBody] = useState(campaign.body);
  const [editSegment, setEditSegment] = useState(campaign.segment);
  const [editChannels, setEditChannels] = useState(parseChannels(campaign.channel));

  const handleSave = () => {
    onUpdate(campaign.id, { name: editName, subject: editSubject, body: editBody, segment: editSegment, channel: serializeChannels(editChannels) });
    setEditing(false);
    toast({ title: "Кампания обновлена" });
  };

  const st = statusLabels[campaign.status] || statusLabels.draft;
  const campaignChannels = parseChannels(campaign.channel);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg max-h-[85vh] overflow-y-auto apple-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <span className={`text-[10px] ${st.class} mr-2`}>{st.label}</span>
            {editing ? <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-lg font-bold bg-card border border-border rounded-xl px-3 py-1 w-full mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
              : <h2 className="text-lg font-bold text-foreground mt-1">{campaign.name}</h2>}
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(campaign.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {campaign.status === "sent" && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Отправлено", value: campaign.sent_count },
              { label: "Открыто", value: `${campaign.opened_count} (${campaign.sent_count > 0 ? Math.round(campaign.opened_count / campaign.sent_count * 100) : 0}%)` },
              { label: "Клики", value: `${campaign.clicked_count} (${campaign.sent_count > 0 ? Math.round(campaign.clicked_count / campaign.sent_count * 100) : 0}%)` },
            ].map(s => (
              <div key={s.label} className="apple-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Тема</label>
              <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Сегмент</label>
              <select value={editSegment} onChange={(e) => setEditSegment(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 appearance-none cursor-pointer">
                {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Каналы</label>
              <div className="mt-1"><ChannelToggle selected={editChannels} onChange={setEditChannels} /></div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Тело письма</label>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 resize-y" />
            </div>
            <button onClick={handleSave} className="w-full h-9 rounded-xl text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>Сохранить</button>
          </div>
        ) : (
          <>
            <div className="apple-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Тема</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{campaign.subject || "—"}</p>
            </div>
            <div className="apple-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Сегмент</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{segments.find(s => s.id === campaign.segment)?.name || campaign.segment}</p>
            </div>
            <div className="apple-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Каналы</p>
              <div className="flex items-center gap-2 flex-wrap">
                {campaignChannels.map(id => {
                  const ch = channels.find(c => c.id === id);
                  return ch ? <span key={id} className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1 ${ch.color}`}><ch.icon className="w-3 h-3" />{ch.name}</span> : null;
                })}
              </div>
            </div>
            {campaign.body && (
              <div className="apple-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Превью</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">{campaign.body}</pre>
              </div>
            )}
          </>
        )}

        {campaign.status === "draft" && (
          <button onClick={() => { onSend(campaign.id); onClose(); }} className="w-full gradient-btn-purple flex items-center justify-center gap-2 text-sm">
            <Send className="w-4 h-4" />Отправить рассылку
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Main page ---
export default function EmailMarketing() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newSegment, setNewSegment] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState(-1);
  const [newChannels, setNewChannels] = useState<string[]>(["email"]);
  const [crmClients, setCrmClients] = useState<CRMClient[]>([]);
  const [selectedClients, setSelectedClients] = useState<CRMClient[]>([]);

  const fetchCampaigns = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { setCampaigns(data || []); }
    setLoading(false);
  }, [user, toast]);

  // Fetch unique clients from bookings + team_members
  const fetchClients = useCallback(async () => {
    if (!user) return;
    const [bookingsRes, teamRes] = await Promise.all([
      supabase.from("bookings").select("client_name, phone"),
      supabase.from("team_members").select("name, phone, email"),
    ]);
    const clientMap = new Map<string, CRMClient>();
    (bookingsRes.data || []).forEach(b => {
      const key = `${b.client_name}|${b.phone || ""}`;
      if (!clientMap.has(key)) clientMap.set(key, { name: b.client_name, phone: b.phone });
    });
    (teamRes.data || []).forEach(t => {
      const key = `${t.name}|${t.phone || ""}`;
      if (!clientMap.has(key)) clientMap.set(key, { name: t.name, phone: t.phone });
    });
    setCrmClients(Array.from(clientMap.values()));
  }, [user]);

  useEffect(() => { fetchCampaigns(); fetchClients(); }, [fetchCampaigns, fetchClients]);

  const totalSent = campaigns.reduce((s, c) => s + c.sent_count, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.opened_count, 0);
  const totalClicked = campaigns.reduce((s, c) => s + c.clicked_count, 0);

  // Per-channel statistics
  const channelStats = useMemo(() => {
    const stats: Record<string, number> = {};
    campaigns.filter(c => c.status === "sent").forEach(c => {
      const chs = parseChannels(c.channel);
      const perChannel = Math.floor(c.sent_count / chs.length);
      chs.forEach(ch => { stats[ch] = (stats[ch] || 0) + perChannel; });
    });
    return channels.map(ch => ({ ...ch, count: stats[ch.id] || 0 })).filter(ch => ch.count > 0);
  }, [campaigns]);

  const engagementData = campaigns.filter(c => c.status === "sent").slice(0, 7).map(c => ({
    name: c.name.slice(0, 12),
    opens: c.opened_count,
    clicks: c.clicked_count,
  }));

  const handleAdd = async () => {
    if (!newName.trim()) { toast({ title: "Ошибка", description: "Введите название", variant: "destructive" }); return; }
    if (!user) return;
    const { data, error } = await supabase.from("email_campaigns").insert({
      owner_id: user.id, name: newName.trim(), subject: newSubject.trim(),
      body: newBody.trim(), segment: newSegment, channel: serializeChannels(newChannels),
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setCampaigns(prev => [data, ...prev]);
      const recipientInfo = selectedClients.length > 0
        ? `${selectedClients.length} получателей`
        : segments.find(s => s.id === newSegment)?.name || "Все";
      toast({ title: "Кампания создана", description: `${newName.trim()} → ${newChannels.map(id => channels.find(c => c.id === id)?.name).join(", ")} | ${recipientInfo}` });
      setNewName(""); setNewSubject(""); setNewBody(""); setSelectedTemplate(-1); setNewChannels(["email"]); setSelectedClients([]); setShowAddForm(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Campaign>) => {
    const { error } = await supabase.from("email_campaigns").update(updates).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setSelectedCampaign(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast({ title: "Кампания удалена" });
  };

  const handleSend = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    const chs = campaign ? parseChannels(campaign.channel) : ["email"];
    const sentCount = selectedClients.length > 0 ? selectedClients.length : Math.floor(Math.random() * 2000) + 500;
    const openedCount = Math.floor(sentCount * (0.3 + Math.random() * 0.3));
    const clickedCount = Math.floor(openedCount * (0.15 + Math.random() * 0.2));
    await handleUpdate(id, { status: "sent", sent_count: sentCount, opened_count: openedCount, clicked_count: clickedCount });
    toast({ title: "Рассылка отправлена!", description: `${sentCount} получателей через ${chs.map(c => channels.find(x => x.id === c)?.name).join(", ")}` });
  };

  const applyTemplate = (idx: number) => {
    setSelectedTemplate(idx);
    if (idx >= 0) {
      const t = emailTemplates[idx];
      setNewName(t.name);
      setNewSubject(t.subject);
      setNewBody(t.body);
    }
  };

  if (loading) {
    return <CRMLayout title={config.emailTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.emailTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Send, label: "Отправлено", value: totalSent.toLocaleString() },
              { icon: Eye, label: "Открытий", value: totalOpened.toLocaleString() },
              { icon: MousePointer, label: "Кликов", value: totalClicked.toLocaleString() },
            ].map(s => (
              <div key={s.label} className="kpi-card flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><s.icon className="w-4 h-4 text-muted-foreground" /></div>
                <div><p className="text-[10px] text-muted-foreground">{s.label}</p><p className="text-lg font-bold text-foreground">{s.value}</p></div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn-purple flex items-center gap-2 text-sm">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAddForm ? "Отмена" : "Создать рассылку"}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-medium mb-2 block">Шаблон</label>
                  <div className="flex gap-2 flex-wrap">
                    {emailTemplates.map((t, i) => (
                      <button key={i} onClick={() => applyTemplate(i)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedTemplate === i ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                        <Sparkles className="w-3 h-3" />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название кампании" className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <select value={newSegment} onChange={(e) => setNewSegment(e.target.value)} className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    {segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Client picker from CRM */}
                <ClientPicker clients={crmClients} selected={selectedClients} onChange={setSelectedClients} />

                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-medium mb-2 block">Каналы рассылки (можно несколько)</label>
                  <ChannelToggle selected={newChannels} onChange={setNewChannels} />
                </div>
                <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Тема письма" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Текст письма..." rows={5} className="w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y" />
                <div className="flex items-center justify-between">
                  {selectedClients.length > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> {selectedClients.length} получателей выбрано
                    </span>
                  )}
                  <button onClick={handleAdd} className="gradient-btn-purple flex items-center gap-2 text-sm ml-auto"><Plus className="w-4 h-4" />Создать</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="apple-card lg:col-span-2 divide-y divide-border/30">
            <div className="p-4"><h3 className="text-sm font-semibold text-foreground">Кампании ({campaigns.length})</h3></div>
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Создайте первую рассылку</div>
            ) : campaigns.map(c => {
              const st = statusLabels[c.status] || statusLabels.draft;
              return (
                <div key={c.id} className="p-4 table-row-hover cursor-pointer group" onClick={() => setSelectedCampaign(c)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChannelBadges channelStr={c.channel} />
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={st.class}>{st.label}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {c.subject && <p className="text-xs text-muted-foreground mb-1">📧 {c.subject}</p>}
                  {c.status === "sent" && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Отправлено: {c.sent_count}</span>
                      <span>Открытий: {c.opened_count} ({c.sent_count > 0 ? Math.round(c.opened_count / c.sent_count * 100) : 0}%)</span>
                      <span>Кликов: {c.clicked_count}</span>
                    </div>
                  )}
                  {c.status === "draft" && (
                    <button onClick={(e) => { e.stopPropagation(); handleSend(c.id); }} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"><Send className="w-3 h-3" />Отправить</button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Channel stats pie */}
            {channelStats.length > 0 && (
              <div className="apple-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Статистика по каналам</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={channelStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={30}>
                      {channelStats.map(ch => <Cell key={ch.id} fill={ch.pieColor} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {channelStats.map(ch => (
                    <div key={ch.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.pieColor }} />
                      {ch.name}: {ch.count.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="apple-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Сегменты</h3>
              <div className="space-y-2">
                {segments.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-muted-foreground" /><div><p className="text-xs text-foreground">{s.name}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div></div>
                  </div>
                ))}
              </div>
            </div>

            {engagementData.length > 0 && (
              <div className="apple-card p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Вовлечённость</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={engagementData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220, 10%, 50%)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "12px", fontSize: "11px" }} />
                    <Bar dataKey="opens" name="Открытия" fill="hsl(215, 80%, 55%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="clicks" name="Клики" fill="hsl(265, 60%, 65%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedCampaign && <CampaignDialog campaign={selectedCampaign} onClose={() => setSelectedCampaign(null)} onUpdate={handleUpdate} onDelete={handleDelete} onSend={handleSend} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
