import { useState, useCallback, useEffect, useRef } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { useCRM, businessTypes } from "@/contexts/CRMContext";
import { Check, UserPlus, Shield, Loader2, Crown, User, BarChart3, KeyRound } from "lucide-react";
import { CreateEmployeeDialog } from "@/components/CreateEmployeeDialog";
import { EmployeeKPICard } from "@/components/EmployeeKPICard";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";



const appRoleLabels: Record<string, { label: string; color: string }> = {
  admin: { label: "Администратор", color: "bg-primary/15 text-primary" },
  manager: { label: "Менеджер", color: "bg-green-500/15 text-green-600" },
  observer: { label: "Наблюдатель", color: "bg-amber-500/15 text-amber-600" },
};

// --- Role Management Section ---
function RoleManagement({ currentUserId, canDelegate }: { currentUserId: string; canDelegate: boolean }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<{ id: string; full_name: string; role: string; customTitle: string; isDelegate: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [kpiUserId, setKpiUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: delegates }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role"),
      supabase.from("user_roles").select("user_id, role"),
      canDelegate ? supabase.from("role_management_delegates").select("user_id") : Promise.resolve({ data: [] as { user_id: string }[] }),
    ]);
    if (pErr) { toast({ title: "Ошибка", description: pErr.message, variant: "destructive" }); setLoading(false); return; }
    if (rErr) { toast({ title: "Ошибка", description: rErr.message, variant: "destructive" }); setLoading(false); return; }

    const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
    const delegateSet = new Set((delegates || []).map(d => d.user_id));
    setUsers((profiles || []).map(p => ({
      id: p.id,
      full_name: p.full_name || "Без имени",
      role: roleMap.get(p.id) || "manager",
      customTitle: p.role || "",
      isDelegate: delegateSet.has(p.id),
    })));
    setLoading(false);
  }, [toast, canDelegate]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleChangeRole = async (userId: string, newRole: string) => {
    setUpdating(userId);
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as "admin" | "manager" | "observer" });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); setUpdating(null); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    toast({ title: "Роль обновлена", description: `${appRoleLabels[newRole]?.label || newRole}` });
    setUpdating(null);
  };

  const handleSaveTitle = async (userId: string) => {
    const trimmed = titleDraft.trim().slice(0, 100);
    const { error } = await supabase.from("profiles").update({ role: trimmed }).eq("id", userId);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, customTitle: trimmed } : u));
    setEditingTitle(null);
    toast({ title: "Должность обновлена" });
  };

  const handleToggleDelegate = async (userId: string, currentlyDelegate: boolean) => {
    if (currentlyDelegate) {
      const { error } = await supabase.from("role_management_delegates").delete().eq("user_id", userId);
      if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("role_management_delegates").insert({ user_id: userId, granted_by: currentUserId });
      if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isDelegate: !currentlyDelegate } : u));
    toast({ title: currentlyDelegate ? "Доступ отозван" : "Доступ делегирован", description: currentlyDelegate ? "Пользователь больше не может управлять ролями" : "Пользователь получил доступ к управлению ролями" });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {users.filter(u => u.id !== currentUserId).map(u => {
        const rl = appRoleLabels[u.role] || appRoleLabels.manager;
        const isEditingThis = editingTitle === u.id;
        return (
          <div key={u.id} className="flex flex-col gap-2 p-3 rounded-xl border border-border/30 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground text-xs font-bold" style={{ background: "var(--gradient-blue)" }}>
                {u.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${rl.color}`}>{rl.label}</span>
                  {u.customTitle && <span className="text-[10px] text-muted-foreground">· {u.customTitle}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setKpiUserId(u.id)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1"
                  title="KPI сотрудника"
                >
                  <BarChart3 className="w-3 h-3" />
                  KPI
                </button>
                {(["admin", "manager", "observer"] as const).map(role => (
                  <button key={role} onClick={() => handleChangeRole(u.id, role)} disabled={updating === u.id}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${u.role === role ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>
                    {updating === u.id ? "..." : appRoleLabels[role].label.slice(0, 5)}
                  </button>
                ))}
                {canDelegate && u.role !== "admin" && (
                  <button
                    onClick={() => handleToggleDelegate(u.id, u.isDelegate)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${u.isDelegate ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                    title={u.isDelegate ? "Отозвать доступ к ролям" : "Делегировать управление ролями"}
                  >
                    <KeyRound className="w-3 h-3" />
                    {u.isDelegate ? "✓" : ""}
                  </button>
                )}
              </div>
            </div>
            {/* Custom title row */}
            <div className="flex items-center gap-2 pl-12">
              {isEditingThis ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    maxLength={100}
                    placeholder="Напр. Старший менеджер, Бухгалтер..."
                    className="flex-1 h-8 rounded-lg bg-card border border-border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    onKeyDown={e => e.key === "Enter" && handleSaveTitle(u.id)}
                    autoFocus
                  />
                  <button onClick={() => handleSaveTitle(u.id)} className="text-[11px] px-2.5 py-1 rounded-lg bg-primary text-primary-foreground">Сохранить</button>
                  <button onClick={() => setEditingTitle(null)} className="text-[11px] px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground">Отмена</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingTitle(u.id); setTitleDraft(u.customTitle); }}
                  className="text-[11px] text-primary hover:underline"
                >
                  {u.customTitle ? `✏️ ${u.customTitle}` : "+ Указать должность"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {users.filter(u => u.id !== currentUserId).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Нет пользователей</p>}
      
      {/* KPI Card */}
      {kpiUserId && (() => {
        const u = users.find(usr => usr.id === kpiUserId);
        if (!u) return null;
        return (
          <EmployeeKPICard
            userId={u.id}
            userName={u.full_name}
            userRole={appRoleLabels[u.role]?.label || u.role}
            customTitle={u.customTitle}
            open={true}
            onClose={() => setKpiUserId(null)}
          />
        );
      })()}
    </div>
  );
}



export default function SettingsPage() {
  const { businessType, setBusinessType, customBusinessLabels, customBusinessIcons, setCustomBusinessLabel, setCustomBusinessIcon, getBusinessLabel } = useCRM();
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [showCreateEmployee, setShowCreateEmployee] = useState(false);
  const [editingBizLabel, setEditingBizLabel] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [generatingIcon, setGeneratingIcon] = useState<string | null>(null);

  const handleBusinessChange = (id: string) => {
    setBusinessType(id);
    toast({ title: "Тип бизнеса изменён", description: `CRM адаптирована под «${getBusinessLabel(id)}». Все модули обновлены.` });
  };

  const generateIcon = async (id: string, name: string) => {
    setGeneratingIcon(id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-biz-icon", {
        body: { businessName: name },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setCustomBusinessIcon(id, data.imageUrl);
        toast({ title: "Иконка сгенерирована", description: `Для «${name}»` });
      }
    } catch (e: any) {
      toast({ title: "Ошибка генерации", description: e.message, variant: "destructive" });
    }
    setGeneratingIcon(null);
  };

  const handleSaveLabel = (id: string) => {
    const trimmed = editLabelValue.trim();
    if (trimmed) {
      setCustomBusinessLabel(id, trimmed);
      generateIcon(id, trimmed);
      toast({ title: "Название обновлено", description: `Теперь: «${trimmed}»` });
    }
    setEditingBizLabel(null);
  };

  const handleResetLabel = (id: string) => {
    setCustomBusinessLabel(id, "");
    setCustomBusinessIcon(id, "");
    toast({ title: "Название сброшено", description: "Восстановлено стандартное название" });
  };

  return (
    <CRMLayout title="Настройки">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
        {/* Current user info */}
        {user && (
          <div className="apple-card p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground text-sm font-bold" style={{ background: "var(--gradient-blue)" }}>
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{user.fullName || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${appRoleLabels[user.appRole]?.color || "bg-secondary text-muted-foreground"}`}>
                  {appRoleLabels[user.appRole]?.label || user.appRole}
                </span>
                {isAdmin && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-600 flex items-center gap-1">
                    <Crown className="w-3 h-3" />Руководитель
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Business type selector - admin only */}
        {isAdmin && (
        <div className="apple-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1">Тип бизнеса</h3>
          <p className="text-xs text-muted-foreground mb-5">Выберите тип — CRM полностью адаптируется: товары, услуги, терминология</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {businessTypes.map((bt) => {
              const active = businessType === bt.id;
              const displayLabel = getBusinessLabel(bt.id);
              const isEditing = editingBizLabel === bt.id;
              return (
                <div key={bt.id}>
                  <button onClick={() => handleBusinessChange(bt.id)}
                    className={`relative w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${active ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30 bg-card"}`}>
                    {active && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${active ? "text-primary-foreground" : "bg-secondary text-muted-foreground"}`} style={active ? { background: customBusinessIcons[bt.id] ? undefined : "var(--gradient-blue)" } : {}}>
                      {generatingIcon === bt.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : customBusinessIcons[bt.id] ? (
                        <img src={customBusinessIcons[bt.id]} alt={displayLabel} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <bt.icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pr-5">
                      <p className="text-sm font-medium text-foreground">{displayLabel}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{bt.description}</p>
                      {active && !isEditing && (
                        <div className="flex items-center gap-3 mt-2">
                          <span
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingBizLabel(bt.id); setEditLabelValue(displayLabel); }}
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline cursor-pointer"
                          >
                            ✏️ Переименовать
                          </span>
                          {customBusinessLabels[bt.id] && (
                            <span
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleResetLabel(bt.id); }}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive hover:underline cursor-pointer"
                            >
                              ↩ Сбросить
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  {isEditing && (
                    <div className="mt-2 flex gap-2">
                      <input
                        autoFocus
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabel(bt.id); if (e.key === "Escape") setEditingBizLabel(null); }}
                        className="flex-1 h-9 rounded-xl bg-secondary/70 border border-border/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Новое название"
                      />
                      <button onClick={() => handleSaveLabel(bt.id)} className="px-3 h-9 rounded-xl text-xs font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                        ОК
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Role management - admin or delegate */}
        {(isAdmin || user?.isRoleDelegate) && (
          <div className="apple-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-purple)" }}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Управление ролями</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isAdmin ? "Назначайте роли, создавайте аккаунты, делегируйте доступ" : "Делегированный доступ к управлению ролями"}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => setShowCreateEmployee(true)} className="gradient-btn-green flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Создать аккаунт</span>
                </button>
              )}
            </div>
            <RoleManagement currentUserId={user!.id} canDelegate={isAdmin} />
          </div>
        )}

        {isAdmin && <CreateEmployeeDialog open={showCreateEmployee} onClose={() => setShowCreateEmployee(false)} />}
      </motion.div>
    </CRMLayout>
  );
}
