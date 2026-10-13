-- Customer orders must use the server-side RPC: it validates products and
-- totals, then writes the appropriate monthly partition under controlled
-- privileges. Direct anonymous INSERTs would require granting the partitions
-- and create an avoidable authorization surface.

REVOKE INSERT ON TABLE public.orders FROM anon;
GRANT EXECUTE ON FUNCTION public.is_flag_enabled(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, jsonb, text, text, text, text, text, text, text) TO anon;
