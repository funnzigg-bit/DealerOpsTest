
-- Create review_requests table
CREATE TABLE public.review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_info TEXT,
  platform TEXT NOT NULL DEFAULT 'google',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_rating INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dealer review requests"
  ON public.review_requests FOR SELECT
  USING (dealer_id = get_user_dealer_id());

CREATE POLICY "Users can create own dealer review requests"
  ON public.review_requests FOR INSERT
  WITH CHECK (dealer_id = get_user_dealer_id());

CREATE POLICY "Users can update own dealer review requests"
  ON public.review_requests FOR UPDATE
  USING (dealer_id = get_user_dealer_id());

CREATE POLICY "SuperAdmin full access on review_requests"
  ON public.review_requests FOR ALL
  USING (is_super_admin());
