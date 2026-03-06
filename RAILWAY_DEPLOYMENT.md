# 🚀 Развертывание CRM на Railway

## Предварительные требования

1. **GitHub аккаунт** - для связи репозитория
2. **Railway аккаунт** - https://railway.app
3. **Groq API ключ** (опционально) - https://console.groq.com

## Шаг 1: Подготовка репозитория

### 1.1 Инициализация Git
```bash
cd "c:\Users\palev\Desktop\crm 2st"
git init
git add .
git commit -m "Initial commit: CRM application"
```

### 1.2 Создание GitHub репозитория
- Создайте новый репозиторий на GitHub (например, `crm-2st`)
- Скопируйте URL репозитория

### 1.3 Push в GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/crm-2st.git
git branch -M main
git push -u origin main
```

## Шаг 2: Настройка на Railway

### 2.1 Создание проекта на Railway
1. Откройте https://railway.app
2. Нажмите "New Project"
3. Выберите "GitHub Repo"
4. Авторизуйте GitHub (если нужно)
5. Выберите репозиторий `crm-2st`

### 2.2 Настройка конфигурации
Railroad автоматически обнаружит Vite проект.

**Важно:** Переопределите стартовую команду:
- Выберите "Deploy" → "Settings"
- Start Command: `npm run preview`
- Build Command: `npm run build`

### 2.3 Добавление переменных окружения
1. В Railroad перейдите на вкладку "Variables"
2. Добавьте переменные:

```
VITE_SUPABASE_URL=https://ftxcwnhtdyuqjrfsrswm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eGN3bmh0ZHl1cWpyZnNyc3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDM3MzEsImV4cCI6MjA4ODMxOTczMX0.K6wk8XPPalgTt-NXG8N5UAxKhf3HRJC8I5vdEFvajXQ
VITE_SUPABASE_PROJECT_ID=ftxcwnhtdyuqjrfsrswm
GROQ_API_KEY=ваш_ключ_groq (опционально)
NODE_ENV=production
```

## Шаг 3: Развертывание Supabase функций

Если используете Railway для функций Supabase:

### 3.1 Установка Supabase CLI
```bash
npm install -g @supabase/cli
```

### 3.2 Линк к проекту
```bash
supabase link --project-ref ftxcwnhtdyuqjrfsrswm
```

### 3.3 Развертывание функций
```bash
supabase functions deploy ai-chat --project-ref ftxcwnhtdyuqjrfsrswm
supabase functions deploy seed-demo --project-ref ftxcwnhtdyuqjrfsrswm
```

## Шаг 4: Получение Groq API ключа (опционально, для AI-ассистента)

1. Откройте https://console.groq.com
2. Зарегистрируйтесь или войдите
3. Создайте новый API ключ
4. Скопируйте ключ и добавьте его в переменные Railway (GROQ_API_KEY)

## Шаг 5: Проверка развертывания

1. Railroad покажет URL вроде: `https://crm-2st-production.railway.app`
2. Откройте URL в браузере
3. Протестируйте функции:
   - Демо-вход (Demo Login)
   - ИИ-ассистент
   - Создание записей
   - Сохранение в Supabase

## Решение проблем

### Ошибка: "Cannot find module"
```bash
npm install
npm run build
```

### Ошибка: "ENOENT: no such file"
- Убедитесь, что все файлы коммичены в Git
- Перепушьте: `git push -u origin main`

### ИИ-ассистент не работает
- Проверьте GROQ_API_KEY в переменных Railroad
- Если нет - функция работает в режиме fallback

### Supabase функции не вызываются
- Убедитесь, что функции развернуты
- Проверьте URL функции в AIAssistant.tsx
- Используйте CORS headers

## Автоматические развертывания

Когда вы пушите в `main`:
1. GitHub отправляет webhook на Railway
2. Railway автоматически запускает:
   - `npm install`
   - `npm run build`
   - `npm run preview`
3. Новая версия развертывается в течение 2-5 минут

## Масштабирование

### Если приложение медленное:
- На Railway: Увеличьте "Resources" (CPU, Memory)
- На Supabase: Upgrade план если необходимо

### Если много пользователей:
```json
{
  "numReplicas": 3  // Используйте несколько инстансов
}
```

## Мониторинг

Railway предоставляет:
- Логи: вкладка "Deployments"
- Метрики: вкладка "Analytics"
- Статус: https://status.railway.app

## Полезные ссылки

- Railroad Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Groq API: https://console.groq.com
- GitHub Actions: https://github.com/features/actions
