
DROP POLICY "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile or admin can update any" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
