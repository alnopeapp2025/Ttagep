import { createClient } from '@supabase/supabase-js';

// استخدام المفاتيح مباشرة لضمان عمل الموقع على GitHub Pages
// Using keys directly to prevent runtime crashes on GitHub Pages due to missing env vars
const supabaseUrl = "https://nczyhfmkdxdnlxprqjhh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jenloZm1rZHhkbmx4cHJxamhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTg4NDYsImV4cCI6MjA4MzUzNDg0Nn0.fal6RC0pWxoaZMWNPlWywP0h9M2Ptgn3Fx0dMqLNf1A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
