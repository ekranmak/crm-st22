import { useState, useEffect, useCallback } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ArrowUpDown, X, Edit3, Save, Trash2, Package, AlertTriangle, Loader2, Download, Upload } from "lucide-react";
import { useCRM } from "@/contexts/CRMContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  sku: string;
  qty: number;
  min: number;
  price: number;
  category: string;
}

function getStockStatus(qty: number, min: number) {
  if (min === 0) return { label: "∞ Доступно", class: "stock-high" };
  if (qty <= min * 0.3) return { label: "Критично", class: "stock-low" };
  if (qty <= min) return { label: "Мало", class: "stock-medium" };
  return { label: "В наличии", class: "stock-high" };
}

function ProductDetailDialog({ product, onClose, onUpdate, onDelete }: {
  product: Product; onClose: () => void;
  onUpdate: (id: string, updates: Partial<Product>) => void;
  onDelete: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [sku, setSku] = useState(product.sku);
  const [qty, setQty] = useState(String(product.qty));
  const [min, setMin] = useState(String(product.min));
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState(product.category);

  const status = getStockStatus(product.qty, product.min);

  const handleSave = () => {
    if (!name.trim()) { toast({ title: "Ошибка", description: "Введите название", variant: "destructive" }); return; }
    onUpdate(product.id, {
      name: name.trim(), sku: sku.trim(), qty: Math.max(0, Number(qty) || 0),
      min: Math.max(0, Number(min) || 0), price: Math.max(0, Number(price) || 0), category: category.trim(),
    });
    setEditing(false);
    toast({ title: "Товар обновлён", description: name.trim() });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md apple-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <span className={`text-[10px] ${status.class} mr-2`}>{status.label}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{product.sku}</span>
              {!editing && <h2 className="text-sm font-bold text-foreground mt-0.5">{product.name}</h2>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => editing ? handleSave() : setEditing(true)} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-primary">
              {editing ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            </button>
            <button onClick={() => { onDelete(product.id); onClose(); }} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">Название</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">SKU</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Категория</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Остаток</label>
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Мин. остаток</label>
                <input type="number" value={min} onChange={(e) => setMin(e.target.value)} min="0" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase font-medium">Цена, ₽</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min="0" className="w-full h-9 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
              </div>
            </div>
            <button onClick={handleSave} className="w-full h-9 rounded-xl text-sm font-medium text-primary-foreground" style={{ background: "var(--gradient-blue)" }}>Сохранить</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="apple-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Остаток</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{product.qty}</p>
              </div>
              <div className="apple-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Мин.</p>
                <p className="text-lg font-bold text-foreground mt-0.5">{product.min}</p>
              </div>
              <div className="apple-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Цена</p>
                <p className="text-lg font-bold text-foreground mt-0.5">₽{product.price.toLocaleString()}</p>
              </div>
            </div>
            <div className="apple-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Категория</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{product.category}</p>
            </div>
            <div className="apple-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase">Стоимость на складе</p>
              <p className="text-sm font-bold text-foreground mt-0.5">₽{(product.qty * product.price).toLocaleString()}</p>
            </div>
            {product.min > 0 && product.qty <= product.min && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 text-warning text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Остаток ниже минимума. Необходимо пополнить {product.min - product.qty} шт.</span>
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Warehouse() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Все");
  const [sortField, setSortField] = useState<"qty" | "price" | "name">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { config } = useCRM();
  const { toast } = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newMin, setNewMin] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("warehouse_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Ошибка загрузки", description: error.message, variant: "destructive" });
    } else {
      setProducts((data || []).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        qty: p.qty,
        min: p.min_qty,
        price: Number(p.price),
        category: p.category,
      })));
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const categories = ["Все", ...new Set(products.map((p) => p.category))];

  const toggleSort = (field: "qty" | "price" | "name") => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = products
    .filter(
      (p) =>
        (filterCat === "Все" || p.category === filterCat) &&
        (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a[sortField] as number) - (b[sortField] as number));
    });

  const handleAdd = async () => {
    if (!newName.trim()) { toast({ title: "Ошибка", description: "Введите название товара", variant: "destructive" }); return; }
    if (!user) return;
    const sku = newSku.trim() || `SKU-${Date.now().toString(36).toUpperCase()}`;
    const { data, error } = await supabase.from("warehouse_products").insert({
      owner_id: user.id,
      name: newName.trim(),
      sku,
      qty: Math.max(0, Number(newQty) || 0),
      min_qty: Math.max(0, Number(newMin) || 0),
      price: Math.max(0, Number(newPrice) || 0),
      category: newCategory.trim() || "Без категории",
    }).select().single();

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else if (data) {
      setProducts(prev => [{
        id: data.id, name: data.name, sku: data.sku, qty: data.qty,
        min: data.min_qty, price: Number(data.price), category: data.category,
      }, ...prev]);
      toast({ title: "Товар добавлен", description: `${data.name} (${data.sku})` });
      setNewName(""); setNewSku(""); setNewQty(""); setNewMin(""); setNewPrice(""); setNewCategory("");
      setShowAddForm(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Product>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.qty !== undefined) dbUpdates.qty = updates.qty;
    if (updates.min !== undefined) dbUpdates.min_qty = updates.min;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase.from("warehouse_products").update(dbUpdates).eq("id", id);
    if (error) {
      toast({ title: "Ошибка обновления", description: error.message, variant: "destructive" });
    } else {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      setSelectedProduct(prev => prev && prev.id === id ? { ...prev, ...updates } : prev);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("warehouse_products").delete().eq("id", id);
    if (error) {
      toast({ title: "Ошибка удаления", description: error.message, variant: "destructive" });
    } else {
      setProducts(prev => prev.filter(p => p.id !== id));
      toast({ title: "Товар удалён" });
    }
  };

  const totalValue = products.reduce((s, p) => s + p.qty * p.price, 0);

  const handleExportCSV = () => {
    const header = "Название;SKU;Категория;Количество;Мин. остаток;Цена";
    const rows = products.map(p => `${p.name};${p.sku};${p.category};${p.qty};${p.min};${p.price}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Экспорт завершён", description: `${products.length} товаров экспортировано` });
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast({ title: "Ошибка", description: "Файл пуст или некорректен", variant: "destructive" }); return; }
      const rows = lines.slice(1); // skip header
      const newProducts = rows.map(row => {
        const cols = row.split(";").map(c => c.trim());
        return {
          owner_id: user.id,
          name: cols[0] || "Без названия",
          sku: cols[1] || `SKU-${Date.now().toString(36).toUpperCase()}`,
          category: cols[2] || "Без категории",
          qty: Math.max(0, Number(cols[3]) || 0),
          min_qty: Math.max(0, Number(cols[4]) || 0),
          price: Math.max(0, Number(cols[5]) || 0),
        };
      }).filter(p => p.name !== "Без названия" || rows.length === 1);

      if (newProducts.length === 0) { toast({ title: "Ошибка", description: "Не найдено валидных строк", variant: "destructive" }); return; }

      const { data, error } = await supabase.from("warehouse_products").insert(newProducts).select();
      if (error) {
        toast({ title: "Ошибка импорта", description: error.message, variant: "destructive" });
      } else if (data) {
        setProducts(prev => [...data.map(p => ({
          id: p.id, name: p.name, sku: p.sku, qty: p.qty,
          min: p.min_qty, price: Number(p.price), category: p.category,
        })), ...prev]);
        toast({ title: "Импорт завершён", description: `${data.length} товаров добавлено` });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (loading) {
    return (
      <CRMLayout title={config.warehouseTitle}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout title={config.warehouseTitle}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию или SKU..." className="h-9 w-64 rounded-xl bg-card border border-border pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map((c) => (
                <button key={c} onClick={() => setFilterCat(c)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filterCat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors" title="Экспорт CSV">
              <Download className="w-3.5 h-3.5" /> Экспорт
            </button>
            <label className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors cursor-pointer" title="Импорт CSV">
              <Upload className="w-3.5 h-3.5" /> Импорт
              <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
            </label>
            <button onClick={() => setShowAddForm(!showAddForm)} className="gradient-btn-green flex items-center gap-2 text-sm">
              {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddForm ? "Отмена" : "Добавить"}
            </button>
          </div>
        </div>

        {/* Add product form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="apple-card p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Новый товар</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Название *</label>
                    <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название товара" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">SKU</label>
                    <input value={newSku} onChange={(e) => setNewSku(e.target.value)} placeholder="Авто-генерация" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Кол-во</label>
                    <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="0" min="0" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Мин. остаток</label>
                    <input type="number" value={newMin} onChange={(e) => setNewMin(e.target.value)} placeholder="0" min="0" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Цена, ₽</label>
                    <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0" min="0" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-medium">Категория</label>
                    <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Без категории" className="w-full h-10 rounded-xl bg-card border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mt-1" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleAdd} className="gradient-btn-green flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Добавить товар</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Всего позиций", value: products.length },
            { label: "В наличии", value: products.filter((p) => p.qty > p.min).length },
            { label: "Заканчиваются", value: products.filter((p) => p.min > 0 && p.qty <= p.min && p.qty > p.min * 0.3).length },
            { label: "Критично", value: products.filter((p) => p.min > 0 && p.qty <= p.min * 0.3).length },
            { label: "Стоимость склада", value: `₽${totalValue.toLocaleString()}` },
          ].map((s) => (
            <div key={s.label} className="kpi-card">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="apple-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">Название <ArrowUpDown className={`w-3 h-3 ${sortField === "name" ? "text-primary" : ""}`} /></span>
                </th>
                <th className="text-left p-4 font-medium">SKU</th>
                <th className="text-left p-4 font-medium">Категория</th>
                <th className="text-right p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("qty")}>
                  <span className="inline-flex items-center gap-1">Остаток <ArrowUpDown className={`w-3 h-3 ${sortField === "qty" ? "text-primary" : ""}`} /></span>
                </th>
                <th className="text-right p-4 font-medium cursor-pointer hover:text-foreground" onClick={() => toggleSort("price")}>
                  <span className="inline-flex items-center gap-1">Цена <ArrowUpDown className={`w-3 h-3 ${sortField === "price" ? "text-primary" : ""}`} /></span>
                </th>
                <th className="text-center p-4 font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const status = getStockStatus(p.qty, p.min);
                return (
                  <tr key={p.id} className="table-row-hover border-b border-border/30 last:border-0 cursor-pointer" onClick={() => setSelectedProduct(p)}>
                    <td className="p-4 font-medium text-foreground">{p.name}</td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{p.sku}</td>
                    <td className="p-4 text-muted-foreground">{p.category}</td>
                    <td className="p-4 text-right text-foreground font-medium">{p.qty} шт.</td>
                    <td className="p-4 text-right text-foreground">₽{p.price.toLocaleString()}</td>
                    <td className="p-4 text-center"><span className={status.class}>{status.label}</span></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Ничего не найдено</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailDialog
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </CRMLayout>
  );
}
