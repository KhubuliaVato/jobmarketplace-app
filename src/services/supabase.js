import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://dunaaignfnagmspmvrbk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bmFhaWduZm5hZ21zcG12cmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjU5MzksImV4cCI6MjA5NTkwMTkzOX0.3DW-heYSReXzAissQMbATBbeZkGmrDYCfoSWX_-B-h4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,        // 🔧 სესია AsyncStorage-ში ინახება
    autoRefreshToken: true,       // 🔧 JWT ავტომატურად ახლდება
    persistSession: true,         // 🔧 აპის გადატვირთვის მერეც რჩება
    detectSessionInUrl: false,    // 🔧 მობილურზე URL-სესია არ გვჭირდება
  },
});