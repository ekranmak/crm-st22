import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const roleOptions = [
  { value: "manager", label: "Менеджер" },
  { value: "observer", label: "Наблюдатель" },
];

export function CreateEmployeeDialog({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("manager");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      toast({ title: "Ошибка", description: "Заполните все поля", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Ошибка", description: "Вы не авторизованы", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-employee", {
      body: { email, password, full_name: fullName, app_role: role },
    });

    if (error || data?.error) {
      toast({ title: "Ошибка", description: data?.error || error?.message || "Не удалось создать сотрудника", variant: "destructive" });
    } else {
      toast({ title: "Сотрудник создан", description: `${fullName} (${email}) может теперь войти в систему` });
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("manager");
      onCreated?.();
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="apple-card p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-green)" }}>
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Создать сотрудника</h3>
                  <p className="text-[10px] text-muted-foreground">Логин и пароль для входа в CRM</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Имя сотрудника"
                className="w-full h-10 rounded-xl bg-secondary/70 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email сотрудника"
                required
                className="w-full h-10 rounded-xl bg-secondary/70 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль (мин. 6 символов)"
                  required
                  minLength={6}
                  className="w-full h-10 rounded-xl bg-secondary/70 border border-border/50 px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 rounded-xl bg-secondary/70 border border-border/50 px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-xl text-sm font-medium text-primary-foreground transition-all disabled:opacity-50"
                style={{ background: "var(--gradient-green)" }}
              >
                {submitting ? "Создаём..." : "Создать аккаунт сотрудника"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
