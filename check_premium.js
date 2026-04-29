import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseAnonKey = envConfig['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPremium() {
    const { data, error } = await supabase.from('profiles').select('email, name, is_premium').eq('type', 'professional');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Professionals:");
        data.forEach(p => console.log(`- ${p.email} | is_premium: ${p.is_premium}`));
    }
}
checkPremium();
