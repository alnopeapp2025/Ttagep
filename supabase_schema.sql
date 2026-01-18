-- Enable RLS on tables but allow public access for now since auth is custom
-- This fixes the issue where INSERTs are silently rejected

-- Users Table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public update users" ON public.users FOR UPDATE USING (true);

-- Transactions Table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete transactions" ON public.transactions FOR DELETE USING (true);

-- Clients Table
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Allow public update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete clients" ON public.clients FOR DELETE USING (true);

-- Agents Table
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert agents" ON public.agents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow public update agents" ON public.agents FOR UPDATE USING (true);
CREATE POLICY "Allow public delete agents" ON public.agents FOR DELETE USING (true);

-- Expenses Table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert expenses" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select expenses" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "Allow public update expenses" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete expenses" ON public.expenses FOR DELETE USING (true);

-- Accounts Table
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert accounts" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Allow public update accounts" ON public.accounts FOR UPDATE USING (true);
