import { useState } from "react";
import { motion } from "framer-motion";
import { TeamMember, AccessLevel, ACCESS_LEVEL_LABELS, ACCESS_LEVEL_DEFAULTS } from "@/contexts/CRMContext";
import {
  Phone, CheckCircle2, Target, TrendingUp, Clock, Star,
  FileText, EyeOff, Award, Flame, Calendar, MessageSquare,
  Zap, BarChart3, ArrowUpRight, ArrowDownRight, Coffee,
  Briefcase, Heart, Shield, Edit3, Save, X, Mail,
  Lock, Unlock, ShieldOff,
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface MemberStats {
  calls: number;
  tasks: number;
  tasksDone: number;
  deals: number;
  revenue: number;
  satisfaction: number;
  avgResponse: number;
  weekly: { day: string; tasks: number; calls: number }[];
}

const ALL_BLOCKS = [
  { key: "kpi", label: "KPI метрики" },
  { key: "achievements", label: "Достижения" },
  { key: "performance", label: "Эффективность" },
  { key: "revenue", label: "Динамика выручки" },
  { key: "timeline", label: "Активность сегодня" },
  { key: "weekly", label: "Нагрузка за неделю" },
];

function generateExtendedStats(member: TeamMember, base: MemberStats) {
  const seed = member.id.charCodeAt(0) + member.name.length;
  const r = (min: number, max: number) => min + ((seed * 13 + min * 7) % (max - min + 1));

  const streak = r(3, 21);
  const emailsSent = r(15, 120);
  const meetingsHeld = r(2, 14);
  const projectsActive = r(1, 5);
  const projectsDone = r(3, 18);
  const mentored = r(0, 4);
  const lateTasksPct = r(0, 15);

  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => ({
    month: ["Окт", "Ноя", "Дек", "Янв", "Фев", "Мар"][i],
    value: r(40, 120) * 1000 + i * r(5, 20) * 1000,
  }));

  const achievements: { label: string; icon: typeof Award; earned: boolean }[] = [
    { label: "Лучший продавец", icon: Award, earned: seed % 3 === 0 },
    { label: "Без опозданий", icon: Clock, earned: seed % 2 === 0 },
    { label: "Командный дух", icon: Heart, earned: seed % 4 !== 2 },
    { label: "Огонь продаж", icon: Flame, earned: base.deals > 8 },
    { label: "Скорость молнии", icon: Zap, earned: base.avgResponse < 15 },
    { label: "Наставник", icon: Shield, earned: mentored > 1 },
  ];

  const recentActions = [
    { time: "09:15", action: "Закрыл сделку", detail: `₽${r(50, 300)}K`, type: "success" as const },
    { time: "10:30", action: "Звонок клиенту", detail: `${r(3, 18)} мин`, type: "neutral" as const },
    { time: "11:45", action: "Отправил КП", detail: `${r(1, 5)} документов`, type: "neutral" as const },
    { time: "13:20", action: "Встреча с командой", detail: `${r(20, 60)} мин`, type: "neutral" as const },
    { time: "14:00", action: base.tasksDone > base.tasks / 2 ? "Завершил задачу" : "Просрочил дедлайн", detail: member.role, type: base.tasksDone > base.tasks / 2 ? "success" as const : "warning" as const },
    { time: "16:30", action: "Обновил CRM", detail: `${r(2, 8)} записей`, type: "neutral" as const },
  ];

  return { streak, emailsSent, meetingsHeld, projectsActive, projectsDone, mentored, lateTasksPct, monthlyRevenue, achievements, recentActions };
}

interface Props {
  member: TeamMember;
  stats: MemberStats;
  stealthMode: boolean;
  onExportPDF: (member: TeamMember) => void;
  onUpdateMember?: (id: string, updates: Partial<Omit<TeamMember, 'id' | 'icon'>>) => void;
}

