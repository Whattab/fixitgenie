
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
const serviceRoleKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];
const keyToUse = serviceRoleKey || supabaseAnonKey;

const supabase = createClient(supabaseUrl, keyToUse);

async function checkReviewsTable() {
    console.log("Testing Profile <-> Reviews Relationships...");

    // 1. Fetch ALL reviews to confirm data exists and grab a sample pro_id
    const { data: allReviews, error: revError } = await supabase.from('reviews').select('*');
    if (revError) {
        console.log("❌ Error fetching raw reviews:", revError.message);
        return;
    }
    console.log(`✅ Raw Reviews Count: ${allReviews.length}`);

    if (allReviews.length === 0) {
        console.log("⚠️ No reviews in DB to test joins.");
        return;
    }

    const samplePro = allReviews[0].pro_id;
    console.log(`Testing join for Pro ID: ${samplePro}`);

    // 2. Test Ambiguous Query
    console.log("--- Test 1: Simple 'reviews' ---");
    const { data: d1, error: e1 } = await supabase.from('profiles').select('email, reviews(rating)').eq('id', samplePro);
    if (e1) console.log("FAILED:", e1.message);
    else console.log("RESULT:", JSON.stringify(d1, null, 2));

    // 3. Test Explicit Query (using reviews!pro_id)
    console.log("--- Test 2: Explicit 'reviews!pro_id' ---");
    const { data: d2, error: e2 } = await supabase.from('profiles').select('email, reviews!reviews_pro_id_fkey(rating)').eq('id', samplePro);
    // Note: 'reviews_pro_id_fkey' is the standard naming convention. Also trying just 'reviews!pro_id' is valid if unique constraint exists, but here we have two FKs.
    if (e2) {
        console.log("FAILED:", e2.message);
        // Try another syntax
        console.log("--- Test 3: Explicit 'reviews!pro_id' ---");
        const { data: d3, error: e3 } = await supabase.from('profiles').select('email, reviews!pro_id(rating)').eq('id', samplePro);
        if (e3) console.log("FAILED:", e3.message);
        else console.log("RESULT:", JSON.stringify(d3, null, 2));
    }
    else console.log("RESULT:", JSON.stringify(d2, null, 2));
}

checkReviewsTable();
