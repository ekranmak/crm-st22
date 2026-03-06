
CREATE TABLE public.sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  url text NOT NULL,
  name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  ssl boolean NOT NULL DEFAULT false,
  mobile boolean NOT NULL DEFAULT false,
  pages integer NOT NULL DEFAULT 0,
  uptime numeric NOT NULL DEFAULT 0,
  speed integer NOT NULL DEFAULT 0,
  visitors integer NOT NULL DEFAULT 0,
  last_check timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sites access" ON public.sites
  FOR ALL
  TO authenticated
  USING ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((owner_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
