
-- 1. Add team_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id uuid;

-- 2. Backfill: every existing user whose team_id is null gets team_id = own id (they're all "owners")
UPDATE public.profiles SET team_id = id WHERE team_id IS NULL;

-- 3. Set default for future rows
ALTER TABLE public.profiles ALTER COLUMN team_id SET NOT NULL;

-- 4. Create security definer function to get current user's team_id
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 5. Update handle_new_user trigger to set team_id = NEW.id for self-registered users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, team_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager'),
    COALESCE((NEW.raw_user_meta_data->>'team_id')::uuid, NEW.id)
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'app_role')::app_role, 'manager'));

  RETURN NEW;
END;
$$;

-- 6. Drop old RLS policies on data tables and recreate with team-based isolation

-- bookings
DROP POLICY IF EXISTS "Bookings access" ON public.bookings;
CREATE POLICY "Bookings team access" ON public.bookings FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- call_logs
DROP POLICY IF EXISTS "Call logs access" ON public.call_logs;
CREATE POLICY "Call logs team access" ON public.call_logs FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- documents
DROP POLICY IF EXISTS "Documents access" ON public.documents;
CREATE POLICY "Documents team access" ON public.documents FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- email_campaigns
DROP POLICY IF EXISTS "Campaigns access" ON public.email_campaigns;
CREATE POLICY "Campaigns team access" ON public.email_campaigns FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- finance_entries
DROP POLICY IF EXISTS "Finance access" ON public.finance_entries;
CREATE POLICY "Finance team access" ON public.finance_entries FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- orders
DROP POLICY IF EXISTS "Orders access" ON public.orders;
CREATE POLICY "Orders team access" ON public.orders FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- sites
DROP POLICY IF EXISTS "Sites access" ON public.sites;
CREATE POLICY "Sites team access" ON public.sites FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- subscriptions
DROP POLICY IF EXISTS "Subscriptions access" ON public.subscriptions;
CREATE POLICY "Subscriptions team access" ON public.subscriptions FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- warehouse_products
DROP POLICY IF EXISTS "Owner and admins can manage warehouse products" ON public.warehouse_products;
CREATE POLICY "Warehouse team access" ON public.warehouse_products FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- team_members
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members visible to owner and admins" ON public.team_members;
CREATE POLICY "Team members team access" ON public.team_members FOR ALL TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE team_id = public.get_my_team_id()))
  WITH CHECK (owner_id = auth.uid());

-- profiles: update to allow team members to see each other
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read team profiles" ON public.profiles FOR SELECT TO authenticated
  USING (team_id = public.get_my_team_id());
