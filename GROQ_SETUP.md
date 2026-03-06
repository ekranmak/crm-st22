# 🤖 Настройка AI Ассистента (Groq API)

## 📋 Что выбежиходит установка

- **Локально (без API)**: AI работает в режиме fallback (анализирует данные CRM)
- **С Groq API**: AI дает умные ответы от Mixtral-8x7B (мощная модель)
- **На Railway**: AI работает в production с настойчивостью

## Шаг 1: Получение Groq API ключа (бесплатно)

### 1.1 Регистрация

1. Откройте https://console.groq.com
2. Кликнете "Sign Up" или "Sign In"
3. Используйте Google, GitHub, или Email
4. Заполните профиль

### 1.2 Создание API ключа

1. На Dashboard перейдите в "API Keys"
2. Кликнете "Create API Key"
3. Назовите его "crm-ai" или любое имя
4. **Скопируйте ключ** (он больше не будет видим!)
5. Сохраните в безопасном месте

**Пример ключа:**
```
gsk_2nWmTWskj4vL3nZ5m9qK2bXpYrL8hN0Zq4v2X1RsJ3K5m
```

### 1.3 Проверка лимитов

Groq дает:
- ✅ **Бесплатно:**
  - 30 запросов в минуту
  - 500 токенов в минуту (примерно 100-150 запросов в день)
  - Модели: mixtral-8x7b, llama2-70b, и другие

- 💳 **Платно:**
  - Неограниченные запросы
  - $0.27 за миллион токенов

## Шаг 2: Локальная настройка (для разработки)

### 2.1 Обновите .env файл

```bash
cd "c:\Users\palev\Desktop\crm 2st"
```

Отредактируйте `.env`:

```env
VITE_SUPABASE_URL="https://ftxcwnhtdyuqjrfsrswm.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eGN3bmh0ZHl1cWpyZnNyc3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDM3MzEsImV4cCI6MjA4ODMxOTczMX0.K6wk8XPPalgTt-NXG8N5UAxKhf3HRJC8I5vdEFvajXQ"
VITE_SUPABASE_PROJECT_ID="ftxcwnhtdyuqjrfsrswm"

# Новое: Добавьте Groq API ключ
GROQ_API_KEY="gsk_2nWmTWskj4vL3nZ5m9qK2bXpYrL8hN0Zq4v2X1RsJ3K5m"
```

### 2.2 Перезагрузите приложение

```bash
# Остановите текущий процесс (Ctrl+C)
npm run dev
```

### 2.3 Тестируйте AI

1. Откройте http://localhost:8080/ai
2. Нажмите "Demo Login"
3. Спросите AI: "Сколько у нас заказов?"
4. AI должна ответить на основе данных

## Шаг 3: Развертывание на Railway

### 3.1 Добавление Groq ключа в Railway

На странице Railway проекта:

1. **Settings** → **Variables**
2. Добавьте новую переменную:

```
Name: GROQ_API_KEY
Value: gsk_2nWmTWskj4vL3nZ5m9qK2bXpYrL8hN0Zq4v2X1RsJ3K5m
```

3. Нажмите "Save"

### 3.2 Переразвертывание

1. **Deployments** → последний deploy
2. Нажмите кнопку "Redeploy" (или просто пушьте в GitHub)

### 3.3 Проверка

1. Откройте вашу Railway URL (е.г. `https://crm-2st-production.railway.app`)
2. Нажмите "Demo Login"
3. Перейдите на /ai
4. Спросите AI вопрос
5. Проверьте логи на Railway

## Шаг 4: Развертывание Supabase функций

Если вы развертываете функции на Railway:

### 4.1 Установка Supabase CLI

```bash
npm install -g @supabase/cli
```

### 4.2 Линк к проекту

```bash
supabase link --project-ref ftxcwnhtdyuqjrfsrswm
```

(Введите пароль от Supabase аккаунта)

### 4.3 Установка переменных

```bash
supabase secrets set GROQ_API_KEY=gsk_2nWmTWskj4vL3nZ5m9qK2bXpYrL8hN0Zq4v2X1RsJ3K5m
```

### 4.4 Развертывание функций

```bash
# Развернуть ai-chat функцию
supabase functions deploy ai-chat

# Развернуть seed-demo функцию
supabase functions deploy seed-demo
```

## Шаг 5: Тестирование

### 5.1 Локально

```bash
curl -X POST http://localhost:54321/functions/v1/ai-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Сколько заказов?"}],
    "context": {"orders": []}
  }'
```

### 5.2 На Railway

```bash
curl -X POST https://your-crm-url.railway.app/api/ai-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Сколько заказов?"}],
    "context": {"orders": []}
  }'
```

## Решение проблем

### Ошибка: "AI Gateway error: 401"

**Причина:** GROQ_API_KEY неправильный или отсутствует

**Решение:**
```bash
# Проверьте в Groq console что ключ скопирован правильно
# Убедитесь что ключ начинается с "gsk_"
# Переновите на Railway variables
```

### Ошибка: "429 Too Many Requests"

**Причина:** Превышен лимит Groq

**Решение:**
- Подождите 60 секунд
- Используйте платный план Groq
- AI будет работать в fallback режиме (из контекста CRM)

### Ошибка: "Cannot find module '@supabase/supabase-js'"

**Решение:**
```bash
cd supabase/functions/ai-chat
npm install
```

### AI не отвечает

**Проверьте:**
1. ✅ GROQ_API_KEY установлен
2. ✅ Функция развернута: `supabase functions list`
3. ✅ URL функции правильный
4. ✅ Auth токен валидный
5. ✅ Контекст загружается (покажут данные в UI)

## Модели Groq

### Доступные модели (бесплатно)

```
mixtral-8x7b-32768      // Лучшее соотношение скорость/качество
llama2-70b-4096         // Мощнее, но медленнее
gemma-7b-it             // Компактная, быстрая
```

**Рекомендация:** Используем `mixtral-8x7b-32768` (по умолчанию)

### Изменение модели

Если хотите другую модель, в `ai-chat/index.ts`:

```typescript
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  body: JSON.stringify({
    model: "llama2-70b-4096",  // ← Измените здесь
    // ...
  }),
});
```

## Оптимизация

### Для экономии токенов

```typescript
// Ограничить контекст
const answer = context.orders?.slice(0, 10);  // Только 10 последних
const answer = context.products?.slice(0, 20);  // Только 20 товаров
```

### Для быстроты

```typescript
max_tokens: 512,       // Короче ответы
temperature: 0.3,      // Более детерминированные
top_p: 0.8,            // Узкий выбор токенов
```

## Безопасность

### Никогда не:
- ❌ Не коммитьте API ключ в GitHub
- ❌ Не показывайте ключ в браузере (используйте backend)
- ❌ Не используйте один ключ для всех

### Лучшие практики:
- ✅ Храните ключ в `.env` (не коммитьте)
- ✅ Используйте Supabase функции (server-side)
- ✅ Ротируйте ключи каждый месяц
- ✅ Используйте environment variables на Railway

## Лимиты и расходы

### Бесплатный план
- 30 запросов/минуту
- 500 токенов/минуту
- Примерно: 100-200 запросов в день максимум

### Платный план (Pay-As-You-Go)
- Неограниченные запросы
- Цена: $0.27 за 1 млн токенов
- Примерно: $1-2 за 1000 запросов

## Что дальше

1. ✅ Включили Groq API
2. ⬜ Настроить рассылку уведомлений
3. ⬜ Добавить логирование AI запросов
4. ⬜ Включить аналитику использования
5. ⬜ Интегрировать с другими LLM (OpenAI, Anthropic)
