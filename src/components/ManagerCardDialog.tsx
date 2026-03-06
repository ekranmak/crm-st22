import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TeamMember } from "@/contexts/CRMContext";
import { Phone, CheckCircle2, Target, TrendingUp, Clock, Star, CalendarDays, Mail, FolderKanban, Award } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

function generateStats(member: TeamMember) {
  const seed = member.id.charCodeAt(0) + member.name.length;
  const r = (min: number, max: number) => min + ((seed * 7 + min * 3) % (max - min + 1));
  const calls = r(120, 680);
  const tasks = r(50, 250);
  const tasksDone = Math.min(tasks, r(30, tasks));
  const deals = r(8, 65);
  const revenue = r(180, 1450) * 1000;
  const satisfaction = r(72, 99);
  const avgResponse = r(3, 28);
  const emailsSent = r(45, 320);
  const projects = r(3, 18);
  const hoursWorked = r(320, 1600);
  const monthly = [
    { m: "Окт", t: r(5, 20), c: r(10, 40) },
    { m: "Ноя", t: r(5, 22), c: r(10, 45) },
    { m: "Дек", t: r(4, 18), c: r(8, 35) },
    { m: "Янв", t: r(6, 24), c: r(12, 50) },
    { m: "Фев", t: r(7, 25), c: r(14, 48) },
    { m: "Мар", t: r(8, 28), c: r(15, 55) },
  ];
  const recentActions = [
    { text: `Завершил задачу «${["Отчёт", "Презентация", "Анализ", "Ревью"][r(0, 3)]}»`, time: `${r(1, 5)} ч назад`, icon: CheckCircle2 },
    { text: `Звонок клиенту (${r(1, 8)}:${r(10, 59).toString().padStart(2, "0")})`, time: `${r(2, 8)} ч назад`, icon: Phone },
    { text: `Отправил ${r(3, 15)} email-ов`, time: "Сегодня", icon: Mail },
    { text: `Обновил проект «${["Ребрендинг", "Запуск", "Интеграция", "Оптимизация"][r(0, 3)]}»`, time: "Вчера", icon: FolderKanban },
  ];
  return { calls, tasks, tasksDone, deals, revenue, satisfaction, avgResponse, emailsSent, projects, hoursWorked, monthly, recentActions };
}

interface Props {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerCardDialog({ member, open, onOpenChange }: Props) {
  const stats = useMemo(() => (member ? generateStats(member) : null), [member]);

  if (!member || !stats) return null;
  const Icon = member.icon;
  const taskPct = Math.round((stats.tasksDone / Math.max(stats.tasks, 1)) * 100);
  const convPct = Math.min(100, Math.round((stats.deals / Math.max(stats.calls, 1)) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-2xl">
        {/* Header */}
        <div className="p-6 pb-4" style={{ background: "var(--gradient-blue)" }}>
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg text-primary-foreground">{member.name}</DialogTitle>
                <p className="text-sm text-primary-foreground/70">{member.role}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${member.online ? "bg-green-300" : "bg-white/40"}`} />
                  <span className="text-xs text-primary-foreground/70">{member.online ? "Онлайн" : "Офлайн"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[
              { label: "Звонки", value: stats.calls, icon: Phone, color: "text-primary" },
              { label: "Задачи", value: `${stats.tasksDone}/${stats.tasks}`, icon: CheckCircle2, color: "text-success" },
              { label: "Сделки", value: stats.deals, icon: Target, color: "text-warning" },
              { label: "Выручка", value: `₽${(stats.revenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-success" },
              { label: "Ответ (мин)", value: stats.avgResponse, icon: Clock, color: "text-muted-foreground" },
              { label: "Рейтинг", value: `${stats.satisfaction}%`, icon: Star, color: "text-warning" },
              { label: "Проекты", value: stats.projects, icon: FolderKanban, color: "text-primary" },
              { label: "Часы", value: stats.hoursWorked, icon: CalendarDays, color: "text-muted-foreground" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                <kpi.icon className={`w-3.5 h-3.5 mx-auto mb-1 ${kpi.color}`} />
                <p className="text-sm font-bold text-foreground">{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Performance bars */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Эффективность за весь период</h4>
            {[
              { label: "Выполнение задач", pct: taskPct, gradient: "var(--gradient-green)" },
              { label: "Удовлетворённость клиентов", pct: stats.satisfaction, gradient: "var(--gradient-blue)" },
              { label: "Конверсия сделок", pct: convPct, gradient: "var(--gradient-purple)" },
              { label: "Email-активность", pct: Math.min(100, Math.round((stats.emailsSent / 300) * 100)), gradient: "var(--gradient-orange)" },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">{bar.label}</span>
                  <span className="font-medium text-foreground">{bar.pct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: bar.gradient }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Monthly chart */}
          <div>
            <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Активность по месяцам</h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={stats.monthly}>
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(220,15%,92%)", borderRadius: "10px", fontSize: "11px" }} />
                <Bar dataKey="t" name="Задачи" fill="hsl(215, 80%, 55%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="c" name="Звонки" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent actions */}
          <div>
            <h4 className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Последние действия</h4>
            <div className="space-y-2">
              {stats.recentActions.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30">
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <a.icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="flex gap-2 flex-wrap">
            {[
              stats.deals > 30 && "🏆 Топ-продавец",
              stats.satisfaction > 90 && "⭐ Высший рейтинг",
              taskPct > 85 && "✅ Надёжный исполнитель",
              stats.calls > 400 && "📞 Коммуникатор",
              stats.hoursWorked > 1200 && "⏰ Марафонец",
            ].filter(Boolean).map((badge) => (
              <span key={badge as string} className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
