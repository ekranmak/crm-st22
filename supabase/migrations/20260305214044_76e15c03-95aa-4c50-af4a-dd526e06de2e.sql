
CREATE TABLE public.warehouse_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  sku text NOT NULL DEFAULT '',
  qty integer NOT NULL DEFAULT 0,
  min_qty integer NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'Без категории',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and admins can manage warehouse products"
  ON public.warehouse_products FOR ALL
  TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
