
-- Add the earlyDismissal column to the Hall_Passes table (with correct case)
ALTER TABLE public."Hall_Passes" 
ADD COLUMN "earlyDismissal" boolean DEFAULT false;
