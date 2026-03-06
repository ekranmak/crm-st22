# 🚀 QUICKSTART: Развертывание CRM на Railway за 10 минут

## Что вы получите

✅ Полностью рабочий CRM на https://ваш-домен.railway.app  
✅ Все данные синхронизируются с Supabase  
✅ AI-ассистент (с опцией Groq API)  
✅ SSL сертификат (автоматически)  
✅ Глобальная CDN (быстрая загрузка)  

---

## 📋 Предварительные требования

- ✅ GitHub аккаунт
- ✅ Railway аккаунт (https://railway.app)
- ✅ Этот репозиторий на GitHub

---

## Шаг 1: Подготовка Git репозитория (2 мин)

### На вашем компьютере

```bash
cd "c:\Users\palev\Desktop\crm 2st"

# Инициализируем Git (если еще не сделано)
git init

# Добавляем все файлы
git add .

# Коммитим
git commit -m "Deploy: CRM application v1"

# Добавляем удаленный репозиторий
git remote add origin https://github.com/YOUR_USERNAME/crm-2st.git

# Переименовываем ветку в main
git branch -M main

# Пушим код
git push -u origin main
```

**Результат:** Код загружен на GitHub ✅

---

## Шаг 2: Создание проекта на Railway (2 мин)

### На railway.app

1. **Откройте** https://railway.app/dashboard
2. **Нажмите** "New Project"
3. **Выберите** "Deploy from GitHub"
4. **Авторизуйте** GitHub (если нужно)
5. **Выберите** репозиторий `crm-2st`
6. **Нажмите** "Deploy Now"

**Результат:** Railway начинает деплой ✅

---

## Шаг 3: Настройка переменных окружения (2 мин)

### Пока Railway деплоится:

1. **В Railway перейдите** на вкладку "Variables"
2. **Добавьте переменные:**

Скопируйте и вставьте эти значения:

```
VITE_SUPABASE_URL=https://ftxcwnhtdyuqjrfsrswm.supabase.co

VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eGN3bmh0ZHl1cWpyZnNyc3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDM3MzEsImV4cCI6MjA4ODMxOTczMX0.K6wk8XPPalgTt-NXG8N5UAxKhf3HRJC8I5vdEFvajXQ

VITE_SUPABASE_PROJECT_ID=ftxcwnhtdyuqjrfsrswm

NODE_ENV=production
```

**Опционально** (для AI-ассистента):

```
GROQ_API_KEY=gsk_ВАШ_КЛЮЧ_ИЗ_CONSOLE_GROQ_COM
```

3. **Нажмите** "Save"

**Результат:** Переменные установлены ✅

---

## Шаг 4: Проверка развертывания (2 мин)

### После завершения деплоя

1. **На Railway**: "Deployments" → посмотрите URL
2. **Скопируйте URL** (выглядит как `https://crm-2st-production-xxxxx.railway.app`)
3. **Откройте URL** в браузере
4. **Система должна загрузиться!** ✅

### Первый вход

- Нажмите "Demo Login"
- Используйте demo аккаунт:
  - Email: `demo@test.com`
  - Password: `demo123456`
- Проверьте все модули

**Результат:** CRM работает на Railway ✅

---

## Шаг 5: Настройка пользовательского домена (опционально, 2 мин)

Если хотите собственный домен вроде `crm.yourcompany.com`:

### На Railway

1. **Settings** → **Domains**
2. **Добавьте** собственный домен
3. **Скопируйте** CNAME запись
4. **На вашем хостинге** добавьте CNAME запись
5. **Проверьте** через 5-10 минут

**Результат:** Свой домен работает (опционально) ✅

---

## 🎉 Готово! Ваш CRM в Production

```
✅ Приложение: https://crm-2st-production.railway.app
✅ База данных: Supabase
✅ Функции: Supabase Edge Functions
✅ Аналитика: Railway Dashboard
✅ SSL: Автоматический
```

---

## 📚 Дополнительные ресурсы

- 📖 [Полный гайд развертывания](./RAILWAY_DEPLOYMENT.md)
- 💾 [Архитектура базы данных](./DATA_STORAGE_LOGIC.md)
- 🤖 [Настройка AI ассистента](./GROQ_SETUP.md)
- 🔧 [README проекта](./README.md)

---

## 🚨 Если что-то не работает

### Ошибка: "Cannot find module"

```bash
git push origin main  # Переразверните
```

### Ошибка: "Supabase not connected"

Проверьте переменные окружения на Railway:
```
VITE_SUPABASE_URL ✅
VITE_SUPABASE_PUBLISHABLE_KEY ✅
```

### Логи развертывания

На Railway: **Deployments** → **Logs** → ищите ошибки

### Контакт с поддержкой Railway

- Документация: https://docs.railway.app
- Статус: https://status.railway.app

---

## 💡 Полезные команды после развертывания

### Пересборка приложения

```bash
git push origin main
```
(Railway автоматически переразвернет)

### Проверка логов

На Railway: Deployments → посмотрите логи консоли

### Обновление переменных окружения

На Railway: Variables → измените → сохраните → редеплой

### Масштабирование

На Railway: Resources → увеличьте CPU/Memory

---

## 🔐 Безопасность (важно!)

1. **Никогда** не коммитьте `.env` файл
2. **Защитите** GROQ_API_KEY на Railway
3. **Используйте** strong пароли для Supabase
4. **Включите** 2FA на GitHub и Railway
5. **Регулярно** меняйте пароли

---

## 📊 Мониторинг

Railway предоставляет:
- 📈 **CPU / Memory usage**
- 🌐 **Network traffic**
- 📉 **Deployments history**
- 🔔 **Error alerts**

Всё доступно на Dashboard.

---

## 🎯 Что дальше

1. ✅ CRM развернут на Railway
2. ⬜ Настроить собственный домен
3. ⬜ Включить Groq API для AI
4. ⬜ Пригласить пользователей
5. ⬜ Настроить резервные копии

---

## 📞 Поддержка

Если возникли вопросы:

- **Railway**: https://docs.railway.app
- **Supabase**: https://supabase.com/docs
- **GitHub**: Проверьте Actions → последний workflow

---

**Поздравляем! Ваш CRM теперь в интернете!** 🎉
