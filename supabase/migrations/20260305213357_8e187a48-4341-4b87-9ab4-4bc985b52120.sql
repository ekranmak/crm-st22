
-- Team members stored in DB
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Менеджер',
  online BOOLEAN NOT NULL DEFAULT true,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  access_level TEXT NOT NULL DEFAULT 'manager',
  restricted_blocks TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members visible to owner and admins" ON public.team_members
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  service TEXT NOT NULL,
  phone TEXT DEFAULT '',
  comment TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookings access" ON public.bookings
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Finance entries
CREATE TABLE public.finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance access" ON public.finance_entries
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Internal messages (admin to employee)
CREATE TABLE public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages visible to sender and recipient" ON public.internal_messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Authenticated users can send messages" ON public.internal_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update read status" ON public.internal_messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

-- Task assignments
CREATE TABLE public.assigned_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks visible to creator and assignee" ON public.assigned_tasks
  FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY "Authenticated can create tasks" ON public.assigned_tasks
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creator and assignee can update tasks" ON public.assigned_tasks
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR assignee_id = auth.uid());

CREATE POLICY "Creator can delete tasks" ON public.assigned_tasks
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- Enable realtime for messages and tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assigned_tasks;
