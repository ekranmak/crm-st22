# 📊 Архитектура сохранения данных CRM

## Обзор БД

### Структура Supabase

```
auth.users (Supabase Auth) — пользователи
    ↓
public.profiles — профили пользователей
public.user_roles — роли и права доступа
    ↓
CRM Tables:
  ├── bookings — записи/броирование
  ├── finance_entries — финансовые записи
  ├── warehouse_products — товары на складе
  ├── assigned_tasks — задачи сотрудникам
  ├── documents — документы и контракты
  ├── orders — заказы клиентов
  ├── email_campaigns — рассылки
  ├── subscriptions — подписки
  ├── call_logs — логи звонков
  ├── internal_messages — внутренние сообщения
  ├── team_members — члены команды
  └── ... и другие таблицы
```

## Поток сохранения данных

### 1. Бронирование (Bookings)

**Файл:** `src/pages/Booking.tsx`

```
Пользователь заполняет форму
    ↓
Валидация на фронтенде
    ↓
supabase.from("bookings").insert({ ... })
    ↓
RLS политика: only owner_id = auth.uid()
    ↓
Данные сохранены в БД
    ↓
Toast: "Запись добавлена"
```

**Таблица:**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  owner_id UUID (user who owns this booking),
  client_name TEXT,
  service TEXT,
  phone TEXT,
  comment TEXT,
  status TEXT ('pending', 'confirmed', 'cancelled'),
  booking_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
```

**RLS Политики:**
- Юзер видит только свои записи
- Админ видит все
- Юзер может редактировать свои

### 2. Финансовые записи (Finance)

**Файл:** `src/pages/Finance.tsx`

```
Юзер добавляет статью доходов/расходов
    ↓
supabase.from("finance_entries").insert({
  owner_id: user.id,
  name: "Оплата от клиента",
  amount: 50000,
  type: "income",
  category: "Услуги"
})
    ↓
Данные индексируются (быстрый поиск)
    ↓
Dashboard автоматически обновляет KPI
```

**Например:**
- Доход: ₽ sumOf(WHERE type='income')
- Расход: ₽ sumOf(WHERE type='expense')
- Прибыль: доход - расход

### 3. Товары на складе (Warehouse)

**Файл:** `src/pages/Warehouse.tsx`

```
Менеджер добавляет товар
    ↓
supabase.from("warehouse_products").insert({
  name: "Ноутбук",
  sku: "TECH-001",
  qty: 5,
  min_qty: 2,  // Alert если qty <= min_qty
  price: 189990,
  category: "Техника"
})
    ↓
Dashboard считает количество товаров < min_qty
    ↓
Показывает алерт: "3 товара нужно пополнить"
```

### 4. Задачи (Tasks)

**Файл:** `src/pages/Projects.tsx`

```
Менеджер создает задачу
    ↓
supabase.from("assigned_tasks").insert({
  creator_id: currentUser.id,
  assignee_id: employeeId,
  title: "Завершить проект",
  priority: "high",
  status: "todo",  // todo → in_progress → done
  due_date: "2026-03-15"
})
    ↓
Задача видна только создателю и исполнителю
    ↓
Исполнитель обновляет статус
    ↓
supabase.from("assigned_tasks").update({ status: "done" })
```

### 5. Внутренние сообщения (Messages)

**Файл:** `src/pages/Messages.tsx`

```
Менеджер отправляет сообщение сотруднику
    ↓
supabase.from("internal_messages").insert({
  sender_id: manager.id,
  recipient_id: employee.id,
  content: "Завершите задачу до вечера",
  read: false
})
    ↓
Real-time subscription слушает новые сообщения
    ↓
Сообщение появляется мгновенно (live)
    ↓
Сотрудник прочитает → read: true
```

### 6. Документы (Documents)

**Файл:** `src/pages/Documents.tsx`

```
Юзер создает документ из шаблона
    ↓
supabase.from("documents").insert({
  name: "Договор с клиентом",
  doc_type: "Договор",
  status: "Черновик",  // Черновик → На подписи → Подписан
  content: "Текст договора...",
  counterparty: "ООО Альфа",
  amount: 50000
})
    ↓
Документ можно редактировать
    ↓
Экспортировать: TXT, CSV, HTML, PDF (браузер)
    ↓
Архивировать в статусе "Подписан"
```

### 7. Заказы клиентов (Orders)

**Файл:** `src/pages/Orders.tsx`

```
Менеджер создает заказ
    ↓
supabase.from("orders").insert({
  client_name: "ООО Компания",
  order_number: "ORD-001",
  items: "Разработка, Дизайн",
  total: 285000,
  status: "Новый",  // Новый → В работе → Завершён
  manager: "Иванов А.С.",
  client_email: "info@company.ru"
})
    ↓
Для каждого заказа создаются подзадачи
    ↓
Finance: При оплате → finance_entries (income)
    ↓
