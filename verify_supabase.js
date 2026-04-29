import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple env parser
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            console.error(".env file not found at:", envPath);
            return {};
        }
        const envFile = fs.readFileSync(envPath, 'utf8');
        const env = {};
        // Normalize newlines and split
        envFile.replace(/\r\n/g, '\n').split('\n').forEach(line => {
            const index = line.indexOf('='); // Find first =
            if (index !== -1) {
                const key = line.substring(0, index).trim();
                let value = line.substring(index + 1).trim();

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                if (key) {
                    env[key] = value;
                }
            }
        });
        return env;
    } catch (e) {
        console.error("Error reading .env:", e.message);
        return {};
    }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log("Testing Supabase Connection...");
console.log("URL:", supabaseUrl);
console.log("Key:", supabaseKey ? supabaseKey.slice(0, 5) + "..." : "MISSING");

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);


async function testConnection() {
    try {
        console.log("Attempting raw fetch to Supabase...");
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        console.log("HTTP Status:", response.status, response.statusText);
        const text = await response.text();
        console.log("Response Body:", text);

    } catch (err) {
        console.error("Fetch Error:", err);
    }
}


testConnection();
