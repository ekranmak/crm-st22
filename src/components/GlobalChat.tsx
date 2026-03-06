import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, User, X, Trash2, CheckCircle2, ChevronLeft,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Employee {
  id: string;
  full_name: string;
  role: string;
}

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function GlobalChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load employees
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, role").neq("id", user.id);
      if (data) setEmployees(data);
    };
    load();
  }, [user]);

  // Load unread counts
  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("internal_messages")
      .select("sender_id")
      .eq("recipient_id", user.id)
      .eq("read", false);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
      setUnreadCounts(counts);
      setTotalUnread(data.length);
    }
  }, [user]);

  useEffect(() => { loadUnreadCounts(); }, [loadUnreadCounts]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user || !selectedEmp) return;
    const { data } = await supabase
      .from("internal_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${selectedEmp}),and(sender_id.eq.${selectedEmp},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    await supabase.from("internal_messages").update({ read: true }).eq("recipient_id", user.id).eq("sender_id", selectedEmp);
    loadUnreadCounts();
  }, [user, selectedEmp, loadUnreadCounts]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("global-chat-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "internal_messages" }, () => {
        loadMessages();
        loadUnreadCounts();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadMessages, loadUnreadCounts]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedEmp || !user) return;
    setSending(true);
    const { error } = await supabase.from("internal_messages").insert({
      sender_id: user.id,
      recipient_id: selectedEmp,
      content: newMsg.trim(),
    });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else setNewMsg("");
    setSending(false);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("internal_messages").delete().eq("id", msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  const clearChat = async () => {
    if (!user || !selectedEmp) return;
    await supabase.from("internal_messages").delete().eq("sender_id", user.id).eq("recipient_id", selectedEmp);
    await supabase.from("internal_messages").delete().eq("sender_id", selectedEmp).eq("recipient_id", user.id);
    setMessages([]);
    loadUnreadCounts();
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmp);

  if (!user) return null;

  return (
    <>
      {/* Floating tab on right edge */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-1.5 bg-primary text-primary-foreground px-2 py-3 rounded-l-xl shadow-lg hover:px-3 transition-all group"
            style={{ writingMode: "vertical-lr", textOrientation: "mixed" }}
          >
            <MessageSquare className="w-3.5 h-3.5 rotate-90" />
            <span className="text-[11px] font-medium tracking-wide">Сообщения</span>
            {totalUnread > 0 && (
              <span className="w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center rotate-90">
                {totalUnread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[340px] z-50 flex flex-col bg-card border-l border-border/50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <div className="flex items-center gap-2">
                {selectedEmp && (
                  <button onClick={() => setSelectedEmp(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {selectedEmployee ? selectedEmployee.full_name : "Сообщения"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {selectedEmp && messages.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Очистить чат?</AlertDialogTitle>
                        <AlertDialogDescription>Все сообщения будут удалены.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={clearChat} className="bg-destructive text-destructive-foreground">Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!selectedEmp ? (
              /* Employee list */
              <div className="flex-1 overflow-auto p-3 space-y-1">
                {employees.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Нет сотрудников</p>
                )}
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmp(emp.id)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-secondary transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{emp.full_name || "Без имени"}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                    </div>
                    {unreadCounts[emp.id] > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                        {unreadCounts[emp.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              /* Chat */
              <>
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">Нет сообщений</p>
                  )}
                  {messages.map(msg => {
                    const isMine = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group/msg`}>
                        <div className="flex items-center gap-1">
                          {isMine && (
                            <button onClick={() => deleteMessage(msg.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/msg:opacity-100 transition-all">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                              isMine ? "text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"
                            }`}
                            style={isMine ? { background: "var(--gradient-blue)" } : {}}
                          >
                            <p>{msg.content}</p>
                            <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                              <p className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                              </p>
                              {isMine && msg.read && <CheckCircle2 className="w-2.5 h-2.5 text-primary-foreground/60" />}
                            </div>
                          </div>
                          {!isMine && (
                            <button onClick={() => deleteMessage(msg.id)}
                              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover/msg:opacity-100 transition-all">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-border/30">
                  <div className="flex gap-2">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      placeholder="Написать..."
                      className="flex-1 h-9 rounded-xl bg-secondary/70 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground disabled:opacity-50"
                      style={{ background: "var(--gradient-blue)" }}>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
    </>
  );
}
