import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "gsk_test_key"; // Fallback для тестирования

    let contextBlock = "";
    if (context) {
      const sections: string[] = [];
      if (context.orders?.length) {
        sections.push(`## Заказы (${context.orders.length})\n${context.orders.map((o: any) => `- №${o.order_number}: ${o.client_name}, ${o.total}₽, статус: ${o.status}, менеджер: ${o.manager || '—'}`).join("\n")}`);
      }
      if (context.tasks?.length) {
        sections.push(`## Задачи (${context.tasks.length})\n${context.tasks.map((t: any) => `- "${t.title}" — приоритет: ${t.priority}, статус: ${t.status}, дедлайн: ${t.due_date || 'нет'}`).join("\n")}`);
      }
      if (context.finance) {
        sections.push(`## Финансы\n- Доход: ${context.finance.totalIncome}₽\n- Расход: ${context.finance.totalExpense}₽\n- Прибыль: ${context.finance.profit}₽\n- Записей: ${context.finance.count}`);
      }
      if (context.bookings?.length) {
        sections.push(`## Записи клиентов (${context.bookings.length})\n${context.bookings.map((b: any) => `- ${b.client_name}: ${b.service}, ${b.booking_date}, статус: ${b.status}`).join("\n")}`);
      }
      if (context.products?.length) {
        sections.push(`## Склад (${context.products.length} товаров)\n${context.products.map((p: any) => `- ${p.name} (${p.sku}): ${p.qty} шт., мин: ${p.min_qty}, цена: ${p.price}₽`).join("\n")}`);
      }
      if (context.documents?.length) {
        sections.push(`## Документы (${context.documents.length})\n${context.documents.map((d: any) => `- ${d.name}: тип ${d.doc_type}, статус: ${d.status}, сумма: ${d.amount}₽`).join("\n")}`);
      }
      if (context.campaigns?.length) {
        sections.push(`## Рассылки (${context.campaigns.length})\n${context.campaigns.map((c: any) => `- "${c.name}": статус ${c.status}, отправлено: ${c.sent_count}`).join("\n")}`);
      }
      if (context.subscriptions?.length) {
        sections.push(`## Подписки (${context.subscriptions.length})\n${context.subscriptions.map((s: any) => `- ${s.client_name}: план ${s.plan}, ${s.amount}₽/мес, статус: ${s.status}`).join("\n")}`);
      }
      if (context.team?.length) {
        sections.push(`## Команда (${context.team.length})\n${context.team.map((m: any) => `- ${m.full_name}: роль ${m.role}`).join("\n")}`);
      }
      if (sections.length) contextBlock = `\n\n--- АКТУАЛЬНЫЕ ДАННЫЕ CRM ---\n${sections.join("\n\n")}`;
    }

    const systemPrompt = `Ты — ИИ-ассистент CRM-системы "CRM Pro". Ты полностью интегрирован в систему и имеешь доступ к актуальным данным.

Твои возможности:
- Отвечать на вопросы о текущих заказах, задачах, финансах, складе, документах, подписках, рассылках и команде
- Анализировать данные и давать рекомендации
- Помогать с планированием и приоритизацией задач
- Объяснять как пользоваться модулями CRM
- Давать советы по продажам и работе с клиентами

Правила:
- Отвечай кратко и по делу на русском языке
- Используй markdown для форматирования
- Когда ссылаешься на данные — указывай конкретные цифры
- Если данных нет — скажи об этом честно${contextBlock}`;

    // Try Groq API if key is configured
    let response: Response | null = null;
    
    const hasValidKey = GROQ_API_KEY && !GROQ_API_KEY.startsWith("gsk_test");
    
    if (hasValidKey) {
      try {
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mixtral-8x7b-32768",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages,
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          console.error(`Groq API error: ${status}`);
          response = null; // Fall back to local response
        }
      } catch (e) {
        console.error("Groq API fetch error:", e);
        response = null; // Fall back to local response
      }
    }

    // If no valid API or API failed, use local context-based response
    if (!response) {
      const lastMessage = messages[messages.length - 1];
      const userQuery = lastMessage?.content?.toLowerCase() || "";
      
      let answer = "";
      
      // Intelligent context-based responses
      if (context) {
        if (userQuery.includes("заказ") || userQuery.includes("order")) {
          const orders = context.orders || [];
          if (orders.length > 0) {
            answer = `**Активные заказы:** ${orders.length}\n\n`;
            const active = orders.filter((o: any) => o.status === "В работе");
            if (active.length) answer += `📋 **В работе:** ${active.length} заказов\n`;
            const completed = orders.filter((o: any) => o.status === "Завершён");
            if (completed.length) answer += `✅ **Завершено:** ${completed.length} заказов\n`;
            answer += `\n💰 **Общая стоимость:** ₽${orders.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0).toLocaleString("ru-RU")}`;
          } else {
            answer = "Нет заказов в системе.";
          }
        } else if (userQuery.includes("финан") || userQuery.includes("доход") || userQuery.includes("расход")) {
          const finance = context.finance || {};
          answer = `**Финансовая сводка:**\n\n`;
          answer += `💰 **Доход:** ₽${(finance.totalIncome || 0).toLocaleString("ru-RU")}\n`;
          answer += `💸 **Расход:** ₽${(finance.totalExpense || 0).toLocaleString("ru-RU")}\n`;
          answer += `📈 **Прибыль:** ₽${(finance.profit || 0).toLocaleString("ru-RU")}`;
        } else if (userQuery.includes("задач") || userQuery.includes("task")) {
          const tasks = context.tasks || [];
          answer = `**Управление задачами:** ${tasks.length} задач\n\n`;
          const todo = tasks.filter((t: any) => t.status === "todo");
          const inProgress = tasks.filter((t: any) => t.status === "in_progress");
          const done = tasks.filter((t: any) => t.status === "done");
          if (todo.length) answer += `⏳ **К выполнению:** ${todo.length}\n`;
          if (inProgress.length) answer += `⚙️ **В работе:** ${inProgress.length}\n`;
          if (done.length) answer += `✅ **Выполнено:** ${done.length}\n`;
          const high = tasks.filter((t: any) => t.priority === "high");
          if (high.length) answer += `\n🔴 **Высокий приоритет:** ${high.length}`;
        } else if (userQuery.includes("склад") || userQuery.includes("товар")) {
          const products = context.products || [];
          answer = `**Инвентарь:** ${products.length} товаров\n\n`;
          const lowStock = products.filter((p: any) => p.min_qty > 0 && p.qty <= p.min_qty);
          answer += `📦 **Общее количество:** ${products.reduce((s: number, p: any) => s + (Number(p.qty) || 0), 0)} единиц\n`;
          if (lowStock.length) answer += `⚠️ **Низкий остаток:** ${lowStock.length} товаров\n`;
          answer += `💵 **Общая стоимость:** ₽${products.reduce((s: number, p: any) => s + (Number(p.qty) * Number(p.price) || 0), 0).toLocaleString("ru-RU")}`;
        } else if (userQuery.includes("запис") || userQuery.includes("booking")) {
          const bookings = context.bookings || [];
          answer = `**Записи клиентов:** ${bookings.length} записей\n\n`;
          const pending = bookings.filter((b: any) => b.status === "pending");
          const confirmed = bookings.filter((b: any) => b.status === "confirmed");
          if (pending.length) answer += `⏳ **Ожидают подтверждения:** ${pending.length}\n`;
          if (confirmed.length) answer += `✅ **Подтверждено:** ${confirmed.length}`;
        } else if (userQuery.includes("документ")) {
          const docs = context.documents || [];
          answer = `**Документы:** ${docs.length} документов\n\n`;
          const draft = docs.filter((d: any) => d.status === "Черновик");
          const signed = docs.filter((d: any) => d.status === "Подписан");
          if (draft.length) answer += `📝 **Черновики:** ${draft.length}\n`;
          if (signed.length) answer += `✅ **Подписано:** ${signed.length}`;
        } else {
          answer = `**Статус CRM:**\n\n`;
          answer += `📊 Заказов: ${context.orders?.length || 0}\n`;
          answer += `📋 Задач: ${context.tasks?.length || 0}\n`;
          answer += `💰 Записей в финансах: ${context.finance?.count || 0}\n`;
          answer += `📅 Записей клиентов: ${context.bookings?.length || 0}\n`;
          answer += `📦 Товаров на складе: ${context.products?.length || 0}\n`;
          answer += `📄 Документов: ${context.documents?.length || 0}\n\n`;
          answer += `💡 Задайте вопрос о заказах, финансах, задачах, складе, записях или документах.`;
        }
      } else {
        answer = "Не удалось загрузить контекст CRM. Попробуйте еще раз.";
      }

      // Stream the local response
      let result = answer;
      const chunks: string[] = [];
      for (let i = 0; i < result.length; i += 30) {
        chunks.push(result.substring(i, i + 30));
      }

      const encoder = new TextEncoder();
      const body = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            const event = `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
