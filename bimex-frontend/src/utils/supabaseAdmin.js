import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseAdmin =
  url && key && !url.includes("placeholder")
    ? createClient(url, key)
    : null;
