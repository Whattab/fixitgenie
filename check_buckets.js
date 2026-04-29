import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need the service role key to reliably create a bucket, but we'll try with ANON first if that's all we have. Wait, anon doesn't have privileges to create buckets.
// Let's print the env to see what keys we have.
console.log(Object.keys(process.env));
