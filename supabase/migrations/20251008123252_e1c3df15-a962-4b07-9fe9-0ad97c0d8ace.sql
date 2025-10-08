-- Add was_auto_closed column to bathroom_passes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bathroom_passes' 
    AND column_name = 'was_auto_closed'
  ) THEN
    ALTER TABLE public.bathroom_passes 
    ADD COLUMN was_auto_closed BOOLEAN NOT NULL DEFAULT false;
    
    COMMENT ON COLUMN public.bathroom_passes.was_auto_closed IS 'Indicates if this pass was automatically closed by the auto-close-passes function';
  END IF;
END $$;