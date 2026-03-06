import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CRMSidebar } from "@/components/CRMSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalChat } from "@/components/GlobalChat";
import { GlobalSearch } from "@/components/GlobalSearch";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface CRMLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function CRMLayout({ children, title }: CRMLayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <CRMSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border/50 px-4 bg-card/80 backdrop-blur-xl sticky top-0 z-10" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
              <NotificationBell />
              {user && (
                <>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium hidden sm:inline ${
                    user.appRole === "admin" ? "bg-primary/15 text-primary" :
                    user.appRole === "manager" ? "bg-success/15 text-success" :
                    "bg-warning/15 text-warning"
                  }`}>
                    {user.appRole === "admin" ? "Админ" : user.appRole === "manager" ? "Менеджер" : "Наблюдатель"}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">{user.fullName || user.email}</span>
                </>
              )}
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground text-xs font-bold" style={{ background: "var(--gradient-blue)" }}>
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
              </div>
              <button
                onClick={signOut}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>
          {user?.appRole === "observer" && (
            <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 text-center">
              <span className="text-xs text-warning font-medium">👁 Режим наблюдателя — только просмотр, редактирование недоступно</span>
            </div>
          )}
          <main className={`flex-1 p-4 md:p-6 overflow-auto ${user?.appRole === "observer" ? "pointer-events-none opacity-90 select-none" : ""}`}>
            {children}
          </main>
          <GlobalChat />
        </div>
      </div>
    </SidebarProvider>
  );
}
