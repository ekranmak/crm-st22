import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, Globe, Calendar, AlertCircle, CheckCircle2, Clock,
  Search, Filter, Download, Trash2, Eye, ArrowRight, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface WebLead {
  id: string;
  site_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_company: string;
  message: string;
  status: string;
  page_url: string;
  referrer: string;
  created_at: string;
  site_name?: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  new: { label: "Новая", color: "text-blue-600", bg: "bg-blue-50", icon: AlertCircle },
  contacted: { label: "Контактирована", color: "text-yellow-600", bg: "bg-yellow-50", icon: Phone },
  converted: { label: "Конвертирована", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  archived: { label: "Архив", color: "text-gray-600", bg: "bg-gray-50", icon: Clock },
};

export default function WebLeads() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<WebLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("web_leads")
      .select("*, sites(name)")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setLeads(
        data.map((lead: any) => ({
          id: lead.id,
          site_id: lead.site_id,
          client_name: lead.client_name,
          client_email: lead.client_email,
          client_phone: lead.client_phone,
          client_company: lead.client_company,
          message: lead.message,
          status: lead.status,
          page_url: lead.page_url,
          referrer: lead.referrer,
          created_at: lead.created_at,
          site_name: lead.sites?.name || "Unknown",
        }))
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = async (id: string, status: string) => {
    await supabase.from("web_leads").update({ status }).eq("id", id);
    setLeads((prev) =>
      prev.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
    toast({ title: "Статус обновлен" });
  };

  const deleteLead = async (id: string) => {
    await supabase.from("web_leads").delete().eq("id", id);
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    setSelectedLead(null);
    toast({ title: "Заявка удалена" });
  };

  const convertToOrder = async (lead: WebLead) => {
    const { error } = await supabase.from("orders").insert({
      owner_id: user!.id,
      order_number: `WEB-${lead.id.substring(0, 8).toUpperCase()}`,
      client_name: lead.client_name,
      client_email: lead.client_email,
      client_phone: lead.client_phone,
      items: lead.message,
      status: "Новый",
      notes: `Заявка с сайта: ${lead.site_name}`,
    });

    if (!error) {
      updateLeadStatus(lead.id, "converted");
      toast({ title: "Заявка конвертирована в заказ" });
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.client_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.site_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || lead.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  if (loading) {
    return (
      <CRMLayout title="Web Заявки">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout title="Web Заявки">
      <div className="space-y-6 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Всего заявок", value: stats.total, icon: Mail, color: "blue" },
            { label: "Новых", value: stats.new, icon: AlertCircle, color: "red" },
            { label: "Конвертировано", value: stats.converted, icon: CheckCircle2, color: "green" },
          ].map((stat) => (
            <div key={stat.label} className="apple-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-${stat.color}-500`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени, email, сайту..."
              className="w-full h-10 rounded-xl bg-secondary/70 border-0 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 bg-secondary/50 rounded-xl p-1">
            {["all", "new", "contacted", "converted"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "all" ? "Все" : statusConfig[status]?.label || status}
              </button>
            ))}
          </div>
        </div>

        {/* Leads list */}
        <div className="space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="apple-card p-12 text-center">
              <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Нет заявок</p>
            </div>
          ) : (
            filteredLeads.map((lead) => {
              const st = statusConfig[lead.status] || statusConfig.new;
              const StIcon = st.icon;
              const isSelected = selectedLead === lead.id;

              return (
                <motion.div
                  key={lead.id}
                  layout
                  className={`apple-card overflow-hidden transition-all cursor-pointer ${
                    isSelected ? "ring-2 ring-primary/30" : ""
                  }`}
                  onClick={() => setSelectedLead(isSelected ? null : lead.id)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${st.bg}`}>
                        <StIcon className={`w-5 h-5 ${st.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">
                          {lead.client_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.client_email} • {lead.site_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("ru-RU")}
                      </span>
                      <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-border/50 p-4 space-y-4"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <a
                              href={`mailto:${lead.client_email}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <Mail className="w-3 h-3" /> {lead.client_email}
                            </a>
                          </div>
                          {lead.client_phone && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Телефон</p>
                              <a
                                href={`tel:${lead.client_phone}`}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" /> {lead.client_phone}
                              </a>
                            </div>
                          )}
                          {lead.client_company && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Компания</p>
                              <p className="text-sm text-foreground">{lead.client_company}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Источник</p>
                            <a
                              href={lead.page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{new URL(lead.page_url || "").pathname}</span>
                            </a>
                          </div>
                        </div>

                        {lead.message && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Сообщение</p>
                            <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3">
                              {lead.message}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                          {lead.status !== "converted" && (
                            <button
                              onClick={() => convertToOrder(lead)}
                              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all"
                            >
                              ⭐ Конвертировать в заказ
                            </button>
                          )}

                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground"
                          >
                            {Object.entries(statusConfig).map(([key, val]) => (
                              <option key={key} value={key}>
                                {val.label}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => deleteLead(lead.id)}
                            className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition-all"
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" /> Удалить
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </CRMLayout>
  );
}
