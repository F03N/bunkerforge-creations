
-- Fix overly permissive usage_logs insert policy
DROP POLICY "Anyone can insert logs" ON public.usage_logs;
CREATE POLICY "Authenticated or anon can insert logs" ON public.usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
