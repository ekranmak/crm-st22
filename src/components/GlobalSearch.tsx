import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, X, CalendarDays, ShoppingCart, Package, FileText, CreditCard, Phone, Users, FolderKanban, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  url: string;
}

const MODULE_CONFIG: Record<string, { icon: React.ElementType; label: string; url: string }> = {
  bookings: { icon: CalendarDays, label: "Онлайн-запись", url: "/booking" },
  orders: { icon: ShoppingCart, label: "Заказы", url: "/orders" },
  warehouse_products: { icon: Package, label: "Склад", url: "/warehouse" },
  documents: { icon: FileText, label: "Документы", url: "/documents" },
  subscriptions: { icon: CreditCard, label: "Подписки", url: "/subscriptions" },
  call_logs: { icon: Phone, label: "Телефония", url: "/telephony" },
  profiles: { icon: Users, label: "Команда", url: "/settings" },
  assigned_tasks: { icon: FolderKanban, label: "Задачи", url: "/projects" },
};

export function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (!user || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const term = `%${q}%`;
    const allResults: SearchResult[] = [];

    const queries = [
      supabase.from("bookings").select("id, client_name, service, status").ilike("client_name", term).limit(5),
      supabase.from("orders").select("id, client_name, order_number, status").or(`client_name.ilike.${term},order_number.ilike.${term}`).limit(5),
      supabase.from("warehouse_products").select("id, name, sku, category").or(`name.ilike.${term},sku.ilike.${term}`).limit(5),
      supabase.from("documents").select("id, name, counterparty, doc_type").or(`name.ilike.${term},counterparty.ilike.${term}`).limit(5),
      supabase.from("subscriptions").select("id, client_name, plan, status").ilike("client_name", term).limit(5),
      supabase.from("call_logs").select("id, contact_name, phone").or(`contact_name.ilike.${term},phone.ilike.${term}`).limit(5),
      supabase.from("profiles").select("id, full_name, role").ilike("full_name", term).limit(5),
      supabase.from("assigned_tasks").select("id, title, status").ilike("title", term).limit(5),
    ];

    const [bookings, orders, products, docs, subs, calls, profiles, tasks] = await Promise.all(queries);

    bookings.data?.forEach(r => allResults.push({
      id: r.id, title: r.client_name, subtitle: `${r.service} • ${r.status}`,
      module: "bookings", icon: MODULE_CONFIG.bookings.icon, url: "/booking",
    }));
    orders.data?.forEach(r => allResults.push({
      id: r.id, title: `${r.order_number} — ${r.client_name}`, subtitle: r.status,
      module: "orders", icon: MODULE_CONFIG.orders.icon, url: "/orders",
    }));
    products.data?.forEach(r => allResults.push({
      id: r.id, title: r.name, subtitle: `${r.sku} • ${r.category}`,
      module: "warehouse_products", icon: MODULE_CONFIG.warehouse_products.icon, url: "/warehouse",
    }));
    docs.data?.forEach(r => allResults.push({
      id: r.id, title: r.name, subtitle: `${r.doc_type} • ${r.counterparty}`,
      module: "documents", icon: MODULE_CONFIG.documents.icon, url: "/documents",
    }));
    subs.data?.forEach(r => allResults.push({
      id: r.id, title: r.client_name, subtitle: `${r.plan} • ${r.status}`,
      module: "subscriptions", icon: MODULE_CONFIG.subscriptions.icon, url: "/subscriptions",
    }));
    calls.data?.forEach(r => allResults.push({
      id: r.id, title: r.contact_name, subtitle: r.phone,
      module: "call_logs", icon: MODULE_CONFIG.call_logs.icon, url: "/telephony",
    }));
    profiles.data?.forEach(r => allResults.push({
      id: r.id, title: r.full_name || "Без имени", subtitle: r.role,
      module: "profiles", icon: MODULE_CONFIG.profiles.icon, url: "/settings",
    }));
    tasks.data?.forEach(r => allResults.push({
      id: r.id, title: r.title, subtitle: r.status,
      module: "assigned_tasks", icon: MODULE_CONFIG.assigned_tasks.icon, url: "/projects",
    }));

    setResults(allResults);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = MODULE_CONFIG[r.module]?.label || r.module;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Поиск... (Ctrl+K)"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="h-9 w-56 rounded-xl bg-secondary/70 border-0 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:w-72"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-2 p-1 rounded-md hover:bg-secondary text-muted-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 w-80 max-h-[420px] overflow-auto rounded-xl bg-card border border-border/50 shadow-xl z-50"
          >
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="py-8 text-center">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Ничего не найдено по запросу «{query}»</p>
              </div>
            )}

            {!loading && Object.entries(groupedResults).map(([group, items]) => (
              <div key={group}>
                <div className="px-3 py-1.5 bg-secondary/30">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group}</span>
                </div>
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
