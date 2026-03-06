import { useState, useMemo, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Clock, X, Edit3, Save, Trash2, Phone, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const timeSlots = [
  "00:00", "00:30", "01:00", "01:30", "02:00", "02:30",
  "03:00", "03:30", "04:00", "04:30", "05:00", "05:30",
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00", "22:30", "23:00", "23:30",
];
const gradients = ["var(--gradient-blue)", "var(--gradient-green)", "var(--gradient-purple)", "var(--gradient-orange)", "var(--gradient-teal)"];

interface BookingItem {
  id: string;
  date: Date;
  time: string;
  name: string;
  service: string;
  phone: string;
  comment: string;
  color: string;
  status: "confirmed" | "pending" | "cancelled";
}

function BookingDetailDialog({ booking, onClose, onUpdate, onDelete }: {
  booking: BookingItem; onClose: () => void;
  onUpdate: (id: string, updates: Partial<BookingItem>) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(booking.name);
  const [editService, setEditService] = useState(booking.service);
  const [editPhone, setEditPhone] = useState(booking.phone);
  const [editComment, setEditComment] = useState(booking.comment);
  const [editStatus, setEditStatus] = useState(booking.status);
  const [editTime, setEditTime] = useState(booking.time);

  const statusLabels = { confirmed: "Подтверждена", pending: "Ожидает", cancelled: "Отменена" };
  const statusColors = { confirmed: "bg-success/15 text-success", pending: "bg-warning/15 text-warning", cancelled: "bg-destructive/15 text-destructive" };

  const handleSave = () => {
    if (!editName.trim()) { toast({ title: "Ошибка", description: "Введите имя клиента", variant: "destructive" }); return; }
    onUpdate(booking.id, { name: editName.trim(), service: editService.trim(), phone: editPhone.trim(), comment: editComment.trim(), status: editStatus, time: editTime });
    setEditing(false);
    toast({ title: "Запись обновлена", description: editName.trim() });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md apple-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[booking.status]}`}>{statusLabels[booking.status]}</span>
              <span className="text-[10px] text-muted-foreground">{booking.time} · {format(booking.date, "d MMM", { locale: ru })}</span>
            </div>
            {editing ? (
              <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} className="text-lg font-bold bg-card border border-border rounded-xl px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/20" />
            ) : (
              <h2 className="text-lg font-bold text-foreground">{booking.name}</h2>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(booking.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Услуга</label>
              <input value={editService} onChange={(e) => setEditService(e.target.value)} maxLength={100} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Время</label>
              <input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 cursor-pointer" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Телефон</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} type="tel" maxLength={20} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Комментарий</label>
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} maxLength={500} rows={2} className="w-full rounded-xl bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 resize-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Статус</label>
              <div className="flex gap-2 mt-1">
                {(["confirmed", "pending", "cancelled"] as const).map((s) => (
                  <button key={s} onClick={() => setEditStatus(s)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${editStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{statusLabels[s]}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="apple-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Услуга</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{booking.service}</p>
              </div>
              <div className="apple-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase">Телефон</p>
                <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{booking.phone || "—"}</p>
              </div>
            </div>
            {booking.comment && (
              <div className="apple-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Комментарий</p>
                <p className="text-sm text-foreground">{booking.comment}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium mb-2">Сменить статус</p>
              <div className="flex gap-2">
                {(["confirmed", "pending", "cancelled"] as const).map((s) => (
                  <button key={s} onClick={() => { onUpdate(booking.id, { status: s }); toast({ title: "Статус изменён", description: statusLabels[s] }); }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${booking.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >{statusLabels[s]}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Booking() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(today));
  const [localBookings, setLocalBookings] = useState<BookingItem[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newService, setNewService] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [newPhone, setNewPhone] = useState("");

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("bookings").select("*").order("booking_date", { ascending: true });
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      setLocalBookings((data || []).map((b, i) => ({
        id: b.id,
        date: new Date(b.booking_date),
        time: format(new Date(b.booking_date), "HH:mm"),
        name: b.client_name,
        service: b.service,
        phone: b.phone || "",
        comment: b.comment || "",
        color: gradients[i % gradients.length],
        status: b.status as "confirmed" | "pending" | "cancelled",
      })));
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleUpdate = async (id: string, updates: Partial<BookingItem>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.client_name = updates.name;
    if (updates.service !== undefined) dbUpdates.service = updates.service;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.comment !== undefined) dbUpdates.comment = updates.comment;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.time !== undefined) {
      const booking = localBookings.find(b => b.id === id);
      if (booking) {
        const d = new Date(booking.date);
        const [h, m] = updates.time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        dbUpdates.booking_date = d.toISOString();
      }
    }
    const { error } = await supabase.from("bookings").update(dbUpdates).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setLocalBookings(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    setSelectedBooking(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setLocalBookings(prev => prev.filter(b => b.id !== id));
    toast({ title: "Запись удалена" });
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newService.trim()) {
      toast({ title: "Ошибка", description: "Заполните имя и услугу", variant: "destructive" }); return;
    }
    if (!user) return;
    const d = new Date(selectedDate);
    const [h, m] = newTime.split(":").map(Number);
    d.setHours(h, m, 0, 0);

    const { data, error } = await supabase.from("bookings").insert({
      owner_id: user.id,
      client_name: newName.trim(),
      service: newService.trim(),
      phone: newPhone.trim(),
      booking_date: d.toISOString(),
      status: "pending",
    }).select().single();

    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setLocalBookings(prev => [...prev, {
        id: data.id, date: new Date(data.booking_date), time: newTime,
        name: data.client_name, service: data.service, phone: data.phone || "",
        comment: data.comment || "", color: gradients[prev.length % gradients.length], status: "pending",
      }]);
      toast({ title: "Запись создана", description: `${newName.trim()} — ${format(selectedDate, "d MMM", { locale: ru })} ${newTime}` });
      setNewName(""); setNewService(""); setNewPhone(""); setShowAddForm(false);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    setCurrentWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  };

  const prevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const nextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const goToToday = () => {
    setSelectedDate(today);
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setCalendarMonth(startOfMonth(today));
  };

  const dayBookings = useMemo(() =>
    localBookings.filter(b => isSameDay(b.date, selectedDate)).sort((a, b) => a.time.localeCompare(b.time)),
    [localBookings, selectedDate]
  );

  const bookingDates = useMemo(() => {
    const map = new Map<string, number>();
    localBookings.forEach(b => { const key = format(b.date, "yyyy-MM-dd"); map.set(key, (map.get(key) || 0) + 1); });
    return map;
  }, [localBookings]);

  const statusColors = { confirmed: "border-l-4 border-l-success", pending: "border-l-4 border-l-warning", cancelled: "border-l-4 border-l-destructive opacity-60" };
  const statusLabels = { confirmed: "Подтверждена", pending: "Ожидает", cancelled: "Отменена" };
  const statusDots = { confirmed: "bg-success", pending: "bg-warning", cancelled: "bg-destructive" };

  if (loading) {
    return <CRMLayout title={config.bookingTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.bookingTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={prevWeek} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
            <h2 className="text-lg font-semibold text-foreground">
              {format(currentWeekStart, "d", { locale: ru })}–{format(addDays(currentWeekStart, 6), "d MMMM yyyy", { locale: ru })}
            </h2>
            <button onClick={nextWeek} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            <button onClick={goToToday} className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg bg-primary/10 transition-colors">Сегодня</button>
          </div>
          <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn flex items-center gap-2 text-sm self-start">
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Отмена" : config.bookingButton}
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Имя клиента" maxLength={100} className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newService} onChange={(e) => setNewService(e.target.value)} placeholder="Услуга" maxLength={100} className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Дата</label>
                    <p className="text-sm font-medium text-foreground mt-1">{format(selectedDate, "d MMMM yyyy (EEEE)", { locale: ru })}</p>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Время</label>
                    <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm mt-1 cursor-pointer" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase">Телефон</label>
                    <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+7 900 000-00-00" maxLength={20} className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <button onClick={handleAdd} className="gradient-btn-green flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Создать</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Всего записей", value: localBookings.length },
            { label: "Подтверждено", value: localBookings.filter(b => b.status === "confirmed").length },
            { label: "Ожидает", value: localBookings.filter(b => b.status === "pending").length },
            { label: "На сегодня", value: localBookings.filter(b => isSameDay(b.date, today)).length },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="space-y-4">
            <div className="apple-card p-3">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  const count = bookingDates.get(format(day, "yyyy-MM-dd")) || 0;
                  return (
                    <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                      className={cn("flex flex-col items-center py-3 rounded-xl transition-all duration-200 relative",
                        isSelected ? "text-primary-foreground" : isToday ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary"
                      )} style={isSelected ? { background: "var(--gradient-blue)" } : {}}>
                      <span className="text-[10px] font-medium uppercase">{format(day, "EEE", { locale: ru })}</span>
                      <span className="text-lg font-bold mt-0.5">{format(day, "d")}</span>
                      {count > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                            <div key={i} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary-foreground/60" : "bg-primary")} />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="apple-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">{format(selectedDate, "d MMMM, EEEE", { locale: ru })}</h3>
                <span className="text-xs text-muted-foreground">{dayBookings.length} записей</span>
              </div>
              {dayBookings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Нет записей на этот день</p>
                  <button onClick={() => setShowAddForm(true)} className="text-primary text-xs mt-2 hover:underline">+ Создать запись</button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayBookings.map((b) => (
                    <motion.div key={b.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      className={cn("p-3 rounded-xl cursor-pointer transition-all hover:shadow-md", statusColors[b.status])}
                      onClick={() => setSelectedBooking(b)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground text-xs font-bold" style={{ background: b.color }}>
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{b.name}</p>
                            <p className="text-[10px] text-muted-foreground">{b.service}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{b.time}</p>
                          <div className={cn("w-2 h-2 rounded-full ml-auto mt-1", statusDots[b.status])} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="apple-card p-4">
              <Calendar mode="single" selected={selectedDate} onSelect={handleCalendarSelect}
                month={calendarMonth} onMonthChange={setCalendarMonth} locale={ru}
                className="pointer-events-auto" />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedBooking && <BookingDetailDialog booking={selectedBooking} onClose={() => setSelectedBooking(null)} onUpdate={handleUpdate} onDelete={handleDelete} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
