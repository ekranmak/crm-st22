import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useCRM, businessTypes } from "@/contexts/CRMContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  CalendarDays, Package, FolderKanban, CreditCard, FileText,
  Phone, Mail, BarChart3, Settings, LayoutDashboard, GitBranch,
  Wallet, ShoppingCart, ChevronDown, Globe, User, Bot,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "manager" | "observer";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: AppRole[]; // which roles can see this item
}

const navItems: NavItem[] = [
  { title: "Дашборд", url: "/", icon: LayoutDashboard, roles: ["admin", "manager", "observer"] },
  { title: "ИИ-Ассистент", url: "/ai", icon: Bot, roles: ["admin", "manager", "observer"] },
  { title: "Онлайн-запись", url: "/booking", icon: CalendarDays, roles: ["admin", "manager"] },
  { title: "Склад", url: "/warehouse", icon: Package, roles: ["admin", "manager"] },
  { title: "Заказы", url: "/orders", icon: ShoppingCart, roles: ["admin", "manager"] },
  { title: "Проекты", url: "/projects", icon: FolderKanban, roles: ["admin", "manager"] },
  { title: "Финансы", url: "/finance", icon: Wallet, roles: ["admin"] },
  { title: "Подписки", url: "/subscriptions", icon: CreditCard, roles: ["admin", "manager"] },
  { title: "Документы", url: "/documents", icon: FileText, roles: ["admin", "manager"] },
  { title: "Телефония", url: "/telephony", icon: Phone, roles: ["admin", "manager"] },
  { title: "Email-маркетинг", url: "/email", icon: Mail, roles: ["admin"] },
  { title: "Потоки данных", url: "/data-flows", icon: GitBranch, roles: ["admin"] },
  { title: "Аналитика", url: "/analytics", icon: BarChart3, roles: ["admin", "observer"] },
  { title: "Сайты", url: "/sites", icon: Globe, roles: ["admin"] },
  
];

export function CRMSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { businessType, getBusinessLabel, customBusinessIcons } = useCRM();
  const { user } = useAuth();
  const userRole = user?.appRole || "manager";
  const bt = businessTypes.find((b) => b.id === businessType);
  const BtIcon = bt?.icon;
  const customIcon = customBusinessIcons[businessType];
  const [teamOpen, setTeamOpen] = useState(false);
  const [realMembers, setRealMembers] = useState<{ id: string; full_name: string; role: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role");
      if (data) setRealMembers(data);
    };
    load();
  }, [user]);

  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={{ boxShadow: "var(--shadow-sm)" }}>
      <SidebarHeader className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden" style={{ background: customIcon ? undefined : "var(--gradient-blue)" }}>
              {customIcon ? <img src={customIcon} alt="" className="w-8 h-8 rounded-xl object-cover" /> : BtIcon ? <BtIcon size={16} /> : "C"}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">CRM Pro</h2>
              <p className="text-[10px] text-muted-foreground">{getBusinessLabel(businessType)}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden" style={{ background: customIcon ? undefined : "var(--gradient-blue)" }}>
              {customIcon ? <img src={customIcon} alt="" className="w-8 h-8 rounded-xl object-cover" /> : BtIcon ? <BtIcon size={16} /> : "C"}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {!collapsed && realMembers.length > 0 && (
          <SidebarGroup>
            <button
              onClick={() => setTeamOpen(!teamOpen)}
              className="flex items-center justify-between w-full px-4 py-1 group"
            >
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold pointer-events-none p-0 h-auto">
                Команда ({realMembers.length})
              </SidebarGroupLabel>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${teamOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              className="overflow-hidden transition-all duration-200 ease-in-out"
              style={{ maxHeight: teamOpen ? `${realMembers.length * 44 + 8}px` : "0px", opacity: teamOpen ? 1 : 0 }}
            >
              <SidebarGroupContent>
                <div className="space-y-1 px-2 pt-1">
                  {realMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg table-row-hover cursor-default">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{member.full_name || "Без имени"}</p>
                        <p className="text-[10px] text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SidebarGroupContent>
            </div>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
            {!collapsed ? "Модули" : ""}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="rounded-xl transition-all duration-200 hover:bg-secondary"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className="rounded-xl hover:bg-secondary" activeClassName="bg-primary/10 text-primary">
                <Settings className="w-4 h-4" />
                {!collapsed && <span className="text-sm">Настройки</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && user && (
          <div className="mt-2 px-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              userRole === "admin" ? "bg-primary/15 text-primary" :
              userRole === "manager" ? "bg-success/15 text-success" :
              "bg-warning/15 text-warning"
            }`}>
              {userRole === "admin" ? "Администратор" : userRole === "manager" ? "Менеджер" : "Наблюдатель"}
            </span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
