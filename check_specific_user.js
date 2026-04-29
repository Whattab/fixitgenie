import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking for fixitgenied2026@gmail.com...");
    
    // Check auth.users (requires service role)
    const { data: users, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
        console.error("Auth Error:", authErr);
    } else {
        const user = users.users.find(u => u.email === 'fixitgenied2026@gmail.com');
        console.log("Auth User:", user ? `Found (ID: ${user.id})` : "Not found in auth.users");
        
        if (user) {
            // Check profiles
            const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            console.log("Profile Data:", profile || "No profile found", profErr || "");
        }
    }
}
check();
