
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kiorypptbwdafalmqzpi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpb3J5cHB0YndkYWZhbG1xenBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDIwNTgsImV4cCI6MjA4NTExODA1OH0.0b9XkeoSxcVJ8Y-_QHCkwok3U-q5J9qeHDW4em6u3wU';

// Debugging: Check if keys are loaded
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase Environment Variables!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
