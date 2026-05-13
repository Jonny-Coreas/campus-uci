import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://tiakdzfaeqsutyfutkrb.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_r1D15BZrKDf6celB66CXKw_0oliHU2s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
