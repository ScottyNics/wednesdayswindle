// Public browser connection settings. These do not grant admin privileges.
// Supabase sign-in and row-level security control access to records.
export const projectUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://egtwufvsovvfedqijplz.supabase.co';
export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_8Ljx5EBt26qAZ9GsnVZg5Q_KmmmLnuK';
