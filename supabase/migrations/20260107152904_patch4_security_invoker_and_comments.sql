-- Align local schema to linked: security_invoker view options + key comments

COMMENT ON SCHEMA "public" IS 'Security migration completed: All views set to SECURITY INVOKER, all functions have secure search_path';

COMMENT ON TABLE "public"."hp_unknown_names" IS 'Aggregated unknown name inputs (normalized) seen in bathroom_passes when student_id could not be resolved.';

-- Apply security_invoker=true to every view that has it in linked
ALTER VIEW "public"."Hall_Passes" SET (security_invoker = true);
ALTER VIEW "public"."Hall_Passes_api" SET (security_invoker = true);
ALTER VIEW "public"."hp_base" SET (security_invoker = true);
ALTER VIEW "public"."hp_month_window" SET (security_invoker = true);
ALTER VIEW "public"."hp_quarter_window" SET (security_invoker = true);
ALTER VIEW "public"."hp_summary_windows" SET (security_invoker = true);
ALTER VIEW "public"."hp_week_window" SET (security_invoker = true);
ALTER VIEW "public"."hp_windows" SET (security_invoker = true);

