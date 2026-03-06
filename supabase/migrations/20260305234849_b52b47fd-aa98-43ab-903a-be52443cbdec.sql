
CREATE TABLE public.role_management_delegates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.role_management_delegates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage delegates"
  ON public.role_management_delegates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Delegates can read own row"
  ON public.role_management_delegates
  FOR SELECT
  USING (user_id = auth.uid());
