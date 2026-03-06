# 🌐 Интеграция Вебсайта с CRM (Web Leads)

Этот гайд показывает как настроить автоматический сбор заявок с вашего сайта прямо в CRM систему.

## ✨ Что это дает

- ✅ **Автоматический сбор** — все заявки с сайта приходят прямо в CRM
- ✅ **Не требует логирования** — клиент может заполнить форму без регистрации
- ✅ **Трекинг** — видно откуда пришла заявка, IP адрес, source
- ✅ **Автоматическое создание заказов** — заявка сразу становится ордером
- ✅ **Защита от спама** — webhook token защищает от несанкционированных запросов

## 🚀 Быстрый старт (5 минут)

### Шаг 1: Сгенерировать webhook token в CRM

1. Откройте вкладку **"Sites"** в CRM
2. Выберите сайт или добавьте новый
3. Нажмите кнопку **"🔗 Получить код интеграции"** (будет добавлена в следующем обновлении)
4. Скопируйте **Webhook URL** и **Webhook Token**

Пример:
```
Webhook URL: https://ftxcwnhtdyuqjrfsrswm.supabase.co/functions/v1/web-leads-webhook
Webhook Token: sk_live_xxxxxxxxxxxxxxxxxxxxx
```

### Шаг 2: Скопировать HTML форму на сайт

1. Откройте файл `website-form-template.html` из архива проекта
2. Найдите секцию конфигурации в конце файла:

```javascript
const CONFIG = {
    WEBHOOK_URL: 'https://YOUR_SUPABASE_URL/functions/v1/web-leads-webhook',
    WEBHOOK_TOKEN: 'YOUR_WEBHOOK_TOKEN_HERE',
};
```

3. **Замените значения:**
   - `WEBHOOK_URL` → вставьте URL из Шага 1
   - `WEBHOOK_TOKEN` → вставьте Token из Шага 1

4. **Скопируйте весь HTML код**

5. На вебсайте вставьте этот код в нужное место (в виде полной страницы или как iframe)

### Шаг 3: Тестирование

1. Откройте страницу с формой в браузере
2. Заполните форму и отправьте
3. Проверьте в CRM → **Web Leads** → должна появиться заявка
4. Готово! 🎉

---

## 📝 Варианты интеграции

### Вариант 1: Полная страница (РЕКОМЕНДУЕТСЯ)

Просто скопируйте весь `website-form-template.html` файл на сайт как отдельную страницу:

```
https://your-site.com/contact.html
```

**Плюсы:**
- Просто
- Красиво работает
- Полный контроль

### Вариант 2: Встроить как iframe

```html
<iframe 
  src="https://your-site.com/contact.html" 
  style="width: 100%; height: 600px; border: none; border-radius: 8px;"
></iframe>
```

### Вариант 3: Добавить в существующую форму

Если у вас уже есть форма, добавьте этот код в обработчик отправки:

```javascript
// Получить значения из вашей формы
const formData = {
    client_name: document.querySelector('#name').value,
    client_email: document.querySelector('#email').value,
    client_phone: document.querySelector('#phone').value,
    message: document.querySelector('#message').value,
    page_url: window.location.href,
    referrer: document.referrer,
};

// Отправить на webhook
fetch('https://ftxcwnhtdyuqjrfsrswm.supabase.co/functions/v1/web-leads-webhook', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-webhook-token': 'YOUR_WEBHOOK_TOKEN_HERE',
    },
    body: JSON.stringify(formData),
})
.then(r => r.json())
.then(data => {
    if (data.success) {
        console.log('✅ Заявка отправлена!', data.lead_id);
    } else {
        console.error('❌ Ошибка:', data.error);
    }
});
```

---

## 🔒 Безопасность

### Webhook Token
- Это уникальный ключ доступа к вашему webhook
- **НЕ ДЕЛИТЕСЬ** с посторонними
- Если забыли - можно заново сгенерировать в CRM

