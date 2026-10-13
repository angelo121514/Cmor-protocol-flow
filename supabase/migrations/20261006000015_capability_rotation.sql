BEGIN;
CREATE FUNCTION public.rotate_table_capability() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.qr_token IS DISTINCT FROM OLD.qr_token OR (OLD.is_active AND NOT NEW.is_active) THEN
  UPDATE public.table_sessions SET session_token=encode(extensions.gen_random_bytes(32),'hex')
   WHERE table_id=OLD.id AND status IN ('active','payment_pending');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER table_capability_rotation BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.rotate_table_capability();
CREATE FUNCTION public.revoke_closed_session() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status='closed' AND OLD.status<>'closed' THEN NEW.session_token:=encode(extensions.gen_random_bytes(32),'hex'); END IF;
 IF OLD.status='closed' AND NEW.status<>'closed' THEN RAISE EXCEPTION 'closed_session_is_terminal'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER session_capability_close BEFORE UPDATE ON public.table_sessions FOR EACH ROW EXECUTE FUNCTION public.revoke_closed_session();
REVOKE ALL ON FUNCTION public.rotate_table_capability(),public.revoke_closed_session() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
