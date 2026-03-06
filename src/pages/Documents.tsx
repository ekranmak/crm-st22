import { useState, useCallback, useEffect, useRef } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText, Download, X, Trash2, Edit3, Save, Loader2, Sparkles, Upload, FileSpreadsheet, File, FileImage } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const statusColors: Record<string, string> = {
  "Подписан": "stock-high", "Оплачен": "stock-high", "Ожидает оплаты": "stock-medium",
  "На подписи": "stock-medium", "Черновик": "stock-low", "Готов": "stock-high",
};
const allDocStatuses = ["Черновик", "На подписи", "Подписан", "Ожидает оплаты", "Оплачен", "Готов"];
const docTypes = ["Договор", "Акт", "Счёт", "КП", "Лицензия", "Накладная", "Смета", "Приказ", "Доверенность"];

const docTemplates: Record<string, (data: { name: string; counterparty: string; amount: number; date: string }) => string> = {
  "Договор": (d) => `ДОГОВОР ОКАЗАНИЯ УСЛУГ\n\nг. Москва\t\t\t\t${d.date}\n\nСтороны:\n1. ${d.counterparty} (далее — Заказчик)\n2. Наименование компании (далее — Исполнитель)\n\nПредмет договора: ${d.name}\n\nСтоимость: ${d.amount > 0 ? `₽${d.amount.toLocaleString()}` : "по согласованию"}\n\nСроки: Определяются дополнительным соглашением.\n\nОтветственность сторон:\nСтороны несут ответственность за неисполнение обязательств в соответствии с действующим законодательством РФ.\n\nРеквизиты сторон:\nЗаказчик: ${d.counterparty}\nИсполнитель: _______________\n\nПодписи сторон:\n\nЗаказчик: _______________\t\tИсполнитель: _______________`,
  "Акт": (d) => `АКТ ВЫПОЛНЕННЫХ РАБОТ\n\nДата: ${d.date}\n\nЗаказчик: ${d.counterparty}\nИсполнитель: Наименование компании\n\nНаименование работ: ${d.name}\n\nСтоимость: ₽${d.amount.toLocaleString()}\n\nРаботы выполнены в полном объёме. Заказчик претензий по объёму, качеству и срокам оказания услуг не имеет.\n\nЗаказчик: _______________\t\tИсполнитель: _______________`,
  "Счёт": (d) => `СЧЁТ НА ОПЛАТУ\n\nСчёт №____\t\tот ${d.date}\n\nПлательщик: ${d.counterparty}\nПолучатель: Наименование компании\nИНН: _______________\nБИК: _______________\nР/с: _______________\n\n№\tНаименование\t\tКол-во\tЦена\t\tСумма\n1\t${d.name}\t\t1\t₽${d.amount.toLocaleString()}\t₽${d.amount.toLocaleString()}\n\nИтого: ₽${d.amount.toLocaleString()}\nНДС (20%): ₽${Math.round(d.amount * 0.2).toLocaleString()}\nВсего к оплате: ₽${Math.round(d.amount * 1.2).toLocaleString()}\n\nДиректор: _______________\t\tГл. бухгалтер: _______________`,
  "КП": (d) => `КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ\n\nДата: ${d.date}\n\nУважаемый ${d.counterparty}!\n\nПредлагаем Вам рассмотреть наше предложение:\n\nУслуга/товар: ${d.name}\nСтоимость: ₽${d.amount.toLocaleString()}\n\nПреимущества:\n• Гарантия качества\n• Индивидуальный подход\n• Оперативные сроки выполнения\n• Полное сопровождение проекта\n\nСрок действия предложения: 30 дней\n\nКонтакты:\nТел: +7 (___) ___-__-__\nEmail: info@company.ru\n\nС уважением,\nНаименование компании`,
  "Накладная": (d) => `ТОВАРНАЯ НАКЛАДНАЯ\n\nНакладная №____\t\tот ${d.date}\n\nОтправитель: Наименование компании\nПолучатель: ${d.counterparty}\n\n№\tНаименование\t\tКол-во\tЦена\t\tСумма\n1\t${d.name}\t\t1\t₽${d.amount.toLocaleString()}\t₽${d.amount.toLocaleString()}\n\nИтого: ₽${d.amount.toLocaleString()}\n\nОтпустил: _______________\t\tПолучил: _______________`,
  "Приказ": (d) => `ПРИКАЗ №____\n\nг. Москва\t\t\t\t${d.date}\n\nНа основании: ${d.name}\n\nПРИКАЗЫВАЮ:\n\n1. _______________\n2. _______________\n3. Контроль за исполнением настоящего приказа возложить на _______________\n\nДиректор: _______________`,
};

