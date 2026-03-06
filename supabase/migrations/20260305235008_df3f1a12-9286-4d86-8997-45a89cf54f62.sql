
CREATE POLICY "Delegates can manage roles"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.role_management_delegates WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.role_management_delegates WHERE user_id = auth.uid())
  );

CREATE POLICY "Delegates can read profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.role_management_delegates WHERE user_id = auth.uid())
  );
