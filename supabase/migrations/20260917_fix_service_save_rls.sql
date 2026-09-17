-- Fix service saves without changing or deleting existing data.
-- The client always supplies created_by; keep all service operations scoped to auth.uid().
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Services viewable by owner" ON public.services;
DROP POLICY IF EXISTS "Services insertable by authenticated" ON public.services;
DROP POLICY IF EXISTS "Services updatable by owner" ON public.services;
DROP POLICY IF EXISTS "Services deletable by owner" ON public.services;
CREATE POLICY "Services viewable by owner" ON public.services FOR SELECT
  USING (created_by = auth.uid());
CREATE POLICY "Services insertable by authenticated" ON public.services FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Services updatable by owner" ON public.services FOR UPDATE
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Services deletable by owner" ON public.services FOR DELETE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Service items viewable by owner" ON public.service_items;
DROP POLICY IF EXISTS "Service items insertable by authenticated" ON public.service_items;
DROP POLICY IF EXISTS "Service items updatable by owner" ON public.service_items;
DROP POLICY IF EXISTS "Service items deletable by owner" ON public.service_items;
CREATE POLICY "Service items viewable by owner" ON public.service_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_items.service_id AND s.created_by = auth.uid()));
CREATE POLICY "Service items insertable by authenticated" ON public.service_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_items.service_id AND s.created_by = auth.uid()));
CREATE POLICY "Service items updatable by owner" ON public.service_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_items.service_id AND s.created_by = auth.uid()));
CREATE POLICY "Service items deletable by owner" ON public.service_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_items.service_id AND s.created_by = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_services_created_by_date ON public.services(created_by, date DESC);
CREATE INDEX IF NOT EXISTS idx_service_items_service_order ON public.service_items(service_id, "order");
