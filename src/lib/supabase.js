import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ithesyrynjhlhrzzpccv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0aGVzeXJ5bmpobGhyenpwY2N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjUwMDEsImV4cCI6MjA4OTc0MTAwMX0.53ax0Feu3OVVNvcPano3pKHLz--0ZGEzWCvKuvf1zbM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
