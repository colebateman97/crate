import { createClient } from '@supabase/supabase-js'

// Anon/publishable key is safe in client code — security is enforced by Supabase RLS rules
export const supabase = createClient(
  'https://jmnlhcmdqosllfasmsfv.supabase.co',
  'sb_publishable_mOPKaGardplzx0hdG7_Ckw_JQKkTayH',
)
