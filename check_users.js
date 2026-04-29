
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) {
            envConfig[key.trim()] = val.trim().replace(/"/g, '').replace(/\r/g, '');
        }
    });
}

const supabaseUrl = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']; // Might be undefined
const keyToUse = serviceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !keyToUse) {
    console.error("Missing SUPABASE env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, keyToUse);

async function listUsers() {
    const { data, error } = await supabase.from('profiles').select('email, type, id, role');
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log(`Found ${data.length} profiles:`);
        data.forEach(p => console.log(` - ${p.email}: [${p.type}] (Role: ${p.role})`));
    }
}

listUsers();