interface DocItem {
  id: string;
  name: string;
  doc_type: string;
  status: string;
  counterparty: string;
  amount: number;
  content: string;
  created_at: string;
  file_path?: string;
}

function generateDocContent(docType: string, name: string, counterparty: string, amount: number): string {
  const date = new Date().toLocaleDateString("ru-RU");
  const template = docTemplates[docType];
  if (template) return template({ name, counterparty, amount, date });
  return `${docType.toUpperCase()}\n\nДата: ${date}\n\nНаименование: ${name}\nКонтрагент: ${counterparty}\nСумма: ₽${amount.toLocaleString()}\n\nСодержание документа...`;
}

function downloadAsText(doc: DocItem) {
  const content = doc.content || generateDocContent(doc.doc_type, doc.name, doc.counterparty, doc.amount);
  const blob = new Blob(["\uFEFF" + content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAsCSV(doc: DocItem) {
  const rows = [
    ["Поле", "Значение"],
    ["Название", doc.name],
    ["Тип", doc.doc_type],
    ["Контрагент", doc.counterparty],
    ["Сумма", String(doc.amount)],
    ["Статус", doc.status],
    ["Дата", new Date(doc.created_at).toLocaleDateString("ru-RU")],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAsHTML(doc: DocItem) {
  const content = doc.content || generateDocContent(doc.doc_type, doc.name, doc.counterparty, doc.amount);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title>
<style>body{font-family:system-ui,sans-serif;padding:50px 60px;color:#1a1a1a;font-size:14px;line-height:1.7;white-space:pre-wrap;max-width:800px;margin:0 auto}
h1{font-size:18px;text-align:center;margin-bottom:30px}</style></head>
<body>${content.replace(/\n/g, "<br>")}</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.name.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, "")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAsPDF(doc: DocItem) {
  const content = doc.content || generateDocContent(doc.doc_type, doc.name, doc.counterparty, doc.amount);
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.name}</title>
<style>body{font-family:system-ui,sans-serif;padding:50px 60px;color:#1a1a1a;font-size:14px;line-height:1.7;white-space:pre-wrap}
h1{font-size:18px;text-align:center;margin-bottom:30px}@media print{body{padding:30px 40px}}</style></head>
<body>${content.replace(/\n/g, "<br>")}</body>
<script>window.onload=()=>window.print()</script></html>`);
  w.document.close();
}

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: File,
  docx: File,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
};

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return fileTypeIcons[ext] || File;
}

// --- Detail Dialog ---
function DocDetailDialog({ doc, onClose, onUpdate, onDelete, onUploadFile, onDownloadFile }: {
  doc: DocItem; onClose: () => void;
  onUpdate: (id: string, updates: Partial<DocItem>) => void;
  onDelete: (id: string) => void;
  onUploadFile: (docId: string, file: File) => void;
  onDownloadFile: (doc: DocItem) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(doc.name);
  const [editType, setEditType] = useState(doc.doc_type);
  const [editCounterparty, setEditCounterparty] = useState(doc.counterparty);
  const [editAmount, setEditAmount] = useState(String(doc.amount));
  const [editContent, setEditContent] = useState(doc.content || "");
  const [showContent, setShowContent] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate(doc.id, { name: editName, doc_type: editType, counterparty: editCounterparty, amount: Number(editAmount) || 0, content: editContent });
    setEditing(false);
    toast({ title: "Документ обновлён" });
  };

  const handleGenerate = () => {
    const generated = generateDocContent(editType || doc.doc_type, editName || doc.name, editCounterparty || doc.counterparty, Number(editAmount) || doc.amount);
    setEditContent(generated);
    setShowContent(true);
    toast({ title: "Документ сгенерирован" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg max-h-[85vh] overflow-y-auto apple-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center"><FileText className="w-6 h-6 text-muted-foreground" /></div>
            <div>
              {editing ? <input value={editName} onChange={(e) => setEditName(e.target.value)} className="text-lg font-bold bg-card border border-border rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 w-full" />
                : <h2 className="text-lg font-bold text-foreground">{doc.name}</h2>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{doc.doc_type}</span>
                <span className={statusColors[doc.status] || "stock-medium"}>{doc.status}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(doc.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {/* Status */}
        <div className="apple-card p-3 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Статус</h3>
          <div className="flex gap-1.5 flex-wrap">
            {allDocStatuses.map(s => (
              <button key={s} onClick={() => { onUpdate(doc.id, { status: s }); toast({ title: "Статус обновлён", description: s }); }}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${doc.status === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Attached file */}
        {doc.file_path && (
          <div className="apple-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => { const Icon = getFileIcon(doc.file_path); return <Icon className="w-4 h-4 text-muted-foreground" />; })()}
              <span className="text-xs text-foreground truncate max-w-[200px]">{doc.file_path.split("/").pop()}</span>
            </div>
            <button onClick={() => onDownloadFile(doc)} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Download className="w-3 h-3" />Скачать
            </button>
          </div>
        )}

        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Тип</label>
                <select value={editType} onChange={(e) => setEditType(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 appearance-none cursor-pointer">
                  {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Сумма</label>
                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Контрагент</label>
              <input value={editCounterparty} onChange={(e) => setEditCounterparty(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>

            {/* Upload file */}
            <div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) { onUploadFile(doc.id, f); } }} />
              <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors">
                <Upload className="w-4 h-4" />Загрузить файл с компьютера
              </button>
            </div>

            <button onClick={handleGenerate} className="w-full gradient-btn-purple flex items-center justify-center gap-2 text-sm">
              <Sparkles className="w-4 h-4" />Сгенерировать документ
            </button>
            {showContent && (
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Содержание</label>
                <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={10} className="w-full rounded-xl bg-card border border-border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1 resize-y" />
              </div>
            )}
            <button onClick={handleSave} className="w-full h-9 rounded-xl text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>Сохранить</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="apple-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Контрагент</p><p className="text-sm font-medium text-foreground mt-0.5">{doc.counterparty || "—"}</p></div>
              <div className="apple-card p-3"><p className="text-[10px] text-muted-foreground uppercase">Сумма</p><p className="text-sm font-bold text-foreground mt-0.5">{doc.amount > 0 ? `₽${doc.amount.toLocaleString()}` : "—"}</p></div>
            </div>
            {doc.content && (
              <div className="apple-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase mb-1">Превью</p>
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">{doc.content.slice(0, 500)}{doc.content.length > 500 ? "..." : ""}</pre>
              </div>
            )}
          </>
        )}

        {/* Download options */}
        <div className="relative">
          <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="w-full gradient-btn flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" />Скачать документ ▾
          </button>
          <AnimatePresence>
            {showDownloadMenu && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute bottom-full left-0 right-0 mb-1 apple-card p-1 z-10">
                {[
                  { label: "TXT", fn: () => downloadAsText(doc) },
                  { label: "PDF (печать)", fn: () => downloadAsPDF(doc) },
                  { label: "CSV", fn: () => downloadAsCSV(doc) },
                  { label: "HTML", fn: () => downloadAsHTML(doc) },
                ].map(opt => (
                  <button key={opt.label} onClick={() => { opt.fn(); setShowDownloadMenu(false); toast({ title: `Скачивание ${opt.label}` }); }}
                    className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-foreground">{opt.label}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Main page ---
export default function Documents() {
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Договор");
  const [newCounterparty, setNewCounterparty] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Все");
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { setDocuments((data || []).map(d => ({ ...d, amount: Number(d.amount) }))); }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleAdd = async () => {
    if (!newName.trim()) { toast({ title: "Ошибка", description: "Введите название", variant: "destructive" }); return; }
    if (!user) return;
    const amount = Number(newAmount) || 0;
    const content = autoGenerate ? generateDocContent(newType, newName.trim(), newCounterparty.trim() || "Контрагент", amount) : "";
    const { data, error } = await supabase.from("documents").insert({
      owner_id: user.id, name: newName.trim(), doc_type: newType,
      counterparty: newCounterparty.trim(), amount, content,
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    if (data) {
      setDocuments(prev => [{ ...data, amount: Number(data.amount) }, ...prev]);
      toast({ title: "Документ создан", description: autoGenerate ? "Текст сгенерирован по шаблону" : newName.trim() });
      setNewName(""); setNewCounterparty(""); setNewAmount(""); setShowAddForm(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<DocItem>) => {
    const { error } = await supabase.from("documents").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    setSelectedDoc(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
  };

  const handleDelete = async (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc?.file_path) {
      await supabase.storage.from("documents").remove([doc.file_path]);
    }
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); return; }
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast({ title: "Документ удалён" });
  };

  const handleUploadFile = async (docId: string, file: File) => {
    if (!user) return;
    setUploading(true);
    const filePath = `${user.id}/${docId}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Ошибка загрузки", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    await handleUpdate(docId, { file_path: filePath } as Partial<DocItem>);
    toast({ title: "Файл загружен", description: file.name });
    setUploading(false);
  };

  const handleDownloadFile = async (doc: DocItem) => {
    if (!doc.file_path) return;
    const { data, error } = await supabase.storage.from("documents").download(doc.file_path);
    if (error) { toast({ title: "Ошибка скачивания", description: error.message, variant: "destructive" }); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_path.split("/").pop() || "file";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Файл скачан" });
  };

  // Upload file as a new document entry
  const handleUploadNewFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const docName = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const docType = ["xls", "xlsx", "csv"].includes(ext) ? "Смета" : ["doc", "docx", "pdf"].includes(ext) ? "Договор" : "Договор";

    const { data, error } = await supabase.from("documents").insert({
      owner_id: user.id, name: docName, doc_type: docType,
      counterparty: "", amount: 0, content: "",
    }).select().single();
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); setUploading(false); return; }
    if (data) {
      const filePath = `${user.id}/${data.id}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file, { upsert: true });
      if (uploadError) { toast({ title: "Ошибка загрузки", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
      await supabase.from("documents").update({ file_path: filePath }).eq("id", data.id);
      setDocuments(prev => [{ ...data, amount: Number(data.amount), file_path: filePath }, ...prev]);
      toast({ title: "Файл загружен как документ", description: file.name });
    }
    setUploading(false);
  };

  const filtered = filterStatus === "Все" ? documents : documents.filter(d => d.status === filterStatus);

  if (loading) {
    return <CRMLayout title={config.documentsTitle}><div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></CRMLayout>;
  }

  return (
    <CRMLayout title={config.documentsTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-foreground">{documents.length} документов</h2>
            <div className="flex gap-1 flex-wrap">
              {["Все", ...allDocStatuses].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <input ref={uploadRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadNewFile(f); }} />
            <button onClick={() => uploadRef.current?.click()} disabled={uploading} className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Загрузить
            </button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn flex items-center gap-2 text-sm">
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAddForm ? "Отмена" : "Создать"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название документа" className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <select value={newType} onChange={(e) => setNewType(e.target.value)} className="h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                    {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input value={newCounterparty} onChange={(e) => setNewCounterparty(e.target.value)} placeholder="Контрагент" className="flex-1 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="Сумма ₽" type="number" className="w-36 h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={autoGenerate} onChange={(e) => setAutoGenerate(e.target.checked)} className="rounded" />
                    <Sparkles className="w-3.5 h-3.5" />Автогенерация по шаблону
                  </label>
                  <button onClick={handleAdd} className="gradient-btn flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Создать</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Всего", value: documents.length },
            { label: "Черновики", value: documents.filter(d => d.status === "Черновик").length },
            { label: "На подписи", value: documents.filter(d => d.status === "На подписи").length },
            { label: "Подписано", value: documents.filter(d => d.status === "Подписан" || d.status === "Оплачен" || d.status === "Готов").length },
          ].map(s => (
            <div key={s.label} className="kpi-card">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="apple-card divide-y divide-border/30">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Нет документов</div>
          ) : filtered.map(doc => {
            const FileIcon = doc.file_path ? getFileIcon(doc.file_path) : FileText;
            return (
              <div key={doc.id} className="flex items-center gap-4 p-4 table-row-hover cursor-pointer group" onClick={() => setSelectedDoc(doc)}>
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"><FileIcon className="w-5 h-5 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.doc_type} · {doc.counterparty || "—"} {doc.amount > 0 ? `· ₽${doc.amount.toLocaleString()}` : ""}
                    {doc.file_path && " · 📎 файл"}
                  </p>
                </div>
                <span className={statusColors[doc.status] || "stock-medium"}>{doc.status}</span>
                <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); downloadAsText(doc); toast({ title: "Скачивание" }); }} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"><Download className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedDoc && <DocDetailDialog doc={selectedDoc} onClose={() => setSelectedDoc(null)} onUpdate={handleUpdate} onDelete={handleDelete} onUploadFile={handleUploadFile} onDownloadFile={handleDownloadFile} />}
      </AnimatePresence>
    </CRMLayout>
  );
}
