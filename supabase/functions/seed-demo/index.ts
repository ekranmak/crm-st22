import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@test.com";
const DEMO_PASSWORD = "demo123456";
const DEMO_NAME = "Демо Руководитель";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if demo user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    let demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: DEMO_NAME, role: "manager", app_role: "manager" },
      });
      if (error) throw error;
      demoUser = data.user;
    }

    const userId = demoUser!.id;

    // Check if data already seeded
    const { count } = await admin.from("orders").select("*", { count: "exact", head: true }).eq("owner_id", userId);
    if (count && count > 0) {
      return new Response(JSON.stringify({ success: true, message: "Demo already seeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed orders
    await admin.from("orders").insert([
      { owner_id: userId, client_name: "ООО Альфа Технологии", order_number: "ORD-001", items: "Веб-разработка, SEO", total: 285000, status: "В работе", manager: "Иванов А.С.", client_email: "alpha@tech.ru", client_phone: "+7 (495) 123-45-67" },
      { owner_id: userId, client_name: "ИП Смирнова Е.В.", order_number: "ORD-002", items: "Дизайн логотипа, Брендбук", total: 95000, status: "Завершён", manager: "Петрова К.И.", client_email: "smirnova@mail.ru", client_phone: "+7 (916) 234-56-78" },
      { owner_id: userId, client_name: "Компания БетаСтрой", order_number: "ORD-003", items: "Мобильное приложение", total: 520000, status: "Новый", manager: "Козлов Д.В.", client_email: "info@betastroy.ru", client_phone: "+7 (495) 345-67-89" },
      { owner_id: userId, client_name: "Ресторан Вкусно", order_number: "ORD-004", items: "Сайт-визитка, Меню онлайн", total: 65000, status: "В работе", manager: "Иванов А.С.", client_email: "vkusno@rest.ru", client_phone: "+7 (903) 456-78-90" },
      { owner_id: userId, client_name: "МедЦентр Здоровье+", order_number: "ORD-005", items: "CRM интеграция, Автоматизация", total: 340000, status: "Оплачен", manager: "Петрова К.И.", client_email: "med@zdorovie.ru", client_phone: "+7 (495) 567-89-01" },
    ]);

    // Seed finance
    await admin.from("finance_entries").insert([
      { owner_id: userId, name: "Оплата от Альфа Технологии", amount: 142500, type: "income", category: "Услуги" },
      { owner_id: userId, name: "Зарплата команде", amount: 450000, type: "expense", category: "ФОТ" },
      { owner_id: userId, name: "Оплата от Смирновой Е.В.", amount: 95000, type: "income", category: "Дизайн" },
      { owner_id: userId, name: "Аренда офиса", amount: 85000, type: "expense", category: "Офис" },
      { owner_id: userId, name: "Предоплата БетаСтрой", amount: 260000, type: "income", category: "Разработка" },
      { owner_id: userId, name: "Серверы и хостинг", amount: 12000, type: "expense", category: "Инфраструктура" },
      { owner_id: userId, name: "Реклама Яндекс.Директ", amount: 45000, type: "expense", category: "Маркетинг" },
      { owner_id: userId, name: "Оплата МедЦентр", amount: 170000, type: "income", category: "Автоматизация" },
    ]);

    // Seed warehouse
    await admin.from("warehouse_products").insert([
      { owner_id: userId, name: "Ноутбук MacBook Pro 14", sku: "MBP-14-001", category: "Техника", qty: 5, min_qty: 2, price: 189990 },
      { owner_id: userId, name: "Монитор Dell 27\" 4K", sku: "DELL-27-4K", category: "Техника", qty: 8, min_qty: 3, price: 45990 },
      { owner_id: userId, name: "Клавиатура Logitech MX", sku: "LOG-MX-K", category: "Периферия", qty: 15, min_qty: 5, price: 8990 },
      { owner_id: userId, name: "Мышь Apple Magic", sku: "APL-MM-2", category: "Периферия", qty: 12, min_qty: 4, price: 7490 },
      { owner_id: userId, name: "Бумага А4 (пачка)", sku: "PAP-A4-500", category: "Канцелярия", qty: 3, min_qty: 10, price: 450 },
    ]);

    // Seed bookings
    const now = new Date();
    await admin.from("bookings").insert([
      { owner_id: userId, client_name: "Николай Волков", service: "Консультация по SEO", phone: "+7 (915) 111-22-33", status: "confirmed", booking_date: new Date(now.getTime() + 86400000).toISOString() },
      { owner_id: userId, client_name: "Анна Крылова", service: "Презентация продукта", phone: "+7 (926) 222-33-44", status: "pending", booking_date: new Date(now.getTime() + 172800000).toISOString() },
      { owner_id: userId, client_name: "Сергей Морозов", service: "Обсуждение проекта", phone: "+7 (903) 333-44-55", status: "confirmed", booking_date: new Date(now.getTime() + 259200000).toISOString() },
    ]);

    // Seed subscriptions
    await admin.from("subscriptions").insert([
      { owner_id: userId, client_name: "ООО Альфа Технологии", plan: "Премиум", amount: 15000, status: "active", client_email: "alpha@tech.ru", payment_method: "Карта", auto_renew: true, total_paid: 90000 },
      { owner_id: userId, client_name: "ИП Смирнова Е.В.", plan: "Стандарт", amount: 5000, status: "active", client_email: "smirnova@mail.ru", payment_method: "Счёт", auto_renew: true, total_paid: 25000 },
      { owner_id: userId, client_name: "Ресторан Вкусно", plan: "Базовый", amount: 2000, status: "paused", client_email: "vkusno@rest.ru", payment_method: "Карта", auto_renew: false, total_paid: 8000 },
    ]);

    // Seed documents
    await admin.from("documents").insert([
      { owner_id: userId, name: "Договор с Альфа Технологии", doc_type: "Договор", counterparty: "ООО Альфа Технологии", amount: 285000, status: "Подписан", content: "Договор на разработку веб-приложения" },
      { owner_id: userId, name: "Счёт №142", doc_type: "Счёт", counterparty: "ИП Смирнова Е.В.", amount: 95000, status: "Оплачен", content: "Счёт за дизайн-услуги" },
      { owner_id: userId, name: "Акт выполненных работ", doc_type: "Акт", counterparty: "МедЦентр Здоровье+", amount: 170000, status: "Черновик", content: "Акт за первый этап интеграции CRM" },
    ]);

    // Seed call logs
    await admin.from("call_logs").insert([
      { owner_id: userId, contact_name: "Волков Н.А.", phone: "+7 (915) 111-22-33", call_type: "outgoing", duration: "5:32", notes: "Обсудили план SEO" },
      { owner_id: userId, contact_name: "Крылова А.С.", phone: "+7 (926) 222-33-44", call_type: "incoming", duration: "12:05", notes: "Запрос на презентацию" },
      { owner_id: userId, contact_name: "Морозов С.В.", phone: "+7 (903) 333-44-55", call_type: "outgoing", duration: "3:18", notes: "Подтверждение встречи" },
      { owner_id: userId, contact_name: "Альфа Технологии", phone: "+7 (495) 123-45-67", call_type: "incoming", duration: "8:45", notes: "Доп. требования к проекту" },
    ]);

    // Seed email campaigns
    await admin.from("email_campaigns").insert([
      { owner_id: userId, name: "Новогодняя акция 2026", subject: "🎄 Скидка 20% на все услуги!", body: "Уважаемые клиенты! До 31 декабря скидка 20%.", segment: "all", channel: "email", status: "sent", sent_count: 245, opened_count: 132, clicked_count: 47 },
      { owner_id: userId, name: "Обновление продукта", subject: "Новые возможности CRM", body: "Представляем новый модуль аналитики.", segment: "premium", channel: "email", status: "draft", sent_count: 0, opened_count: 0, clicked_count: 0 },
    ]);

    // Seed sites
    await admin.from("sites").insert([
      { owner_id: userId, name: "Корпоративный сайт", url: "https://alpha-tech.ru", status: "active", ssl: true, mobile: true, speed: 92, uptime: 99.8, visitors: 3420, pages: 15 },
      { owner_id: userId, name: "Интернет-магазин", url: "https://shop.betastroy.ru", status: "active", ssl: true, mobile: true, speed: 78, uptime: 99.2, visitors: 8540, pages: 156 },
      { owner_id: userId, name: "Лендинг акция", url: "https://promo.vkusno.ru", status: "warning", ssl: false, mobile: false, speed: 45, uptime: 95.1, visitors: 620, pages: 1 },
    ]);

    return new Response(JSON.stringify({ success: true, message: "Demo data seeded" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
