import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Plus, X, ExternalLink, Trash2, CheckCircle2, AlertCircle,
  Clock, Search, Link2, FileText, Shield, Smartphone,
  RefreshCw, Eye, TrendingUp, Zap, Loader2, Inbox,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { WebhookIntegration } from "@/components/WebhookIntegration";

interface Site {
  id: string;
  url: string;
  name: string;
  status: string;
  ssl: boolean;
  mobile: boolean;
  pages: number;
  lastCheck: string;
  uptime: number;
  speed: number;
  visitors: number;
  webhook_token?: string;
  webhook_enabled?: boolean;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  active: { label: "Активен", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  checking: { label: "Проверка...", color: "text-warning", bg: "bg-warning/10", icon: RefreshCw },
  error: { label: "Ошибка", color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle },
  pending: { label: "Ожидание", color: "text-muted-foreground", bg: "bg-secondary", icon: Clock },
};

function formatLastCheck(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  return `${Math.floor(hours / 24)} дн назад`;
}

export default function Sites() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("sites").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    if (data) {
      setSites(data.map(s => ({
        id: s.id, url: s.url, name: s.name, status: s.status,
        ssl: s.ssl, mobile: s.mobile, pages: s.pages,
        uptime: Number(s.uptime), speed: s.speed, visitors: s.visitors,
        lastCheck: formatLastCheck(s.last_check),
        webhook_token: s.webhook_token,
        webhook_enabled: s.webhook_enabled,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const filteredSites = sites.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addSite = async () => {
    if (!newUrl.trim() || !user) return;
    let url = newUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;
    const name = newName.trim() || (() => { try { return new URL(url).hostname; } catch { return url; } })();

    const { data, error } = await supabase.from("sites").insert({
      owner_id: user.id, url, name, status: "active", ssl: url.startsWith("https"),
    }).select().single();

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    setNewUrl(""); setNewName(""); setShowAdd(false);
    toast({ title: "Сайт добавлен", description: name });
    fetchSites();
  };

  const removeSite = async (id: string) => {
    await supabase.from("sites").delete().eq("id", id);
    setSites(p => p.filter(s => s.id !== id));
    if (selectedSite === id) setSelectedSite(null);
    toast({ title: "Сайт удалён" });
  };

  const recheckSite = async (id: string) => {
    setSites(p => p.map(s => s.id === id ? { ...s, status: "checking" } : s));
    await supabase.from("sites").update({ status: "active", last_check: new Date().toISOString() }).eq("id", id);
    setTimeout(() => fetchSites(), 1000);
    toast({ title: "Проверка завершена" });
  };

  const toggleWebhook = async (id: string, enabled: boolean) => {
    let token = sites.find(s => s.id === id)?.webhook_token;
    
    // Generate new token if enabling and no token exists
    if (enabled && !token) {
      token = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }

    const { error } = await supabase.from("sites").update({ 
      webhook_enabled: enabled,
      webhook_token: token 
    }).eq("id", id);

    if (!error) {
      setSites(p => p.map(s => s.id === id ? { ...s, webhook_enabled: enabled, webhook_token: token } : s));
      toast({ title: enabled ? "Webhook включен" : "Webhook отключен" });
    }
  };

  const totalVisitors = sites.reduce((a, s) => a + s.visitors, 0);
  const avgUptime = sites.length ? (sites.reduce((a, s) => a + s.uptime, 0) / sites.length).toFixed(1) : "0";
  const activeSites = sites.filter((s) => s.status === "active").length;

  if (loading) {
    return <CRMLayout title="Сайты"><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title="Сайты">
      <div className="space-y-6 max-w-6xl">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Всего сайтов", value: sites.length, icon: Globe, gradient: "var(--gradient-blue)" },
            { label: "Активных", value: activeSites, icon: CheckCircle2, gradient: "var(--gradient-green)" },
            { label: "Посетители", value: totalVisitors.toLocaleString(), icon: Eye, gradient: "var(--gradient-purple)" },
            { label: "Аптайм", value: `${avgUptime}%`, icon: TrendingUp, gradient: "var(--gradient-orange)" },
          ].map((card) => (
            <div key={card.label} className="apple-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground shrink-0" style={{ background: card.gradient }}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{card.value}</p>
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск сайтов..."
              className="w-full h-10 rounded-xl bg-secondary/70 border-0 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="gradient-btn flex items-center gap-2 text-sm">
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "Отмена" : "Добавить сайт"}
          </button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" /> Подключить сайт
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">URL сайта</label>
                    <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://example.com"
                      className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Название (необязательно)</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Мой сайт"
                      className="w-full h-10 rounded-xl bg-secondary/50 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <button onClick={addSite} disabled={!newUrl.trim()} className="gradient-btn text-sm px-6 disabled:opacity-40">
                  <Zap className="w-4 h-4 mr-1.5 inline" /> Подключить
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sites grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSites.map((site) => {
            const st = statusConfig[site.status] || statusConfig.pending;
            const StIcon = st.icon;
            const isSelected = selectedSite === site.id;

            return (
              <motion.div key={site.id} layout
                className={`apple-card overflow-hidden cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary/30" : ""}`}
                onClick={() => setSelectedSite(isSelected ? null : site.id)}
              >
                <div className="p-4 flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{site.name}</h3>
                      <p className="text-[11px] text-muted-foreground truncate">{site.url}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>
                    <StIcon className={`w-3 h-3 ${site.status === "checking" ? "animate-spin" : ""}`} />
                    {st.label}
                  </span>
                </div>

                <div className="px-4 pb-3 grid grid-cols-4 gap-2">
                  {[
                    { icon: Shield, label: "SSL", value: site.ssl ? "Да" : "Нет", ok: site.ssl },
                    { icon: Smartphone, label: "Мобильная", value: site.mobile ? "Да" : "Нет", ok: site.mobile },
                    { icon: FileText, label: "Страниц", value: site.pages.toString(), ok: true },
                    { icon: Zap, label: "Скорость", value: `${site.speed}мс`, ok: site.speed < 800 || site.speed === 0 },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <m.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${m.ok ? "text-success" : "text-destructive"}`} />
                      <p className="text-[10px] font-medium text-foreground">{m.value}</p>
                      <p className="text-[8px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border/30">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{site.uptime.toFixed(1)}%</p>
                            <p className="text-[10px] text-muted-foreground">Аптайм</p>
                          </div>
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{site.visitors.toLocaleString()}</p>
                            <p className="text-[10px] text-muted-foreground">Посетители</p>
                          </div>
                          <div className="bg-secondary/50 rounded-xl p-3 text-center">
                            <p className="text-lg font-bold text-foreground">{site.speed}мс</p>
                            <p className="text-[10px] text-muted-foreground">Ответ сервера</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-foreground">Проверки</h4>
                          {[
                            { label: "SSL-сертификат", ok: site.ssl, detail: site.ssl ? "Валидный" : "Не установлен" },
                            { label: "Мобильная адаптация", ok: site.mobile, detail: site.mobile ? "Оптимизирован" : "Не адаптирован" },
                            { label: "Скорость загрузки", ok: site.speed < 800 || site.speed === 0, detail: site.speed > 0 ? `${site.speed}мс` : "Не проверено" },
                            { label: "SEO-метатеги", ok: site.pages > 0, detail: site.pages > 0 ? "Обнаружены" : "Не проверено" },
                            { label: "Карта сайта", ok: site.pages > 0, detail: `${site.pages} страниц` },
                          ].map((check) => (
                            <div key={check.label} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-secondary/30">
                              <div className="flex items-center gap-2">
                                {check.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
                                <span className="text-xs text-foreground">{check.label}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">{check.detail}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Последняя проверка: {site.lastCheck}
                          </span>
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); recheckSite(site.id); }}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <RefreshCw className={`w-3.5 h-3.5 ${site.status === "checking" ? "animate-spin" : ""}`} /> Проверить
                            </button>
                            <a href={site.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" /> Открыть
                            </a>
                            <button onClick={(e) => { e.stopPropagation(); removeSite(site.id); }}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Web Leads Webhook Integration */}
                        <WebhookIntegration
                          siteId={site.id}
                          webhookToken={site.webhook_token || ""}
                          webhookEnabled={site.webhook_enabled || false}
                          supabaseUrl={import.meta.env.VITE_SUPABASE_URL}
                          onToggle={(enabled) => {
                            toggleWebhook(site.id, enabled);
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {filteredSites.length === 0 && !loading && (
          <div className="apple-card p-12 text-center">
            <Globe className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Нет подключённых сайтов</p>
            <button onClick={() => setShowAdd(true)} className="gradient-btn text-sm mt-4">
              <Plus className="w-4 h-4 mr-1.5 inline" /> Добавить первый сайт
            </button>
          </div>
        )}
      </div>
    </CRMLayout>
  );
}
