ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_progress;
ALTER TABLE public.pet_progress REPLICA IDENTITY FULL;