### CORS / HTTPS
- Webhook URL работает через HTTPS
- Форма может быть на любом домене (включая localhost для тестирования)
- Если у вас есть CORS ошибки - это нормально, браузер их блокирует но запрос все равно идет

### Rate Limiting
- По умолчанию лимит 30 запросов в минуту (защита от спама)
- Если надо больше - свяжитесь с поддержкой

---

## 📊 Где видеть заявки в CRM

### Вкладка "Web Leads"
1. Откройте CRM
2. Найдите новую вкладку **"Web Leads"** (в разработке)
3. Там видно все заявки с вебсайтов

### Вкладка "Orders"  
- Если установлена опция `auto_create_order: true`
- Заявка автоматически создается как новый заказ

---

## 🔧 Расширенная конфигурация

### Отправка дополнительных полей

Если нужны свои поля в форме, добавьте в HTML:

```html
<div class="form-group">
    <label for="service">Тип услуги</label>
    <input type="text" id="service" name="service">
</div>
```

И в JavaScript они автоматически будут включены в `form_data`.

### Отключить автоматическое создание заказа

Измените в JavaScript:

```javascript
auto_create_order: false  // По умолчанию true
```

### Кастомные действия после отправки

```javascript
form.addEventListener('submit', async (e) => {
    // ... код отправки ...
    
    if (response.ok) {
        // Кастомное действие
        window.location.href = '/thank-you.html';
        // или
        // showCustomPopup();
    }
});
```

---

## ❌ Troubleshooting

### Форма отправляется но заявка не появляется

**Проверьте:**
1. ✅ WEBHOOK_TOKEN правильный (не пробелы в начале/конце)
2. ✅ WEBHOOK_URL правильный
3. ✅ Webhook включен в CRM (Settings → Webhooks)
4. ✅ Supabase функция `web-leads-webhook` развернута

**В браузере консоль (F12):**
```javascript
// Проверьте что запрос отправляется
// Network вкладка → найдите POST запрос на webhook
// Должен быть статус 200 и ответ {"success": true}
```

### "Invalid webhook token" ошибка

```
❌ Ошибка: Invalid webhook token
```

**Решение:**
1. Скопируйте token еще раз из CRM
2. Убедитесь что нет пробелов: `'YOUR_TOKEN'` не `'YOUR_TOKEN '`
3. Если забыли - сгенерируйте новый в CRM

### "Missing required field" ошибка

```
❌ Ошибка: Missing required field: client_name
```

**Решение:**
- Пользователь должен заполнить обязательное поле (имя, email, сообщение)
- Проверьте что в форме есть поле `name="client_name"`

### CORS ошибки в консоли

```
Cross-Origin Request Blocked (but request still works)
```

Это нормально! CORS работает так:
- Браузер блокирует в консоли для безопасности
- Но на сервере запрос успешно обработан
- Заявка будет создана несмотря на сообщение об ошибке

---

## 📈 Аналитика

**В таблице `web_leads` сохраняется:**
- `page_url` — с какой страницы пришла
- `referrer` — откуда пришел (Google, Facebook и т.д.)
- `user_agent` — какой браузер использовал
- `ip_address` — IP адрес клиента
- `created_at` — когда пришла заявка

Используйте эти данные для анализа эффективности каналов.

---

## 📞 Поддержка

Проблемы или вопросы?

1. Проверьте этот гайд еще раз
2. Посмотрите логи в CRM
3. Проверьте консоль браузера (F12 → Console)
4. Свяжитесь с поддержкой

---

## 🎯 Что дальше

После настройки можно:

1. **Кастомизировать форму** — поменять цвета, поля, текст
2. **Автоматизировать** — отправлять email уведомления при новой заявке
3. **Интегрировать с другим софтом** — Telegram, Slack, WhatsApp
4. **Анализировать** — статистика по источникам, конверсия

---

**Версия:** 1.0  
**Последнее обновление:** 2026-03-07  
**Статус:** Production Ready ✅
