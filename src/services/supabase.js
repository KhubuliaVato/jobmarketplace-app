import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dunaaignfnagmspmvrbk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bmFhaWduZm5hZ21zcG12cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjU5MzksImV4cCI6MjA5NTkwMTkzOX0.3DW-heYSReXzAissQMbATBbeZkGmrDYCfoSWX_-B-h4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);