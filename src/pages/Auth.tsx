import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Eye, EyeOff, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      // Seed demo data via edge function
      await supabase.functions.invoke("seed-demo");
      // Sign in with demo credentials
      const { error } = await signIn("demo@test.com", "demo123456");
      if (error) {
        toast({ title: "Ошибка демо-входа", description: error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
    setDemoLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Ошибка входа", description: error, variant: "destructive" });
      }
    } else {
      if (!fullName.trim()) {
        toast({ title: "Ошибка", description: "Введите ваше имя", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: "Ошибка регистрации", description: error, variant: "destructive" });
      } else {
        toast({ title: "Успешно!", description: "Аккаунт руководителя создан. Входим..." });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="apple-card p-8">
          <div className="flex items-center justify-center mb-6">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground"
              style={{ background: "var(--gradient-blue)" }}
            >
              {isLogin ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
          </div>

          <h1 className="text-xl font-bold text-foreground text-center mb-1">
            {isLogin ? "Вход в CRM" : "Регистрация руководителя"}
          </h1>
          <p className="text-xs text-muted-foreground text-center mb-6">
            {isLogin ? "Введите логин и пароль" : "Создайте аккаунт руководителя"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ваше имя"
                className="w-full h-11 rounded-xl bg-secondary/70 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full h-11 rounded-xl bg-secondary/70 border border-border/50 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль"
                required
                minLength={6}
                className="w-full h-11 rounded-xl bg-secondary/70 border border-border/50 px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl text-sm font-medium text-primary-foreground transition-all disabled:opacity-50"
              style={{ background: "var(--gradient-blue)" }}
            >
              {submitting ? "Загрузка..." : isLogin ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">или</span></div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="w-full h-11 rounded-xl text-sm font-medium transition-all border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            {demoLoading ? "Подготовка демо..." : "Демо-вход (тестовый аккаунт)"}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Войдёт с тестовыми данными для демонстрации
          </p>

          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground text-center transition-colors"
          >
            {isLogin ? "Нет аккаунта? Зарегистрируйтесь как руководитель" : "Уже есть аккаунт? Войдите"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
