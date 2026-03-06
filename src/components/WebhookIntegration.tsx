import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Zap, Code, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookIntegrationProps {
  siteId: string;
  webhookToken: string;
  webhookEnabled: boolean;
  supabaseUrl: string;
  onToggle: (enabled: boolean) => void;
}

export function WebhookIntegration({
  siteId,
  webhookToken,
  webhookEnabled,
  supabaseUrl,
  onToggle,
}: WebhookIntegrationProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const webhookUrl = `${supabaseUrl}/functions/v1/web-leads-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast({ title: `${label} скопирован` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateNewToken = () => {
    // В реальное приложение это будет вызов API
    const newToken = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    copyToClipboard(newToken, "Новый токен");
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-t border-border/30"
    >
      <div className="p-4 space-y-4 bg-secondary/20">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Интеграция для сбора заявок
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={webhookEnabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-xs text-muted-foreground">
              {webhookEnabled ? "Включено" : "Выключено"}
            </span>
          </label>
        </div>

        {webhookEnabled && (
          <>
            <div className="space-y-3 bg-background/50 rounded-lg p-3">
              {/* Webhook URL */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Webhook URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-secondary rounded px-2 py-1.5 text-foreground/70 overflow-auto">
                    {webhookUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                    className="p-1.5 hover:bg-secondary rounded transition-colors"
                  >
                    {copiedField === "Webhook URL" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Webhook Token */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Webhook Token
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-secondary rounded px-2 py-1.5 text-foreground/70 overflow-auto">
                    {webhookToken ? webhookToken.substring(0, 20) + "..." : "NOT GENERATED"}
                  </code>
                  <button
                    onClick={() => copyToClipboard(webhookToken || "", "Token")}
                    className="p-1.5 hover:bg-secondary rounded transition-colors"
                  >
                    {copiedField === "Token" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Полный токен */}
              {webhookToken && (
                <div>
                  <details className="cursor-pointer">
                    <summary className="text-xs font-medium text-primary hover:underline">
                      Показать полный токен
                    </summary>
                    <div className="mt-2 p-2 bg-secondary rounded text-xs text-foreground break-all">
                      {webhookToken}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Installation Code */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Код для установки на сайт
              </label>
              <button
                onClick={() => {
                  const phpCode = `<?php
// Ваша форма обработки
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$message = $_POST['message'] ?? '';

// Отправка на CRM webhook
$data = [
    'client_name' => $name,
    'client_email' => $email,
    'client_phone' => $phone,
    'message' => $message,
    'page_url' => $_SERVER['HTTP_REFERER'],
    'referrer' => $_SERVER['HTTP_REFERER'],
    'user_agent' => $_SERVER['HTTP_USER_AGENT'],
];

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => '${webhookUrl}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-webhook-token: ${webhookToken}',
    ],
]);

$response = curl_exec($curl);
curl_close($curl);
?>`;
                  copyToClipboard(phpCode, "PHP код");
                }}
                className="text-xs bg-secondary hover:bg-secondary/80 px-3 py-2 rounded transition-colors flex items-center gap-2 text-foreground"
              >
                <Code className="w-3 h-3" />
                Копировать PHP код
              </button>
            </div>

            {/* Documentation Link */}
            <a
              href="/WEB_LEADS_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2 rounded transition-colors text-center"
            >
              <ExternalLink className="w-3 h-3 inline mr-1" />
              Полная документация
            </a>
          </>
        )}

        {!webhookEnabled && (
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
            ⚠️ Включите интеграцию чтобы начать собирать заявки с вашего сайта
          </div>
        )}
      </div>
    </motion.div>
  );
}
