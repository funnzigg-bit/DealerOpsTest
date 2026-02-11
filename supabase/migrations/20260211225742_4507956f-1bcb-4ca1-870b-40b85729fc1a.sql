
-- =============================================
-- Phase 6: Documents table + Storage bucket
-- =============================================

-- Create a documents table to track file metadata
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  category TEXT DEFAULT 'general',
  uploaded_by UUID,
  related_customer_id UUID REFERENCES public.customers(id),
  related_vehicle_id UUID REFERENCES public.vehicles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin full access on documents" ON public.documents FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Users can view own dealer documents" ON public.documents FOR SELECT USING (dealer_id = get_user_dealer_id());
CREATE POLICY "Users can insert own dealer documents" ON public.documents FOR INSERT WITH CHECK (dealer_id = get_user_dealer_id());
CREATE POLICY "Users can delete own dealer documents" ON public.documents FOR DELETE USING (dealer_id = get_user_dealer_id());

-- Create storage bucket for dealer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('dealer-documents', 'dealer-documents', false);

-- Storage policies: users can manage files in their dealer folder
CREATE POLICY "Users can upload dealer documents" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dealer-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view dealer documents" ON storage.objects FOR SELECT
  USING (bucket_id = 'dealer-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete dealer documents" ON storage.objects FOR DELETE
  USING (bucket_id = 'dealer-documents' AND auth.uid() IS NOT NULL);
