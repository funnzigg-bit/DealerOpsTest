
-- Create the has_role helper function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Dealer announcements for bulk messaging
CREATE TABLE public.dealer_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_dealer_ids UUID[] DEFAULT NULL,
  target_all_dealers BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.dealer_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage announcements"
  ON public.dealer_announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Dealers can read their announcements"
  ON public.dealer_announcements FOR SELECT
  TO authenticated
  USING (
    target_all_dealers = true
    OR (SELECT p.dealer_id FROM public.profiles p WHERE p.id = auth.uid()) = ANY(target_dealer_ids)
  );

-- Feature flags per dealer
CREATE TABLE public.dealer_feature_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id UUID REFERENCES auth.users(id),
  UNIQUE(dealer_id, feature_key)
);

ALTER TABLE public.dealer_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage feature flags"
  ON public.dealer_feature_flags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Dealers can read own feature flags"
  ON public.dealer_feature_flags FOR SELECT
  TO authenticated
  USING (
    dealer_id = (SELECT p.dealer_id FROM public.profiles p WHERE p.id = auth.uid())
  );
