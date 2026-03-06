CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, team_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager'),
    COALESCE((NEW.raw_user_meta_data->>'team_id')::uuid, NEW.id)
  );

  -- Only trust app_role when team_id is set (employee created by admin).
  -- Self-registering users (no team_id) always get 'admin' since they are org owners.
  IF NEW.raw_user_meta_data->>'team_id' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'app_role')::app_role, 'manager'));
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;