Dashboard отслеживает статус
```

## Логика обновлений

### Real-time синхронизация

```typescript
// Включено для таблиц:
// - internal_messages (мгновенные уведомления)
// - assigned_tasks (обновления статуса)
// - orders (изменения статуса заказов)

watch = supabase
  .channel('bookings')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'bookings' },
    (changes) => updateUI(changes)
  )
  .subscribe();
```

## Безопасность данных (RLS)

### Row Level Security Политики

Каждая таблица имеет RLS:

```sql
-- Пример: таблица orders
-- Админ видит все
SELECT * FROM orders;  -- ✅ если role='admin'

-- Юзер видит свои
SELECT * FROM orders WHERE owner_id = auth.uid();  -- ✅ всегда

-- Чужие данные скрыты
SELECT * FROM other_user_orders;  -- ❌ видит NULL
```

### Backend функции (Auth)

```sql
-- Security definer функция
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;
```

## Workflow примеры

### Пример 1: Добавление товара на склад

```javascript
// 1. User interface
const handleAddProduct = async (product) => {
  // 2. Frontend validation
  if (!product.name || !product.sku || !product.qty)
    return toast.error("Заполните все поля");

  // 3. Database insert
  const { data, error } = await supabase
    .from("warehouse_products")
    .insert([{
      owner_id: user.id,
      name: product.name,
      sku: product.sku,
      qty: product.qty,
      min_qty: product.min_qty,
      price: product.price,
      category: product.category,
    }])
    .select()
    .single();

  // 4. Error handling
  if (error) {
    toast.error(error.message);
    return;
  }

  // 5. Update local state
  setProducts(prev => [data, ...prev]);

  // 6. Success notification
  toast.success(`Товар добавлен: ${data.name}`);

  // 7. Auto-refresh dashboard
  await refreshDashboard();
};
```

### Пример 2: Обновление статуса заказа

```javascript
const updateOrderStatus = async (orderId, newStatus) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .eq("owner_id", user.id)  // RLS проверка
    .select()
    .single();

  if (error) throw error;

  // Обновить локально
  setOrders(prev => prev.map(o => 
    o.id === orderId ? { ...o, status: newStatus } : o
  ));

  // Если заказ оплачен → создать финансовую запись
  if (newStatus === "Оплачен") {
    await supabase.from("finance_entries").insert({
      owner_id: user.id,
      name: `Оплата заказа ${data.order_number}`,
      amount: data.total,
      type: "income",
      category: "Заказы",
    });
  }
};
```

### Пример 3: Отправка сообщения сотруднику

```javascript
const sendMessage = async (recipientId, content) => {
  const { data, error } = await supabase
    .from("internal_messages")
    .insert({
      sender_id: currentUser.id,
      recipient_id: recipientId,
      content: content,
      read: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Real-time updated automatically via subscription
  
  // Notify recipient
  toast.success("Сообщение отправлено");
};

// В компоненте слушаем изменения:
supabase
  .channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'internal_messages' },
    (payload) => {
      if (payload.new.recipient_id === currentUser.id) {
        setMessages(prev => [payload.new, ...prev]);
      }
    }
  )
  .subscribe();
```

## Производительность

### Индексы (автоматические)

```sql
-- Для быстрого поиска:
INDEX: bookings(owner_id)
INDEX: finance_entries(owner_id, created_at DESC)
INDEX: orders(status)
INDEX: warehouse_products(category)
INDEX: assigned_tasks(assignee_id, status)
```

### Кэширование на фронте

```typescript
// React Query кэширует запросы
const useFinance = () => {
  return useQuery(['finance'], () => 
    supabase.from("finance_entries").select("*")
  );
};

// Кэш обновляется:
// - Автоматически через 5 минут
// - При изменении данных (invalidation)
// - Вручную: queryClient.invalidateQueries(['finance'])
```

## Экспорт данных

### CSV экспорт

```javascript
// Все финансовые данные → CSV
const exportFinance = () => {
  const rows = [
    ["Категория", "Тип", "Сумма"],
    ...entries.map(e => [e.name, e.type, e.amount])
  ];
  const csv = rows.map(r => r.join(",")).join("\n");
  downloadFile(csv, "finance.csv");
};
```

### PDF / HTML экспорт

```javascript
// Документы → PDF (через браузер)
window.print();
// Выбрать "Сохранить как PDF"
```

## Резервные копии

### Автоматические бэкапы Supabase

Суpabase создает ежедневные автоматические резервные копии:
- Доступны на Dashboard
- Восстановление за несколько кликов
- Сохраняются 7 дней (на платных планах)

## Что дальше

1. **Включить Groq API** для AI-ассистента
2. **Настроить логирование** для аудита
3. **Добавить webhook'и** для интеграций
4. **Настроить backup стратегию** для production
5. **Мониторить производительность** базы данных
