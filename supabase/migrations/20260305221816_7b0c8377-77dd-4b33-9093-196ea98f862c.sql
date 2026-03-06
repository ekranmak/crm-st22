
-- Orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  order_number text NOT NULL DEFAULT '',
  client_name text NOT NULL,
  client_phone text DEFAULT '',
  client_email text DEFAULT '',
  items text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Новый',
  payment_method text DEFAULT '',
  manager text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders access" ON public.orders FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  client_name text NOT NULL,
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  plan text NOT NULL DEFAULT 'Стандарт',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  next_payment timestamp with time zone,
  auto_renew boolean NOT NULL DEFAULT true,
  payment_method text DEFAULT '',
  total_paid numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions access" ON public.subscriptions FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
