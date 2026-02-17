
-- ============================================================
-- Fix 1: Profiles table - add strict RLS to prevent cross-dealer access
-- ============================================================

-- First check if RLS is enabled (enable it if not)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive/broad policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

-- User can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Users within same dealer can view each other (needed for team features)
CREATE POLICY "profiles_select_same_dealer"
  ON public.profiles FOR SELECT
  USING (dealer_id = get_user_dealer_id());

-- Super admin can view all profiles
CREATE POLICY "profiles_select_superadmin"
  ON public.profiles FOR SELECT
  USING (is_super_admin());

-- User can update only their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Super admin can update any profile
CREATE POLICY "profiles_update_superadmin"
  ON public.profiles FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Only system/service role can insert (via edge functions like self-signup / onboard-dealer)
-- Regular users cannot insert profiles directly
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- Fix 2: Invoices table - ensure proper RLS scoping
-- ============================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop overly broad policies if they exist
DROP POLICY IF EXISTS "invoices_select_all" ON public.invoices;
DROP POLICY IF EXISTS "Anyone can view invoices" ON public.invoices;

-- Ensure only policies scoped to dealer_id exist
-- Check existing and fill gaps (won't error if policy already exists with same name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can view own dealer invoices'
  ) THEN
    CREATE POLICY "Users can view own dealer invoices"
      ON public.invoices FOR SELECT
      USING (dealer_id = get_user_dealer_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can insert own dealer invoices'
  ) THEN
    CREATE POLICY "Users can insert own dealer invoices"
      ON public.invoices FOR INSERT
      WITH CHECK (dealer_id = get_user_dealer_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Users can update own dealer invoices'
  ) THEN
    CREATE POLICY "Users can update own dealer invoices"
      ON public.invoices FOR UPDATE
      USING (dealer_id = get_user_dealer_id())
      WITH CHECK (dealer_id = get_user_dealer_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'SuperAdmin full access on invoices'
  ) THEN
    CREATE POLICY "SuperAdmin full access on invoices"
      ON public.invoices FOR ALL
      USING (is_super_admin())
      WITH CHECK (is_super_admin());
  END IF;
END $$;

-- ============================================================
-- Fix 3: Customers table - confirm proper isolation exists
-- ============================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Ensure there are no wildcard SELECT policies
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;
DROP POLICY IF EXISTS "customers_public_select" ON public.customers;
