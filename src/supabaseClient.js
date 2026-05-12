import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tiakdzfaeqsutyfutkrb.supabase.co'
const supabaseAnonKey = 'sb_publishable_r1D15BZrKDf6celB66CXKw_0oliHU2s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)