
CREATE TABLE public.call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  call_type text NOT NULL DEFAULT 'incoming',
  duration text DEFAULT '—',
  call_time timestamp with time zone NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Call logs access" ON public.call_logs FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
