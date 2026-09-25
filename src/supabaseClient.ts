import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev/build if the .env file wasn't set up correctly.
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diisi. Salin .env.example ke .env.local dan isi nilainya."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
