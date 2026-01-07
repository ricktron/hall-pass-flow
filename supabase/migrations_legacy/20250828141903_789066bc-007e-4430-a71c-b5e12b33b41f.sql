-- Fix security warnings by setting search_path for analytics functions
-- This addresses the "Function Search Path Mutable" warnings

-- Update all 7 analytics functions to set search_path for security
ALTER FUNCTION get_analytics_summary(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_return_rate(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_avg_minutes(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_by_period(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_by_destination(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_frequent_flyers(TEXT) SET search_path = '';
ALTER FUNCTION get_analytics_longest_passes(TEXT) SET search_path = '';