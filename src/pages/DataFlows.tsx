import { CRMLayout } from "@/components/CRMLayout";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Crown, Users, FolderKanban, Package, Phone, Mail,
  CalendarDays, CreditCard, FileText, BarChart3, ArrowRight,
  ShoppingCart, Wallet, Globe, GitBranch, Activity, TrendingUp,
  Loader2,
} from "lucide-react";

interface ModuleStats {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  gradient: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
}

interface FlowNode {
  id: string;
  label: string;
  icon: React.ElementType;
  x: number;
  y: number;
  gradient: string;
  group: "team" | "module" | "analytics";
  count?: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  animated?: boolean;
}

const NODE_W = 150;
const NODE_H = 52;

function getEdgePath(from: FlowNode, to: FlowNode): string {
  const x1 = from.x + NODE_W;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_H / 2;
  const cx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
}

export default function DataFlows() {
  const { user } = useAuth();
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [
        { data: profiles },
        { count: bookingsCount },
        { count: ordersCount },
        { count: warehouseCount },
        { count: docsCount },
        { count: subsCount },
        { count: callsCount },
        { count: campaignsCount },
        { count: sitesCount },
        { data: finance },
        { count: tasksCount },
        { count: messagesCount },
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, role"),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("warehouse_products").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("call_logs").select("id", { count: "exact", head: true }),
        supabase.from("email_campaigns").select("id", { count: "exact", head: true }),
        supabase.from("sites").select("id", { count: "exact", head: true }),
        supabase.from("finance_entries").select("amount, type"),
        supabase.from("assigned_tasks").select("id", { count: "exact", head: true }),
        supabase.from("internal_messages").select("id", { count: "exact", head: true }),
      ]);

      if (profiles) setTeam(profiles);

      const totalIncome = finance?.filter(f => f.type === "income").reduce((s, f) => s + Number(f.amount), 0) || 0;
      const totalExpense = finance?.filter(f => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0) || 0;

      setModuleCounts({
        booking: bookingsCount || 0,
        orders: ordersCount || 0,
        warehouse: warehouseCount || 0,
        docs: docsCount || 0,
        subs: subsCount || 0,
        calls: callsCount || 0,
        campaigns: campaignsCount || 0,
        sites: sitesCount || 0,
        income: totalIncome,
        expense: totalExpense,
        tasks: tasksCount || 0,
        messages: messagesCount || 0,
      });
      setLoading(false);
    };
    load();
  }, [user]);

  const nodes = useMemo<FlowNode[]>(() => {
    const teamNodes: FlowNode[] = team.slice(0, 6).map((m, i) => ({
      id: `t-${m.id}`,
      label: m.full_name || "Без имени",
      icon: i === 0 ? Crown : Users,
      x: 60,
      y: 60 + i * 80,
      gradient: ["var(--gradient-orange)", "var(--gradient-blue)", "var(--gradient-purple)", "var(--gradient-teal)", "var(--gradient-green)", "var(--gradient-pink)"][i % 6],
      group: "team" as const,
    }));

    const moduleNodes: FlowNode[] = [
      { id: "booking", label: "Онлайн-запись", icon: CalendarDays, gradient: "var(--gradient-blue)", count: moduleCounts.booking },
      { id: "orders", label: "Заказы", icon: ShoppingCart, gradient: "var(--gradient-orange)", count: moduleCounts.orders },
      { id: "warehouse", label: "Склад", icon: Package, gradient: "var(--gradient-teal)", count: moduleCounts.warehouse },
      { id: "subs", label: "Подписки", icon: CreditCard, gradient: "var(--gradient-purple)", count: moduleCounts.subs },
      { id: "docs", label: "Документы", icon: FileText, gradient: "var(--gradient-green)", count: moduleCounts.docs },
      { id: "calls", label: "Телефония", icon: Phone, gradient: "var(--gradient-pink)", count: moduleCounts.calls },
    ].map((m, i) => ({
      ...m,
      x: 380,
      y: 60 + i * 80,
      group: "module" as const,
    }));

    const analyticsNodes: FlowNode[] = [
      { id: "finance", label: "Финансы", icon: Wallet, gradient: "var(--gradient-green)", count: moduleCounts.income },
      { id: "tasks", label: "Задачи", icon: FolderKanban, gradient: "var(--gradient-blue)", count: moduleCounts.tasks },
      { id: "campaigns", label: "Рассылки", icon: Mail, gradient: "var(--gradient-purple)", count: moduleCounts.campaigns },
      { id: "messages", label: "Сообщения", icon: Activity, gradient: "var(--gradient-teal)", count: moduleCounts.messages },
    ].map((m, i) => ({
      ...m,
      x: 700,
      y: 100 + i * 100,
      group: "analytics" as const,
    }));

    return [...teamNodes, ...moduleNodes, ...analyticsNodes];
  }, [team, moduleCounts]);

  const edges = useMemo<FlowEdge[]>(() => {
    const result: FlowEdge[] = [];
    const teamIds = team.slice(0, 6).map(m => `t-${m.id}`);
    const modules = ["booking", "orders", "warehouse", "subs", "docs", "calls"];
    const analytics = ["finance", "tasks", "campaigns", "messages"];

    // Each team member connects to 1-2 modules
    teamIds.forEach((tid, i) => {
      result.push({ from: tid, to: modules[i % modules.length], animated: i < 3 });
      if (i < modules.length - 1) {
        result.push({ from: tid, to: modules[(i + 1) % modules.length] });
      }
    });

    // Modules connect to analytics
    result.push({ from: "booking", to: "finance", animated: true });
    result.push({ from: "orders", to: "finance", animated: true });
    result.push({ from: "warehouse", to: "tasks" });
    result.push({ from: "subs", to: "finance" });
    result.push({ from: "docs", to: "campaigns" });
    result.push({ from: "calls", to: "messages", animated: true });

    return result;
  }, [team]);

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));
  const activeEdges = activeNode ? edges.filter(e => e.from === activeNode || e.to === activeNode) : edges;
  const dimmedEdges = activeNode ? edges.filter(e => e.from !== activeNode && e.to !== activeNode) : [];

  const svgHeight = Math.max(nodes.reduce((max, n) => Math.max(max, n.y + NODE_H + 40), 0), 500);

  if (loading) {
    return (
      <CRMLayout title="Потоки данных">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout title="Потоки данных">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Сотрудников", value: team.length, icon: Users, gradient: "var(--gradient-blue)" },
            { label: "Записей", value: moduleCounts.booking, icon: CalendarDays, gradient: "var(--gradient-teal)" },
            { label: "Заказов", value: moduleCounts.orders, icon: ShoppingCart, gradient: "var(--gradient-orange)" },
            { label: "Задач", value: moduleCounts.tasks, icon: FolderKanban, gradient: "var(--gradient-purple)" },
          ].map(s => (
            <div key={s.label} className="apple-card p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground shrink-0" style={{ background: s.gradient }}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: "Команда", color: "hsl(215, 80%, 55%)" },
            { label: "CRM Модули", color: "hsl(265, 60%, 65%)" },
            { label: "Аналитика & Отчёты", color: "hsl(145, 60%, 45%)" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
            <ArrowRight className="w-3 h-3" />
            Нажмите на узел для фильтрации
          </div>
        </div>

        {/* Canvas */}
        <div className="apple-card overflow-x-auto">
          <svg
            viewBox={`0 0 900 ${svgHeight}`}
            className="w-full min-w-[700px]"
            style={{ height: `clamp(400px, 60vh, ${svgHeight}px)` }}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(215, 80%, 55%)" fillOpacity="0.6" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(215, 80%, 55%)" />
              </marker>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Column headers */}
            <text x={60 + NODE_W / 2} y={35} textAnchor="middle" className="text-[11px] font-semibold" fill="hsl(220, 10%, 50%)" style={{ fontFamily: "Inter, sans-serif" }}>
              КОМАНДА ({team.length})
            </text>
            <text x={380 + NODE_W / 2} y={35} textAnchor="middle" className="text-[11px] font-semibold" fill="hsl(220, 10%, 50%)" style={{ fontFamily: "Inter, sans-serif" }}>
              CRM МОДУЛИ
            </text>
            <text x={700 + NODE_W / 2} y={75} textAnchor="middle" className="text-[11px] font-semibold" fill="hsl(220, 10%, 50%)" style={{ fontFamily: "Inter, sans-serif" }}>
              АНАЛИТИКА
            </text>

            {/* Dimmed edges */}
            {dimmedEdges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              return (
                <path key={`dim-${i}`} d={getEdgePath(from, to)} fill="none" stroke="hsl(220, 15%, 88%)" strokeWidth={1} strokeDasharray="4 4" />
              );
            })}

            {/* Active edges */}
            {activeEdges.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              const path = getEdgePath(from, to);
              const isHovered = hoveredEdge === i;
              return (
                <g key={`edge-${i}`} onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}>
                  <path d={path} fill="none" stroke="transparent" strokeWidth={16} className="cursor-pointer" />
                  <path
                    d={path} fill="none"
                    stroke="hsl(215, 80%, 55%)"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    strokeOpacity={activeNode ? 0.9 : 0.4}
                    markerEnd={isHovered ? "url(#arrow-active)" : "url(#arrow)"}
                    className="transition-all duration-300"
                    filter={isHovered ? "url(#glow)" : undefined}
                  />
                  {edge.animated && (
                    <circle r={3} fill="hsl(215, 80%, 55%)" opacity={0.8}>
                      <animateMotion dur="3s" repeatCount="indefinite" path={path} />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const isActive = activeNode === node.id;
              const isDimmed = activeNode && !isActive && !activeEdges.some(e => e.from === node.id || e.to === node.id);
              const Icon = node.icon;
              return (
                <g
                  key={node.id}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                  className="cursor-pointer"
                  opacity={isDimmed ? 0.3 : 1}
                  style={{ transition: "opacity 0.3s" }}
                >
                  <rect x={node.x} y={node.y} width={NODE_W} height={NODE_H} rx={14}
                    fill="white" stroke={isActive ? "hsl(215, 80%, 55%)" : "hsl(220, 15%, 92%)"}
                    strokeWidth={isActive ? 2 : 1} filter={isActive ? "url(#glow)" : undefined} />
                  <foreignObject x={node.x + 10} y={node.y + 10} width={32} height={32}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: node.gradient }}>
                      <Icon size={14} color="white" />
                    </div>
                  </foreignObject>
                  <text x={node.x + 50} y={node.y + (node.count !== undefined ? NODE_H / 2 - 4 : NODE_H / 2 + 1)}
                    dominantBaseline="middle" fill="hsl(220, 20%, 10%)"
                    style={{ fontSize: "10px", fontFamily: "Inter, sans-serif", fontWeight: isActive ? 600 : 500 }}>
                    {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                  </text>
                  {node.count !== undefined && (
                    <text x={node.x + 50} y={node.y + NODE_H / 2 + 10}
                      dominantBaseline="middle" fill="hsl(220, 10%, 55%)"
                      style={{ fontSize: "9px", fontFamily: "Inter, sans-serif" }}>
                      {node.count.toLocaleString("ru-RU")}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Flow descriptions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Команда → Модули", desc: `${team.length} сотрудников работают с ${Object.values(moduleCounts).filter(v => v > 0).length} активными модулями CRM`, gradient: "var(--gradient-blue)" },
            { title: "Модули → Аналитика", desc: `Данные из модулей агрегируются: ${moduleCounts.booking} записей, ${moduleCounts.orders} заказов, ${moduleCounts.warehouse} товаров`, gradient: "var(--gradient-purple)" },
            { title: "Финансовый поток", desc: `Доход: ₽${(moduleCounts.income || 0).toLocaleString("ru-RU")} | Расход: ₽${(moduleCounts.expense || 0).toLocaleString("ru-RU")}`, gradient: "var(--gradient-green)" },
          ].map(flow => (
            <div key={flow.title} className="apple-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: flow.gradient.includes("blue") ? "hsl(215,80%,55%)" : flow.gradient.includes("purple") ? "hsl(265,60%,65%)" : "hsl(145,60%,45%)" }} />
                <h4 className="text-xs font-semibold text-foreground">{flow.title}</h4>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{flow.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </CRMLayout>
  );
}
