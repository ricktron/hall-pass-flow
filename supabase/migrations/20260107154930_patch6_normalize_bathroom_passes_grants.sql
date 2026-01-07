-- Normalize grants ordering for pg_dump stability (linked vs local).
-- Reapply the same effective privileges.

REVOKE ALL ON TABLE "public"."bathroom_passes" FROM "anon";
REVOKE ALL ON TABLE "public"."bathroom_passes" FROM "authenticated";
REVOKE ALL ON TABLE "public"."bathroom_passes" FROM "service_role";

GRANT ALL ON TABLE "public"."bathroom_passes" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."bathroom_passes" TO "anon";
GRANT ALL ON TABLE "public"."bathroom_passes" TO "authenticated";
GRANT UPDATE ("timein") ON TABLE "public"."bathroom_passes" TO "anon";
