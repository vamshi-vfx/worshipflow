-- Atomic, ownership-scoped save operations for WorshipFlow.
-- Apply after the base schema and RLS policies. No existing rows are deleted by this migration.
CREATE OR REPLACE FUNCTION public.save_song_bundle(p_song jsonb, p_sections jsonb, p_slides jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid(); v_song_id uuid; v_section jsonb; v_line jsonb; v_slide jsonb;
  v_section_id uuid; v_line_id uuid; v_order int; v_section_order int;
  v_map jsonb := '{}'::jsonb; v_line_map jsonb := '{}'::jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(p_song->>'title'),'') = '' THEN RAISE EXCEPTION 'Song title is required'; END IF;
  v_song_id := nullif(p_song->>'id','')::uuid;
  IF v_song_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM songs WHERE id=v_song_id AND (created_by=v_user OR created_by IS NULL)) THEN RAISE EXCEPTION 'Song not found or not owned'; END IF;
    UPDATE songs SET title=p_song->>'title', romanized_title=p_song->>'romanized_title', english_title=p_song->>'english_title', language=coalesce(p_song->>'language','english'), secondary_language=nullif(p_song->>'secondary_language',''), category=coalesce(p_song->>'category','worship'), lyrics=coalesce(p_song->>'lyrics',''), tags=coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_song->'tags','[]'::jsonb)) x), '{}'::text[]), updated_at=now() WHERE id=v_song_id;
  ELSE
    INSERT INTO songs(title,romanized_title,english_title,slug,language,secondary_language,category,lyrics,tags,created_by) VALUES (p_song->>'title',nullif(p_song->>'romanized_title',''),nullif(p_song->>'english_title',''),p_song->>'slug',coalesce(p_song->>'language','english'),nullif(p_song->>'secondary_language',''),coalesce(p_song->>'category','worship'),coalesce(p_song->>'lyrics',''),coalesce((SELECT array_agg(x) FROM jsonb_array_elements_text(coalesce(p_song->'tags','[]'::jsonb)) x), '{}'::text[]),v_user) RETURNING id INTO v_song_id;
  END IF;
  DELETE FROM song_sections WHERE song_id=v_song_id;
  FOR v_section IN SELECT * FROM jsonb_array_elements(coalesce(p_sections,'[]'::jsonb)) LOOP
    v_section_order := coalesce((v_section->>'order')::int,0);
    INSERT INTO song_sections(song_id,type,label,"order",repeat_count) VALUES (v_song_id,coalesce(v_section->>'type','custom'),coalesce(v_section->>'label','Lyrics'),v_section_order,coalesce((v_section->>'repeat_count')::int,1)) RETURNING id INTO v_section_id;
    v_map := v_map || jsonb_build_object(coalesce(v_section->>'client_id',v_section_order::text),v_section_id::text);
    FOR v_line IN SELECT * FROM jsonb_array_elements(coalesce(v_section->'lines','[]'::jsonb)) LOOP
      INSERT INTO song_lines(section_id,"order",primary_text,secondary_text,chords,language,display_mode) VALUES(v_section_id,coalesce((v_line->>'order')::int,0),coalesce(v_line->>'primary_text',''),nullif(v_line->>'secondary_text',''),nullif(v_line->>'chords',''),coalesce(v_line->>'language','english'),coalesce(v_line->>'display_mode','telugu')) RETURNING id INTO v_line_id;
      v_line_map := v_line_map || jsonb_build_object(coalesce(v_line->>'client_id',v_line_id::text),v_line_id::text);
    END LOOP;
  END LOOP;
  FOR v_slide IN SELECT * FROM jsonb_array_elements(coalesce(p_slides,'[]'::jsonb)) LOOP
    v_section_order := coalesce((v_slide->>'section_order')::int,0);
    INSERT INTO song_slides(song_id,section_id,section_order,slide_number,"order",primary_text,secondary_text,line_ids,display_mode) VALUES(v_song_id,(v_map->>coalesce(v_slide->>'section_client_id',v_section_order::text))::uuid,v_section_order,coalesce((v_slide->>'slide_number')::int,0),coalesce((v_slide->>'order')::int,0),coalesce(v_slide->>'primary_text',''),nullif(v_slide->>'secondary_text',''),ARRAY(SELECT coalesce(v_line_map->>line_id,line_id) FROM jsonb_array_elements_text(coalesce(v_slide->'line_ids','[]'::jsonb)) AS x(line_id)),coalesce(v_slide->>'display_mode','telugu'));
  END LOOP;
  RETURN v_song_id;
END; $$;

CREATE OR REPLACE FUNCTION public.save_service_bundle(p_service jsonb, p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_id uuid; v_item jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  v_id := nullif(p_service->>'id','')::uuid;
  IF v_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM services WHERE id=v_id AND created_by=v_user) THEN RAISE EXCEPTION 'Service not found or not owned'; END IF;
    UPDATE services SET name=trim(p_service->>'name'), date=(p_service->>'date')::date, description=nullif(trim(p_service->>'description'),''), status=coalesce(p_service->>'status','draft'), updated_at=now() WHERE id=v_id;
    DELETE FROM service_items WHERE service_id=v_id;
  ELSE
    INSERT INTO services(name,date,description,status,created_by) VALUES(trim(p_service->>'name'),(p_service->>'date')::date,nullif(trim(p_service->>'description'),''),coalesce(p_service->>'status','draft'),v_user) RETURNING id INTO v_id;
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) LOOP
    INSERT INTO service_items(service_id,type,song_id,bible_reference,bible_text,announcement_id,"order",notes) VALUES(v_id,v_item->>'type',nullif(v_item->>'song_id','')::uuid,nullif(v_item->>'bible_reference',''),nullif(v_item->>'bible_text',''),nullif(v_item->>'announcement_id','')::uuid,coalesce((v_item->>'order')::int,0),nullif(v_item->>'notes',''));
  END LOOP;
  RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.save_song_bundle(jsonb,jsonb,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_service_bundle(jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_song_bundle(jsonb,jsonb,jsonb), public.save_service_bundle(jsonb,jsonb) TO authenticated;
