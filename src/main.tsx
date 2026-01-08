import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from './integrations/supabase/client'

// Dev-only: Log Supabase project ref for debugging
if (import.meta.env.DEV) {
  const supabaseUrl = supabase.supabaseUrl;
  // Extract project ref from URL (e.g., "https://jgicbewohdubulzdcuat.supabase.co" -> "jgicbewohdubulzdcuat")
  const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : 'unknown';
  console.log(`[Supabase] Connected to project: ${projectRef}`);
}

createRoot(document.getElementById("root")!).render(<App />);