export function EmployeeDetailCard({ member, stats, stealthMode, onExportPDF, onUpdateMember }: Props) {
  const { toast } = useToast();
  const ext = generateExtendedStats(member, stats);
  const taskPct = Math.round((stats.tasksDone / Math.max(stats.tasks, 1)) * 100);
  const convPct = Math.min(100, Math.round((stats.deals / Math.max(stats.calls, 1)) * 100));
  const revTrend = ext.monthlyRevenue[5].value > ext.monthlyRevenue[4].value;

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editRole, setEditRole] = useState(member.role);
  const [editEmail, setEditEmail] = useState(member.email || "");
  const [editPhone, setEditPhone] = useState(member.phone || "");
  const [editAccessLevel, setEditAccessLevel] = useState<AccessLevel>(member.accessLevel || "manager");
  const [showRestrictions, setShowRestrictions] = useState(false);
  const [localRestrictions, setLocalRestrictions] = useState<string[]>(member.restrictedBlocks || []);

  const restricted = member.restrictedBlocks || [];
  const isVisible = (block: string) => !restricted.includes(block);

  const handleSave = () => {
    if (!editName.trim()) {
      toast({ title: "Ошибка", description: "Имя не может быть пустым", variant: "destructive" });
      return;
    }
    onUpdateMember?.(member.id, {
      name: editName.trim(),
      role: editRole,
      email: editEmail.trim(),
      phone: editPhone.trim(),
      accessLevel: editAccessLevel,
      restrictedBlocks: ACCESS_LEVEL_DEFAULTS[editAccessLevel],
    });
    setEditing(false);
    toast({ title: "Данные обновлены", description: editName.trim() });
  };

  const toggleRestriction = (block: string) => {
    const updated = localRestrictions.includes(block)
      ? localRestrictions.filter(b => b !== block)
      : [...localRestrictions, block];
    setLocalRestrictions(updated);
  };

  const saveRestrictions = () => {
    onUpdateMember?.(member.id, { restrictedBlocks: localRestrictions });
    setShowRestrictions(false);
    toast({ title: "Доступ обновлён", description: `Настройки видимости для ${member.name} сохранены` });
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="border-t border-border/30 bg-gradient-to-b from-secondary/30 to-transparent">
        {/* Header strip */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground text-lg font-bold" style={{ background: "var(--gradient-blue)" }}>
                {member.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${member.online ? "bg-success" : "bg-muted-foreground/40"}`} style={member.online ? { background: "hsl(var(--success))" } : {}} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{member.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                <span>{member.role}</span>
                {member.accessLevel && (
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                    member.accessLevel === "admin" ? "bg-primary/10 text-primary" :
                    member.accessLevel === "manager" ? "bg-success/10 text-success" :
                    "bg-muted text-muted-foreground"
                  }`}>{ACCESS_LEVEL_LABELS[member.accessLevel]}</span>
                )}
                {member.email && <span className="flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{member.email}</span>}
              </div>
            </div>
            {stealthMode && (
              <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ml-2">
                <EyeOff className="w-2.5 h-2.5" />Скрыто
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {onUpdateMember && !editing && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRestrictions(!showRestrictions); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  title="Управление доступом"
                >
                  <ShieldOff className="w-3.5 h-3.5" />Доступ
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />Изменить
                </button>
              </>
            )}
            {editing && (
              <>
                <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="gradient-btn-green flex items-center gap-1.5 text-xs">
                  <Save className="w-3.5 h-3.5" />Сохранить
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditing(false); setEditName(member.name); setEditRole(member.role); setEditEmail(member.email || ""); setEditPhone(member.phone || ""); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />Отмена
                </button>
              </>
            )}
            {!editing && (
              <button
                onClick={(e) => { e.stopPropagation(); onExportPDF(member); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />PDF
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Edit form */}
          {editing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3" />Редактирование сотрудника
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Имя</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Роль</label>
                    <input value={editRole} onChange={(e) => setEditRole(e.target.value)} maxLength={50} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1"><Mail className="w-2.5 h-2.5" />Email</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" maxLength={255} placeholder="email@company.ru" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1"><Phone className="w-2.5 h-2.5" />Телефон</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" maxLength={20} placeholder="+7 900 000-00-00" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-medium flex items-center gap-1"><Shield className="w-2.5 h-2.5" />Уровень доступа</label>
                  <div className="flex gap-2 mt-1.5">
                    {(["admin", "manager", "observer"] as AccessLevel[]).map((level) => (
                      <button key={level} onClick={() => setEditAccessLevel(level)}
                        className={`text-xs px-3 py-2 rounded-xl transition-colors flex-1 ${editAccessLevel === level ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                      >
                        {ACCESS_LEVEL_LABELS[level]}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5">
                    {editAccessLevel === "admin" && "Полный доступ ко всем блокам и настройкам"}
                    {editAccessLevel === "manager" && "Скрыты: динамика выручки, эффективность"}
                    {editAccessLevel === "observer" && "Скрыты: KPI, выручка, эффективность, таймлайн"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Block restrictions panel — only visible to owner, NOT to the employee */}
          {showRestrictions && onUpdateMember && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 space-y-3">
                <h4 className="text-xs font-semibold text-warning uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldOff className="w-3 h-3" />Управление видимостью блоков
                </h4>
                <p className="text-[10px] text-muted-foreground">Выберите блоки, которые будут скрыты от сотрудника. Сотрудник не увидит что блоки ограничены.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_BLOCKS.map((block) => {
                    const isRestricted = localRestrictions.includes(block.key);
                    return (
                      <button
                        key={block.key}
                        onClick={() => toggleRestriction(block.key)}
                        className={`flex items-center gap-2 text-[11px] px-3 py-2.5 rounded-xl border transition-all ${
                          isRestricted
                            ? "border-destructive/30 bg-destructive/10 text-destructive"
                            : "border-border/50 bg-card text-foreground hover:border-border"
                        }`}
                      >
                        {isRestricted ? <Lock className="w-3 h-3 shrink-0" /> : <Unlock className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{block.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setShowRestrictions(false); setLocalRestrictions(member.restrictedBlocks || []); }} className="text-xs px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">Отмена</button>
                  <button onClick={saveRestrictions} className="gradient-btn text-xs">Сохранить доступ</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main KPIs */}
          {isVisible("kpi") && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[
                { label: "Звонки", value: stats.calls, icon: Phone, gradient: "var(--gradient-blue)" },
                { label: "Задачи", value: `${stats.tasksDone}/${stats.tasks}`, icon: CheckCircle2, gradient: "var(--gradient-green)" },
                { label: "Сделки", value: stats.deals, icon: Target, gradient: "var(--gradient-orange)" },
                { label: "Выручка", value: `₽${(stats.revenue / 1000).toFixed(0)}K`, icon: TrendingUp, gradient: "var(--gradient-green)" },
                { label: "Ответ", value: `${stats.avgResponse}м`, icon: Clock, gradient: "var(--gradient-purple)" },
                { label: "Рейтинг", value: `${stats.satisfaction}%`, icon: Star, gradient: "var(--gradient-orange)" },
                { label: "Письма", value: ext.emailsSent, icon: MessageSquare, gradient: "var(--gradient-teal)" },
                { label: "Встречи", value: ext.meetingsHeld, icon: Coffee, gradient: "var(--gradient-pink)" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl p-2.5 text-center bg-card border border-border/30 hover:border-border/60 transition-colors">
                  <div className="w-6 h-6 rounded-lg mx-auto mb-1.5 flex items-center justify-center text-primary-foreground" style={{ background: kpi.gradient }}>
                    <kpi.icon className="w-3 h-3" />
                  </div>
                  <p className="text-sm font-bold text-foreground tabular-nums">{kpi.value}</p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Achievements */}
          {isVisible("achievements") && (
            <div>
              <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-3 h-3" />Достижения
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {ext.achievements.map((a) => (
                  <span
                    key={a.label}
                    className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors ${
                      a.earned
                        ? "bg-warning/15 text-warning border border-warning/20"
                        : "bg-secondary/60 text-muted-foreground/50 border border-border/30"
                    }`}
                  >
                    <a.icon className="w-2.5 h-2.5" />
                    {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance bars */}
            {isVisible("performance") && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3 h-3" />Эффективность
                </h4>
                {[
                  { label: "Выполнение задач", pct: taskPct, gradient: "var(--gradient-green)" },
                  { label: "Удовлетворённость", pct: stats.satisfaction, gradient: "var(--gradient-blue)" },
                  { label: "Конверсия сделок", pct: convPct, gradient: "var(--gradient-purple)" },
                  { label: "Пунктуальность", pct: 100 - ext.lateTasksPct, gradient: "var(--gradient-teal)" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted-foreground">{bar.label}</span>
                      <span className="font-semibold text-foreground tabular-nums">{bar.pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${bar.pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: bar.gradient }}
                      />
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-secondary/40 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="w-3 h-3 text-warning" />
                      <span className="text-[9px] text-muted-foreground">Серия дней</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{ext.streak} <span className="text-[10px] font-normal text-muted-foreground">дн.</span></p>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Briefcase className="w-3 h-3 text-primary" />
                      <span className="text-[9px] text-muted-foreground">Проекты</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{ext.projectsActive} <span className="text-[10px] font-normal text-muted-foreground">актив.</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Right column */}
            <div className="space-y-4">
              {/* Revenue trend */}
              {isVisible("revenue") && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" />Динамика выручки
                    </h4>
                    <span className={`text-[10px] font-medium flex items-center gap-0.5 ${revTrend ? "text-success" : "text-destructive"}`}>
                      {revTrend ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {revTrend ? "Рост" : "Спад"}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={ext.monthlyRevenue}>
                      <defs>
                        <linearGradient id={`revGrad-${member.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(215, 80%, 55%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(215, 80%, 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "10px", fontSize: "10px" }} formatter={(v: number) => `₽${(v / 1000).toFixed(0)}K`} />
                      <Area type="monotone" dataKey="value" stroke="hsl(215, 80%, 55%)" fill={`url(#revGrad-${member.id})`} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Today's timeline */}
              {isVisible("timeline") && (
                <div>
                  <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />Активность сегодня
                  </h4>
                  <div className="space-y-0">
                    {ext.recentActions.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 py-1.5 group">
                        <span className="text-[9px] text-muted-foreground tabular-nums mt-0.5 w-8 shrink-0">{a.time}</span>
                        <div className="relative flex flex-col items-center shrink-0">
                          <div className={`w-2 h-2 rounded-full mt-1 ${
                            a.type === "success" ? "bg-success" : a.type === "warning" ? "bg-warning" : "bg-border"
                          }`} style={a.type === "success" ? { background: "hsl(var(--success))" } : a.type === "warning" ? { background: "hsl(var(--warning))" } : {}} />
                          {i < ext.recentActions.length - 1 && <div className="w-px h-full bg-border/50 absolute top-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-foreground font-medium">{a.action}</p>
                          <p className="text-[9px] text-muted-foreground">{a.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weekly activity chart */}
          {isVisible("weekly") && (
            <div>
              <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" />Нагрузка за неделю
              </h4>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={stats.weekly}>
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "10px", fontSize: "10px" }} />
                  <Bar dataKey="tasks" name="Задачи" fill="hsl(215, 80%, 55%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="calls" name="Звонки" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
