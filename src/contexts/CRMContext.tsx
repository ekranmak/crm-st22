import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import {
  Crown, Users, FolderKanban, Package, Phone, Mail,
  Scissors, ShoppingBag, HardHat, GraduationCap, Building2,
  type LucideIcon,
} from "lucide-react";

export type AccessLevel = "admin" | "manager" | "observer";

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  observer: "Наблюдатель",
};

export const ACCESS_LEVEL_DEFAULTS: Record<AccessLevel, string[]> = {
  admin: [],
  manager: ["revenue", "performance"],
  observer: ["kpi", "revenue", "performance", "timeline"],
};

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  online: boolean;
  icon: LucideIcon;
  email?: string;
  phone?: string;
  restrictedBlocks?: string[];
  accessLevel?: AccessLevel;
}

export interface BusinessType {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const businessTypes: BusinessType[] = [
  { id: "salon", label: "Салон красоты", icon: Scissors, description: "Парикмахерские, SPA, маникюрные салоны" },
  { id: "shop", label: "Магазин", icon: ShoppingBag, description: "Розничная торговля, e-commerce" },
  { id: "construction", label: "Стройка", icon: HardHat, description: "Строительство, ремонт, подрядчики" },
  { id: "school", label: "Онлайн-школа", icon: GraduationCap, description: "Курсы, вебинары, обучение" },
  { id: "agency", label: "Агентство", icon: Building2, description: "Маркетинг, PR, консалтинг" },
];

export interface BusinessConfig {
  bookingTitle: string;
  bookingButton: string;
  bookingServices: { name: string; service: string }[];
  warehouseTitle: string;
  warehouseProducts: { id: number; name: string; sku: string; qty: number; min: number; price: number; category: string }[];
  projectsTitle: string;
  projectTasks: { id: string; title: string; assignee: string; deadline: string; progress: number; priority: "high" | "medium" | "low"; gradient: string }[];
  subscriptionsTitle: string;
  subscriptionPlans: string[];
  documentsTitle: string;
  documentsList: { id: number; name: string; type: string }[];
  telephonyTitle: string;
  emailTitle: string;
  emailCampaigns: { name: string; status: string }[];
  clientLabel: string;
  kpiLabels: { conversion: string; avgCheck: string; roi: string; ltv: string };
  financeTitle: string;
  financeCategories: { name: string; amount: number; type: "income" | "expense" }[];
  financeSummary: { revenue: string; expenses: string; profit: string; tax: string };
  ordersTitle: string;
  orderStatuses: string[];
  orders: { id: string; client: string; items: string; total: number; status: string; date: string }[];
}

const configs: Record<string, BusinessConfig> = {
  salon: {
    bookingTitle: "Онлайн-запись",
    bookingButton: "Записать клиента",
    bookingServices: [
      { name: "Иванов А.", service: "Стрижка" },
      { name: "Петрова М.", service: "Окрашивание" },
      { name: "Сидоров К.", service: "Маникюр" },
      { name: "Козлова Е.", service: "SPA-уход" },
      { name: "Михайлов Д.", service: "Укладка" },
    ],
    warehouseTitle: "Склад",
    warehouseProducts: [
      { id: 1, name: "Шампунь профессиональный", sku: "SH-001", qty: 142, min: 50, price: 890, category: "Косметика" },
      { id: 2, name: "Краска для волос (блонд)", sku: "KR-012", qty: 28, min: 30, price: 1450, category: "Краски" },
      { id: 3, name: "Маска восстанавливающая", sku: "MK-003", qty: 5, min: 20, price: 1200, category: "Косметика" },
      { id: 4, name: "Лак для волос сильной фиксации", sku: "LK-007", qty: 67, min: 25, price: 560, category: "Стайлинг" },
      { id: 5, name: "Расчёска керамическая", sku: "RS-019", qty: 12, min: 15, price: 2300, category: "Инструменты" },
      { id: 6, name: "Фен профессиональный", sku: "FN-002", qty: 3, min: 5, price: 8900, category: "Оборудование" },
      { id: 7, name: "Перчатки одноразовые (100шт)", sku: "PR-100", qty: 89, min: 20, price: 340, category: "Расходники" },
      { id: 8, name: "Полотенца одноразовые", sku: "PL-050", qty: 15, min: 30, price: 450, category: "Расходники" },
    ],
    projectsTitle: "Проекты",
    projectTasks: [
      { id: "1", title: "Обновить прайс-лист услуг", assignee: "Мария П.", deadline: "8 Мар", progress: 0, priority: "high", gradient: "var(--gradient-pink)" },
      { id: "2", title: "Закупка расходных материалов", assignee: "Елена В.", deadline: "12 Мар", progress: 0, priority: "medium", gradient: "var(--gradient-orange)" },
      { id: "3", title: "Редизайн зоны ожидания", assignee: "Дмитрий С.", deadline: "10 Мар", progress: 65, priority: "high", gradient: "var(--gradient-blue)" },
    ],
    subscriptionsTitle: "Абонементы",
    subscriptionPlans: ["Премиум", "Стандарт", "Базовый"],
    documentsTitle: "Документы",
    documentsList: [
      { id: 1, name: "Договор аренды помещения", type: "Договор" },
      { id: 2, name: "Лицензия на косметологию", type: "Лицензия" },
    ],
    telephonyTitle: "Телефония",
    emailTitle: "Email-маркетинг",
    emailCampaigns: [
      { name: "Весенние скидки на SPA", status: "sent" },
      { name: "Новые процедуры", status: "draft" },
    ],
    clientLabel: "Клиент",
    kpiLabels: { conversion: "Конверсия записей", avgCheck: "Средний чек", roi: "ROI", ltv: "LTV клиента" },
    financeTitle: "Финансы",
    financeCategories: [
      { name: "Услуги стрижки", amount: 245000, type: "income" },
      { name: "SPA-процедуры", amount: 189000, type: "income" },
      { name: "Продажа косметики", amount: 67000, type: "income" },
      { name: "Аренда помещения", amount: 120000, type: "expense" },
      { name: "Зарплата мастеров", amount: 280000, type: "expense" },
      { name: "Закупка материалов", amount: 85000, type: "expense" },
    ],
    financeSummary: { revenue: "₽501,000", expenses: "₽485,000", profit: "₽16,000", tax: "₽30,060" },
    ordersTitle: "Заказы",
    orderStatuses: ["Новый", "В работе", "Готов", "Выдан", "Отменён"],
    orders: [
      { id: "S-001", client: "Иванова Анна", items: "Стрижка + Окрашивание", total: 8500, status: "Готов", date: "05.03.2026" },
      { id: "S-002", client: "Петрова Мария", items: "SPA-уход комплекс", total: 12000, status: "В работе", date: "05.03.2026" },
      { id: "S-003", client: "Козлов Дмитрий", items: "Мужская стрижка", total: 1500, status: "Новый", date: "05.03.2026" },
      { id: "S-004", client: "Сидорова Елена", items: "Маникюр + Педикюр", total: 4200, status: "Выдан", date: "04.03.2026" },
      { id: "S-005", client: "Новиков Артём", items: "Укладка праздничная", total: 3500, status: "Отменён", date: "04.03.2026" },
    ],
  },
  shop: {
    bookingTitle: "Заказы",
    bookingButton: "Новый заказ",
    bookingServices: [
      { name: "Иванов А.", service: "Доставка" },
      { name: "Петрова М.", service: "Самовывоз" },
      { name: "Сидоров К.", service: "Возврат" },
      { name: "Козлова Е.", service: "Обмен" },
      { name: "Михайлов Д.", service: "Консультация" },
    ],
    warehouseTitle: "Склад товаров",
    warehouseProducts: [
      { id: 1, name: "Футболка базовая (M)", sku: "FT-001", qty: 245, min: 50, price: 1490, category: "Одежда" },
      { id: 2, name: "Кроссовки спортивные", sku: "KR-015", qty: 18, min: 20, price: 5900, category: "Обувь" },
      { id: 3, name: "Рюкзак городской", sku: "RK-003", qty: 4, min: 15, price: 3200, category: "Аксессуары" },
      { id: 4, name: "Джинсы slim-fit (32)", sku: "DJ-022", qty: 67, min: 25, price: 4500, category: "Одежда" },
      { id: 5, name: "Шарф кашемировый", sku: "SH-008", qty: 32, min: 10, price: 2800, category: "Аксессуары" },
      { id: 6, name: "Куртка зимняя (L)", sku: "KU-011", qty: 8, min: 10, price: 12900, category: "Верхняя одежда" },
      { id: 7, name: "Упаковочные пакеты (500шт)", sku: "UP-100", qty: 120, min: 50, price: 890, category: "Расходники" },
      { id: 8, name: "Ценники (рулон)", sku: "CN-050", qty: 45, min: 20, price: 350, category: "Расходники" },
    ],
    projectsTitle: "Проекты",
    projectTasks: [
      { id: "1", title: "Запуск новой коллекции", assignee: "Мария П.", deadline: "8 Мар", progress: 0, priority: "high", gradient: "var(--gradient-pink)" },
      { id: "2", title: "Обновить витрины", assignee: "Елена В.", deadline: "12 Мар", progress: 0, priority: "medium", gradient: "var(--gradient-orange)" },
      { id: "3", title: "Настройка интернет-магазина", assignee: "Дмитрий С.", deadline: "10 Мар", progress: 65, priority: "high", gradient: "var(--gradient-blue)" },
    ],
    subscriptionsTitle: "Программы лояльности",
    subscriptionPlans: ["Золотая карта", "Серебряная карта", "Бонусная карта"],
    documentsTitle: "Документы",
    documentsList: [
      { id: 1, name: "Договор с поставщиком", type: "Договор" },
      { id: 2, name: "Товарная накладная", type: "Накладная" },
    ],
    telephonyTitle: "Телефония",
    emailTitle: "Email-маркетинг",
    emailCampaigns: [
      { name: "Распродажа выходного дня", status: "sent" },
      { name: "Новые поступления", status: "draft" },
    ],
    clientLabel: "Покупатель",
    kpiLabels: { conversion: "Конверсия продаж", avgCheck: "Средний чек", roi: "ROI", ltv: "LTV покупателя" },
    financeTitle: "Финансы",
    financeCategories: [
      { name: "Продажа одежды", amount: 890000, type: "income" },
      { name: "Продажа обуви", amount: 420000, type: "income" },
      { name: "Аксессуары", amount: 156000, type: "income" },
      { name: "Аренда торговой площади", amount: 250000, type: "expense" },
      { name: "Зарплата продавцов", amount: 340000, type: "expense" },
      { name: "Закупка товара", amount: 680000, type: "expense" },
    ],
    financeSummary: { revenue: "₽1,466,000", expenses: "₽1,270,000", profit: "₽196,000", tax: "₽87,960" },
    ordersTitle: "Заказы",
    orderStatuses: ["Новый", "Собирается", "Отправлен", "Доставлен", "Возврат"],
    orders: [
      { id: "M-001", client: "Иванов Алексей", items: "Футболка ×2, Джинсы ×1", total: 7480, status: "Отправлен", date: "05.03.2026" },
      { id: "M-002", client: "Петрова Мария", items: "Куртка зимняя (L)", total: 12900, status: "Собирается", date: "05.03.2026" },
      { id: "M-003", client: "Козлов Дмитрий", items: "Кроссовки спортивные", total: 5900, status: "Новый", date: "05.03.2026" },
      { id: "M-004", client: "Сидорова Елена", items: "Шарф + Рюкзак", total: 6000, status: "Доставлен", date: "04.03.2026" },
      { id: "M-005", client: "Новиков Артём", items: "Футболка (S)", total: 1490, status: "Возврат", date: "03.03.2026" },
    ],
  },
  construction: {
    bookingTitle: "График работ",
    bookingButton: "Новый объект",
    bookingServices: [
      { name: "Иванов А.", service: "Монтаж" },
      { name: "Петрова М.", service: "Замеры" },
      { name: "Сидоров К.", service: "Приёмка" },
      { name: "Козлова Е.", service: "Инспекция" },
      { name: "Михайлов Д.", service: "Отделка" },
    ],
    warehouseTitle: "Склад материалов",
    warehouseProducts: [
      { id: 1, name: "Цемент М500 (50 кг)", sku: "CM-001", qty: 320, min: 100, price: 450, category: "Сыпучие" },
      { id: 2, name: "Арматура 12 мм (6 м)", sku: "AR-012", qty: 85, min: 50, price: 380, category: "Металл" },
      { id: 3, name: "Кирпич красный (поддон)", sku: "KR-003", qty: 8, min: 20, price: 12500, category: "Кладка" },
      { id: 4, name: "Гипсокартон (лист)", sku: "GK-010", qty: 156, min: 30, price: 420, category: "Отделка" },
      { id: 5, name: "Перфоратор Bosch", sku: "PF-002", qty: 3, min: 5, price: 18900, category: "Инструмент" },
      { id: 6, name: "Саморезы (упак. 1000шт)", sku: "SM-500", qty: 45, min: 20, price: 280, category: "Крепёж" },
      { id: 7, name: "Кабель ВВГ 3×2.5 (100м)", sku: "KB-025", qty: 12, min: 10, price: 5600, category: "Электрика" },
      { id: 8, name: "Каска строительная", sku: "KS-001", qty: 18, min: 10, price: 650, category: "СИЗ" },
    ],
    projectsTitle: "Объекты",
    projectTasks: [
      { id: "1", title: "ЖК «Солнечный» — фундамент", assignee: "Мария П.", deadline: "8 Мар", progress: 0, priority: "high", gradient: "var(--gradient-pink)" },
      { id: "2", title: "Офис на Ленина — отделка", assignee: "Елена В.", deadline: "12 Мар", progress: 0, priority: "medium", gradient: "var(--gradient-orange)" },
      { id: "3", title: "Коттедж — кровля", assignee: "Дмитрий С.", deadline: "10 Мар", progress: 65, priority: "high", gradient: "var(--gradient-blue)" },
    ],
    subscriptionsTitle: "Контракты",
    subscriptionPlans: ["Генподряд", "Субподряд", "Сервис"],
    documentsTitle: "Документация",
    documentsList: [
      { id: 1, name: "Смета на объект ЖК «Солнечный»", type: "Смета" },
      { id: 2, name: "Акт скрытых работ", type: "Акт" },
    ],
    telephonyTitle: "Связь",
    emailTitle: "Рассылки",
    emailCampaigns: [
      { name: "Акция на ремонт квартир", status: "sent" },
      { name: "Новые объекты", status: "draft" },
    ],
    clientLabel: "Заказчик",
    kpiLabels: { conversion: "Конверсия заявок", avgCheck: "Средний контракт", roi: "ROI проектов", ltv: "LTV заказчика" },
    financeTitle: "Финансы",
    financeCategories: [
      { name: "Оплата от заказчиков", amount: 4500000, type: "income" },
      { name: "Авансы по контрактам", amount: 1200000, type: "income" },
      { name: "Субподряд", amount: 800000, type: "income" },
      { name: "Материалы", amount: 2100000, type: "expense" },
      { name: "Зарплата бригад", amount: 1800000, type: "expense" },
      { name: "Аренда техники", amount: 650000, type: "expense" },
    ],
    financeSummary: { revenue: "₽6,500,000", expenses: "₽4,550,000", profit: "₽1,950,000", tax: "₽390,000" },
    ordersTitle: "Заявки",
    orderStatuses: ["Новая", "Замер", "Смета", "В работе", "Сдан"],
    orders: [
      { id: "C-001", client: "ООО «Стройинвест»", items: "Фундамент ЖК «Солнечный»", total: 2500000, status: "В работе", date: "05.03.2026" },
      { id: "C-002", client: "ИП Петров", items: "Ремонт офиса 120 м²", total: 890000, status: "Замер", date: "04.03.2026" },
      { id: "C-003", client: "Козлова М.А.", items: "Кровля коттеджа", total: 450000, status: "Смета", date: "03.03.2026" },
      { id: "C-004", client: "ТЦ «Галерея»", items: "Отделка 2 этаж", total: 1200000, status: "Сдан", date: "01.03.2026" },
      { id: "C-005", client: "Иванов А.С.", items: "Пристройка к дому", total: 680000, status: "Новая", date: "05.03.2026" },
    ],
  },
  school: {
    bookingTitle: "Расписание",
    bookingButton: "Новый урок",
    bookingServices: [
      { name: "Иванов А.", service: "Вебинар" },
      { name: "Петрова М.", service: "Консультация" },
      { name: "Сидоров К.", service: "Мастер-класс" },
      { name: "Козлова Е.", service: "Экзамен" },
      { name: "Михайлов Д.", service: "Лекция" },
    ],
    warehouseTitle: "Учебные материалы",
    warehouseProducts: [
      { id: 1, name: "Курс «Python с нуля»", sku: "PY-001", qty: 999, min: 0, price: 4900, category: "Программирование" },
      { id: 2, name: "Курс «Дизайн в Figma»", sku: "FG-002", qty: 999, min: 0, price: 3900, category: "Дизайн" },
      { id: 3, name: "Рабочая тетрадь (PDF)", sku: "RT-010", qty: 450, min: 100, price: 0, category: "Материалы" },
      { id: 4, name: "Курс «Маркетинг»", sku: "MK-003", qty: 999, min: 0, price: 5900, category: "Маркетинг" },
      { id: 5, name: "Сертификат (бланк)", sku: "SR-050", qty: 120, min: 50, price: 150, category: "Расходники" },
      { id: 6, name: "Курс «Excel Pro»", sku: "EX-004", qty: 999, min: 0, price: 2900, category: "Офис" },
      { id: 7, name: "Методичка по продажам", sku: "MP-020", qty: 300, min: 50, price: 0, category: "Материалы" },
      { id: 8, name: "Доступ к платформе (мес)", sku: "DP-001", qty: 999, min: 0, price: 990, category: "Подписки" },
    ],
    projectsTitle: "Курсы и проекты",
    projectTasks: [
      { id: "1", title: "Запуск курса «AI для бизнеса»", assignee: "Мария П.", deadline: "8 Мар", progress: 0, priority: "high", gradient: "var(--gradient-pink)" },
      { id: "2", title: "Записать видео-уроки", assignee: "Елена В.", deadline: "12 Мар", progress: 0, priority: "medium", gradient: "var(--gradient-orange)" },
      { id: "3", title: "Обновить платформу", assignee: "Дмитрий С.", deadline: "10 Мар", progress: 65, priority: "high", gradient: "var(--gradient-blue)" },
    ],
    subscriptionsTitle: "Подписки студентов",
    subscriptionPlans: ["Годовой доступ", "Месячный доступ", "Пробный"],
    documentsTitle: "Документы",
    documentsList: [
      { id: 1, name: "Оферта для студентов", type: "Оферта" },
      { id: 2, name: "Лицензия на образование", type: "Лицензия" },
    ],
    telephonyTitle: "Поддержка",
    emailTitle: "Email-маркетинг",
    emailCampaigns: [
      { name: "Старт нового потока", status: "sent" },
      { name: "Бесплатный вебинар", status: "draft" },
    ],
    clientLabel: "Студент",
    kpiLabels: { conversion: "Конверсия заявок", avgCheck: "Ср. стоимость курса", roi: "ROI", ltv: "LTV студента" },
    financeTitle: "Финансы",
    financeCategories: [
      { name: "Продажа курсов", amount: 1850000, type: "income" },
      { name: "Подписки", amount: 420000, type: "income" },
      { name: "Корпоративное обучение", amount: 350000, type: "income" },
      { name: "Зарплата преподавателей", amount: 890000, type: "expense" },
      { name: "Платформа и хостинг", amount: 120000, type: "expense" },
      { name: "Маркетинг", amount: 450000, type: "expense" },
    ],
    financeSummary: { revenue: "₽2,620,000", expenses: "₽1,460,000", profit: "₽1,160,000", tax: "₽157,200" },
    ordersTitle: "Заявки на обучение",
    orderStatuses: ["Новая", "Оплачена", "Обучение", "Завершён", "Возврат"],
    orders: [
      { id: "E-001", client: "Иванов Алексей", items: "Курс «Python с нуля»", total: 4900, status: "Обучение", date: "05.03.2026" },
      { id: "E-002", client: "Петрова Мария", items: "Курс «Дизайн в Figma»", total: 3900, status: "Оплачена", date: "05.03.2026" },
      { id: "E-003", client: "Козлов Дмитрий", items: "Курс «Маркетинг»", total: 5900, status: "Новая", date: "04.03.2026" },
      { id: "E-004", client: "Сидорова Елена", items: "Годовой доступ", total: 9900, status: "Завершён", date: "01.03.2026" },
      { id: "E-005", client: "Новиков Артём", items: "Курс «Excel Pro»", total: 2900, status: "Возврат", date: "28.02.2026" },
    ],
  },
  agency: {
    bookingTitle: "Встречи",
    bookingButton: "Назначить встречу",
    bookingServices: [
      { name: "Иванов А.", service: "Брифинг" },
      { name: "Петрова М.", service: "Презентация" },
      { name: "Сидоров К.", service: "Согласование" },
      { name: "Козлова Е.", service: "Отчёт" },
      { name: "Михайлов Д.", service: "Стратегия" },
    ],
    warehouseTitle: "Ресурсы",
    warehouseProducts: [
      { id: 1, name: "Лицензия Adobe CC (год)", sku: "AD-001", qty: 10, min: 5, price: 24000, category: "Софт" },
      { id: 2, name: "Лицензия Figma (год)", sku: "FG-002", qty: 8, min: 5, price: 18000, category: "Софт" },
      { id: 3, name: "Хостинг (мес)", sku: "HS-010", qty: 12, min: 3, price: 2500, category: "Инфраструктура" },
      { id: 4, name: "Рекламный бюджет (авг)", sku: "RB-008", qty: 1, min: 1, price: 500000, category: "Медиа" },
      { id: 5, name: "Фотосессия (пакет)", sku: "FS-005", qty: 3, min: 2, price: 35000, category: "Продакшн" },
      { id: 6, name: "Видео-ролик (30 сек)", sku: "VR-003", qty: 2, min: 1, price: 85000, category: "Продакшн" },
      { id: 7, name: "Баннерная реклама (1000шт)", sku: "BR-100", qty: 50, min: 10, price: 1200, category: "Креатив" },
      { id: 8, name: "Печать визиток (500шт)", sku: "VZ-500", qty: 20, min: 5, price: 1800, category: "Полиграфия" },
    ],
    projectsTitle: "Проекты клиентов",
    projectTasks: [
      { id: "1", title: "Ребрендинг ООО «Восход»", assignee: "Мария П.", deadline: "8 Мар", progress: 0, priority: "high", gradient: "var(--gradient-pink)" },
      { id: "2", title: "SMM стратегия для кафе", assignee: "Елена В.", deadline: "12 Мар", progress: 0, priority: "medium", gradient: "var(--gradient-orange)" },
      { id: "3", title: "Лендинг для запуска", assignee: "Дмитрий С.", deadline: "10 Мар", progress: 65, priority: "high", gradient: "var(--gradient-blue)" },
    ],
    subscriptionsTitle: "Ретейнеры",
    subscriptionPlans: ["Enterprise", "Business", "Starter"],
    documentsTitle: "Документы",
    documentsList: [
      { id: 1, name: "Договор с клиентом", type: "Договор" },
      { id: 2, name: "Бриф на проект", type: "Бриф" },
    ],
    telephonyTitle: "Звонки",
    emailTitle: "Рассылки",
    emailCampaigns: [
      { name: "Кейсы месяца", status: "sent" },
      { name: "Новые услуги", status: "draft" },
    ],
    clientLabel: "Клиент",
    kpiLabels: { conversion: "Конверсия лидов", avgCheck: "Средний контракт", roi: "ROI кампаний", ltv: "LTV клиента" },
    financeTitle: "Финансы",
    financeCategories: [
      { name: "Ретейнеры клиентов", amount: 2400000, type: "income" },
      { name: "Проектные работы", amount: 1600000, type: "income" },
      { name: "Медиабаинг (комиссия)", amount: 350000, type: "income" },
      { name: "Зарплата команды", amount: 1800000, type: "expense" },
      { name: "Лицензии и софт", amount: 180000, type: "expense" },
      { name: "Офис и инфраструктура", amount: 250000, type: "expense" },
    ],
    financeSummary: { revenue: "₽4,350,000", expenses: "₽2,230,000", profit: "₽2,120,000", tax: "₽261,000" },
    ordersTitle: "Заказы клиентов",
    orderStatuses: ["Бриф", "Согласование", "В работе", "Сдан", "Закрыт"],
    orders: [
      { id: "A-001", client: "ООО «Восход»", items: "Ребрендинг + SMM (3 мес)", total: 450000, status: "В работе", date: "05.03.2026" },
      { id: "A-002", client: "Кафе «Уют»", items: "SMM стратегия", total: 120000, status: "Согласование", date: "04.03.2026" },
      { id: "A-003", client: "ИП Сидоров", items: "Лендинг + контекст", total: 85000, status: "Бриф", date: "05.03.2026" },
      { id: "A-004", client: "Фитнес «Энерджи»", items: "Видеопродакшн", total: 280000, status: "Сдан", date: "02.03.2026" },
      { id: "A-005", client: "Банк «Прогресс»", items: "Enterprise пакет", total: 900000, status: "Закрыт", date: "28.02.2026" },
    ],
  },
};

const defaultMembers: TeamMember[] = [];

const roleIcons: Record<string, LucideIcon> = {
  "Руководитель": Crown,
  "Клиенты": Users,
  "Проекты": FolderKanban,
  "Склад": Package,
  "Звонки": Phone,
  "Email": Mail,
};

export interface CRMNotification {
  id: string;
  type: "task_completed" | "deal_closed" | "call_made" | "client_added";
  member: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface CRMContextType {
  businessType: string;
  setBusinessType: (id: string) => void;
  customBusinessLabels: Record<string, string>;
  customBusinessIcons: Record<string, string>;
  setCustomBusinessLabel: (id: string, label: string) => void;
  setCustomBusinessIcon: (id: string, icon: string) => void;
  teamMembers: TeamMember[];
  addMember: (name: string, role: string) => void;
  removeMember: (id: string) => void;
  toggleOnline: (id: string) => void;
  updateMember: (id: string, updates: Partial<Omit<TeamMember, 'id' | 'icon'>>) => void;
  config: BusinessConfig;
  notifications: CRMNotification[];
  notificationsEnabled: boolean;
  setNotificationsEnabled: (v: boolean) => void;
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  getBusinessLabel: (id: string) => string;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [businessType, setBusinessType] = useState("salon");
  const [customBusinessLabels, setCustomBusinessLabels] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("crm_custom_biz_labels") || "{}");
    } catch { return {}; }
  });
  const [customBusinessIcons, setCustomBusinessIconsState] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("crm_custom_biz_icons") || "{}");
    } catch { return {}; }
  });
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultMembers);
  const [notifications, setNotifications] = useState<CRMNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const config = useMemo(() => configs[businessType] || configs.salon, [businessType]);

  const setCustomBusinessLabel = useCallback((id: string, label: string) => {
    setCustomBusinessLabels(prev => {
      const next = { ...prev };
      if (label) { next[id] = label; } else { delete next[id]; }
      localStorage.setItem("crm_custom_biz_labels", JSON.stringify(next));
      return next;
    });
  }, []);

  const setCustomBusinessIcon = useCallback((id: string, icon: string) => {
    setCustomBusinessIconsState(prev => {
      const next = { ...prev };
      if (icon) { next[id] = icon; } else { delete next[id]; }
      localStorage.setItem("crm_custom_biz_icons", JSON.stringify(next));
      return next;
    });
  }, []);

  const getBusinessLabel = useCallback((id: string) => {
    return customBusinessLabels[id] || businessTypes.find(b => b.id === id)?.label || id;
  }, [customBusinessLabels]);

  // No fake notification generator — notifications come from real DB events only

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const markAsRead = useCallback((id: string) => setNotifications((p) => p.map((n) => n.id === id ? { ...n, read: true } : n)), []);
  const markAllAsRead = useCallback(() => setNotifications((p) => p.map((n) => ({ ...n, read: true }))), []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  const addMember = (name: string, role: string) => {
    const icon = roleIcons[role] || Users;
    setTeamMembers((prev) => [
      ...prev,
      { id: Date.now().toString(), name, role, online: true, icon, email: "", phone: "", restrictedBlocks: [] },
    ]);
  };

  const updateMember = (id: string, updates: Partial<Omit<TeamMember, 'id' | 'icon'>>) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        if (updates.role && updates.role !== m.role) {
          updated.icon = roleIcons[updates.role] || Users;
        }
        return updated;
      })
    );
  };

  const removeMember = (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const toggleOnline = (id: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, online: !m.online } : m))
    );
  };

  return (
    <CRMContext.Provider value={{
      businessType, setBusinessType, customBusinessLabels, customBusinessIcons, setCustomBusinessLabel, setCustomBusinessIcon, getBusinessLabel,
      teamMembers, addMember, removeMember, toggleOnline, updateMember, config,
      notifications, notificationsEnabled, setNotificationsEnabled, unreadCount, markAsRead, markAllAsRead, clearNotifications,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error("useCRM must be used within CRMProvider");
  return ctx;
}

export { roleIcons };
