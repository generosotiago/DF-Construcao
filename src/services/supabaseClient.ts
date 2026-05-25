import { createClient } from '@supabase/supabase-js'


const supabaseUrl = 'https://avajxllhxkfycinnpcgw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2YWp4bGxoeGtmeWNpbm5wY2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MTIwOTUsImV4cCI6MjA5NTA4ODA5NX0.LhIoVLsJSVU_CUunEuq6aHvMFuCcl6V5aTdDQjL_DyM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)