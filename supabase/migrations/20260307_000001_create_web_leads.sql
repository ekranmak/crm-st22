-- Web leads table (form submissions from websites)
CREATE TABLE public.web_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contact info
  client_name text NOT NULL,
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  client_company text DEFAULT '',
  
  -- Message
  message text DEFAULT '',
  form_data jsonb DEFAULT '{}',
  
  -- Info
  status text NOT NULL DEFAULT 'new',
  converted_to_order uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Source tracking
  page_url text DEFAULT '',
  referrer text DEFAULT '',
  user_agent text DEFAULT '',
  ip_address text DEFAULT '',
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.web_leads ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view/manage web leads from their sites
CREATE POLICY "Web leads access" ON public.web_leads
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_web_leads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER web_leads_updated_at_trigger
  BEFORE UPDATE ON public.web_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_web_leads_timestamp();

-- Add column to sites table for webhook token
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS webhook_token text DEFAULT '';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS web_leads_site_id_idx ON public.web_leads(site_id);
CREATE INDEX IF NOT EXISTS web_leads_owner_id_idx ON public.web_leads(owner_id);
CREATE INDEX IF NOT EXISTS web_leads_status_idx ON public.web_leads(status);
CREATE INDEX IF NOT EXISTS web_leads_created_at_idx ON public.web_leads(created_at);
