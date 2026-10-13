BEGIN;
-- Serialize PIN changes per restaurant. Existing ambiguous hashes are retained;
-- login refuses ambiguity until an owner explicitly rotates the affected PINs.
CREATE OR REPLACE FUNCTION public.create_waiter(p_restaurant_id uuid,p_name text,p_pin text,p_role text DEFAULT 'waiter')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.restaurants WHERE id=p_restaurant_id FOR UPDATE;
 IF p_pin IS NULL OR length(p_pin)<4 OR length(p_pin)>72 OR NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'invalid_waiter_input' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.waiters WHERE restaurant_id=p_restaurant_id AND extensions.crypt(p_pin,pin_hash)=pin_hash) THEN RAISE EXCEPTION 'waiter_pin_in_use' USING ERRCODE='23505'; END IF;
 INSERT INTO public.waiters(restaurant_id,name,pin_hash,role) VALUES(p_restaurant_id,p_name,extensions.crypt(p_pin,extensions.gen_salt('bf')),p_role) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.update_waiter(p_waiter_id uuid,p_name text DEFAULT NULL,p_pin text DEFAULT NULL,p_role text DEFAULT NULL,p_is_active boolean DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE restaurant uuid;
BEGIN
 SELECT restaurant_id INTO restaurant FROM public.waiters WHERE id=p_waiter_id;
 IF restaurant IS NULL OR NOT public.is_my_restaurant(restaurant) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.restaurants WHERE id=restaurant FOR UPDATE;
 IF p_pin IS NOT NULL THEN
  IF length(p_pin)<4 OR length(p_pin)>72 THEN RAISE EXCEPTION 'invalid_waiter_input' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.waiters WHERE restaurant_id=restaurant AND id<>p_waiter_id AND extensions.crypt(p_pin,pin_hash)=pin_hash) THEN RAISE EXCEPTION 'waiter_pin_in_use' USING ERRCODE='23505'; END IF;
 END IF;
 IF p_name IS NOT NULL AND NULLIF(trim(p_name),'') IS NULL THEN RAISE EXCEPTION 'invalid_waiter_input' USING ERRCODE='22023'; END IF;
 UPDATE public.waiters SET name=COALESCE(p_name,name),pin_hash=CASE WHEN p_pin IS NULL THEN pin_hash ELSE extensions.crypt(p_pin,extensions.gen_salt('bf')) END,
  role=COALESCE(p_role,role),is_active=COALESCE(p_is_active,is_active) WHERE id=p_waiter_id;
END $$;
CREATE OR REPLACE FUNCTION public.validate_waiter_pin(p_restaurant_id uuid,p_pin text)
RETURNS TABLE(waiter_id uuid,waiter_name text,waiter_role text,session_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE matches uuid[]; matched public.waiters; session uuid;
BEGIN
 IF NOT public.is_my_restaurant(p_restaurant_id) THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.restaurants WHERE id=p_restaurant_id FOR SHARE;
 IF p_pin IS NULL OR length(p_pin)<4 OR length(p_pin)>72 THEN RETURN; END IF;
 SELECT array_agg(id) INTO matches FROM public.waiters WHERE restaurant_id=p_restaurant_id AND is_active AND extensions.crypt(p_pin,pin_hash)=pin_hash;
 IF COALESCE(cardinality(matches),0)=0 THEN RETURN; END IF;
 IF cardinality(matches)>1 THEN RAISE EXCEPTION 'ambiguous_waiter_pin' USING ERRCODE='22023'; END IF;
 SELECT * INTO matched FROM public.waiters WHERE id=matches[1];
 INSERT INTO public.waiter_sessions(waiter_id,restaurant_id) VALUES(matched.id,p_restaurant_id) RETURNING id INTO session;
 RETURN QUERY SELECT matched.id,matched.name,matched.role,session;
END $$;
REVOKE ALL ON FUNCTION public.create_waiter(uuid,text,text,text),public.update_waiter(uuid,text,text,text,boolean),public.validate_waiter_pin(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_waiter(uuid,text,text,text),public.update_waiter(uuid,text,text,text,boolean),public.validate_waiter_pin(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
