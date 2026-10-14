-- Remove the legacy overload whose argument order conflicts with the current frontend RPC.
-- PostgREST resolves named RPC parameters, so both overloads make calls ambiguous.
DROP FUNCTION IF EXISTS public.create_stock_entry(integer, uuid, date, text, numeric, text);

-- Keep the current signature used by the application.
GRANT EXECUTE ON FUNCTION public.create_stock_entry(uuid, integer, date, text, numeric, text) TO authenticated;
