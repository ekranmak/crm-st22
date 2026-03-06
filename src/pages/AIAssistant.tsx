import { useState, useRef, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { Bot, Send, Loader2, Trash2, Sparkles, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const QUICK_QUESTIONS = [
  "Сколько у нас активных заказов?",
  "Какая прибыль за текущий период?",
  "Какие задачи с высоким приоритетом?",
  "Товары с низким остатком на складе",
  "Сводка по подпискам клиентов",
  "Какие документы в черновике?",
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [context, setContext] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadContext = useCallback(async () => {
    if (!user) return null;
    const [ordersRes, tasksRes, financeRes, bookingsRes, productsRes, docsRes, campaignsRes, subsRes, teamRes] = await Promise.all([
      supabase.from("orders").select("order_number, client_name, total, status, manager, items").limit(50),
      supabase.from("assigned_tasks").select("title, priority, status, due_date, description").limit(50),
      supabase.from("finance_entries").select("name, amount, type, category"),
      supabase.from("bookings").select("client_name, service, booking_date, status").limit(30),
      supabase.from("warehouse_products").select("name, sku, qty, min_qty, price, category").limit(50),
      supabase.from("documents").select("name, doc_type, status, amount").limit(30),
      supabase.from("email_campaigns").select("name, status, sent_count, opened_count").limit(20),
      supabase.from("subscriptions").select("client_name, plan, amount, status").limit(30),
      supabase.from("profiles").select("full_name, role"),
    ]);

    const finance = financeRes.data || [];
    const income = finance.filter(f => f.type === "income");
    const expenses = finance.filter(f => f.type === "expense");
    const totalIncome = income.reduce((s, f) => s + Number(f.amount), 0);
    const totalExpense = expenses.reduce((s, f) => s + Number(f.amount), 0);

    const ctx = {
      orders: ordersRes.data || [],
      tasks: tasksRes.data || [],
      finance: { totalIncome, totalExpense, profit: totalIncome - totalExpense, count: finance.length },
      bookings: bookingsRes.data || [],
      products: productsRes.data || [],
      documents: docsRes.data || [],
      campaigns: campaignsRes.data || [],
      subscriptions: subsRes.data || [],
      team: teamRes.data || [],
    };
    setContext(ctx);
    setContextLoaded(true);
    return ctx;
  }, [user]);

  useEffect(() => { loadContext(); }, [loadContext]);

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: msg };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setLoading(true);

    // Refresh context on each send
    const freshCtx = await loadContext();

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      // Get the user's JWT token from the Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось получить токен аутентификации" });
        setLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: allMessages, context: freshCtx }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Ошибка сервера" }));
        toast({ variant: "destructive", title: "Ошибка", description: err.error || `Ошибка ${resp.status}` });
        setLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Ошибка", description: "Не удалось подключиться к ИИ-ассистенту" });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, loadContext]);

  const stats = context ? [
    { label: "Заказов", value: context.orders.length },
    { label: "Задач", value: context.tasks.length },
    { label: "Товаров", value: context.products.length },
    { label: "Документов", value: context.documents.length },
  ] : [];

  return (
    <CRMLayout title="ИИ-Ассистент">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-8rem)] flex gap-4">
        {/* Main chat */}
        <div className="flex-1 apple-card flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">ИИ-Ассистент CRM</h3>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${contextLoaded ? "bg-success" : "bg-warning animate-pulse"}`} />
                  <p className="text-[10px] text-muted-foreground">
                    {contextLoaded ? "Подключён к данным CRM" : "Загрузка данных..."}
                  </p>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={() => setMessages([])} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
                Очистить
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">Чем могу помочь?</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Я знаю всё о вашей CRM — заказы, задачи, финансы, склад и команду. Задайте любой вопрос!
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 max-w-lg w-full">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs text-left px-3 py-2.5 rounded-xl bg-secondary/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary/50 text-foreground rounded-bl-md"
                }`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0 [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_pre]:text-xs">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : m.content}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-secondary/50 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-5 pb-4 pt-2 border-t border-border/30">
            <div className="flex items-center gap-2 bg-secondary/40 rounded-xl px-4 py-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Задайте вопрос по CRM..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={loading}
              />
              <button onClick={() => send()} disabled={loading || !input.trim()} className="p-2 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-30 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar context panel */}
        <div className="w-64 hidden xl:flex flex-col gap-3">
          <div className="apple-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-semibold text-foreground">Контекст CRM</h4>
            </div>
            {contextLoaded ? (
              <div className="space-y-2">
                {stats.map(s => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-semibold text-foreground">{s.value}</span>
                  </div>
                ))}
                {context?.finance && (
                  <>
                    <div className="border-t border-border/30 my-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Доход</span>
                      <span className="font-semibold text-success">₽{context.finance.totalIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Расход</span>
                      <span className="font-semibold text-destructive">₽{context.finance.totalExpense.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Прибыль</span>
                      <span className={`font-semibold ${context.finance.profit >= 0 ? "text-success" : "text-destructive"}`}>₽{context.finance.profit.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Загрузка...
              </div>
            )}
          </div>

          <div className="apple-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">Быстрые вопросы</h4>
            <div className="space-y-1.5">
              {QUICK_QUESTIONS.slice(0, 4).map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="w-full text-left text-[11px] px-2.5 py-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </CRMLayout>
  );
}
