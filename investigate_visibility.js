
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
            envConfig[key.trim()] = val.trim().replace(/"/g, '').replace(/\r/g, ''); // Basic clean
        }
    });
}

const supabaseUrl = envConfig['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig['VITE_SUPABASE_ANON_KEY'] || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)");
    process.exit(1);
}

// Clients
const adminClient = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey); // Fallback if no service key
const authClient = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
    console.log("--- Starting Visibility Investigation ---");

    // 1. Create a Homeowner
    const hoEmail = `test_ho_${Date.now()}@example.com`;
    const hoPassword = 'password123';
    console.log(`1. Creating Homeowner: ${hoEmail}`);
    const { data: hoData, error: hoError } = await authClient.auth.signUp({
        email: hoEmail,
        password: hoPassword,
    });
    if (hoError) { console.error("Sign up failed:", hoError); return; }
    const hoId = hoData.user.id;

    // Create Profile for HO
    await adminClient.from('profiles').insert({ id: hoId, name: 'Test Homeowner', type: 'homeowner', role: 'user' });

    // Login as HO
    const { data: hoSession } = await authClient.auth.signInWithPassword({ email: hoEmail, password: hoPassword });
    const hoClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${hoSession.session.access_token}` } }
    });


    // 2. Create a Request as HO
    console.log("2. Posting Service Request...");
    const { data: request, error: reqError } = await hoClient
        .from('service_requests')
        .insert({
            user_id: hoId,
            category: 'Plumbing',
            details: 'Test Leak',
            urgency: 'Urgent',
            city_state: 'Test City',
            status: 'open'
        })
        .select()
        .single();

    if (reqError) { console.error("Request creation failed:", reqError); return; }
    console.log("   Request Created ID:", request.id);


    // 3. Verify HO can see it
    console.log("3. Verifying HO visibility...");
    const { data: myRequests, error: visError } = await hoClient
        .from('service_requests')
        .select('*')
        .eq('user_id', hoId);

    if (visError) console.error("HO fetch failed:", visError);
    else console.log(`   HO sees ${myRequests.length} requests. Correct? ${myRequests.length === 1}`);


    // 4. Create a Pro
    const proEmail = `test_pro_${Date.now()}@example.com`;
    console.log(`4. Creating Pro: ${proEmail}`);
    const { data: proData, error: proError } = await authClient.auth.signUp({
        email: proEmail,
        password: hoPassword,
    });
    if (proError) { console.error("Sign up failed:", proError); return; }
    const proId = proData.user.id;

    // Create Profile for Pro
    await adminClient.from('profiles').insert({ id: proId, name: 'Test Pro', type: 'professional', role: 'user', vetting_status: 'approved' });

    // Login as Pro
    const { data: proSession } = await authClient.auth.signInWithPassword({ email: proEmail, password: hoPassword });
    const proClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${proSession.session.access_token}` } }
    });


    // 5. Verify Pro can see the OPEN request
    console.log("5. Verifying Pro visibility of OPEN request...");
    const { data: openReqs, error: openError } = await proClient
        .from('service_requests')
        .select('*')
        .eq('id', request.id);

    if (openError) console.error("Pro fetch open failed:", openError);
    else console.log(`   Pro sees request? ${openReqs.length > 0}`);


    // 6. Pro Bids on Request
    console.log("6. Pro Bids on Request...");
    const { data: bid, error: bidError } = await proClient
        .from('bids')
        .insert({
            request_id: request.id,
            pro_id: proId,
            pro_name: 'Test Pro',
            price_estimate: '$100',
            message: 'I can fix it'
        })
        .select()
        .single();

    if (bidError) { console.error("Bid failed:", bidError); }
    else { console.log("   Bid Created ID:", bid.id); }


    // 7. Verify Pro can see "My Bids" AND the request details
    console.log("7. Verifying Pro 'My Bids' + Request Details...");
    const { data: myBids, error: myBidsError } = await proClient
        .from('bids')
        .select('*, request:service_requests(*)')
        .eq('pro_id', proId);

    if (myBidsError) console.error("Pro My Bids fetch failed:", myBidsError);
    else {
        console.log(`   Pro sees ${myBids.length} bids.`);
        if (myBids.length > 0) {
            console.log("   Bid:", myBids[0].id);
            console.log("   Attached Request:", myBids[0].request ? "VISIBLE" : "NULL (HIDDEN!)");
            if (!myBids[0].request) console.error("!!! FAIL: Request details are hidden from Pro !!!");
        }
    }

    // 8. Accept the Bid (Homeowner Action)
    console.log("8. Accepting Bid (Status -> assigned)...");
    await hoClient.from('bids').update({ status: 'accepted' }).eq('id', bid.id);
    await hoClient.from('service_requests').update({ status: 'assigned' }).eq('id', request.id);

    // 9. Verify Pro can STILL see the request (RLS check for non-open requests)
    console.log("9. Verifying Pro visibility for ASSIGNED request...");
    const { data: assignedBids, error: assignedError } = await proClient
        .from('bids')
        .select('*, request:service_requests(*)')
        .eq('pro_id', proId);

    if (assignedError) console.error("Fetch failed:", assignedError);
    else {
        // Find the bid
        const b = assignedBids.find(x => x.id === bid.id);
        if (b) {
            console.log("   Bid Found.");
            console.log("   Attached Request:", b.request ? "VISIBLE" : "NULL (HIDDEN!)");
            if (!b.request) console.error("!!! FAIL: Request details are hidden from Pro AFTER assignment !!!");
            else console.log("   SUCCESS: Pro sees request even when assigned.");
        } else {
            console.error("   Bid not found in list?!");
        }
    }
    // 10. Simulate Homeowner Dashboard Fetch (Final Check)
    console.log("10. Simulating Fetch with profiles!bids_pro_id_fkey...");
    const { data: hoBids, error: hoBidError } = await hoClient
        .from('bids')
        .select(`
            *, 
            profiles!bids_pro_id_fkey (
                vetting_status,
                reviews (rating)
            )
        `)
        .in('request_id', [request.id]);

    if (hoBidError) {
        console.error("!!! FAIL (profiles!bids_pro_id_fkey):", hoBidError.message);

        // Final attempt: Read metadata? No, just fail.
    } else {
        console.log("   Fetch Successful with profiles!bids_pro_id_fkey.");
        if (hoBids.length > 0) {
            console.log("   Profile Vetting:", hoBids[0].profiles?.vetting_status || "N/A");
            console.log("   SUCCESS!");
        }
    }
    // 10. Was Step 10 (Skipped/Failed)

    // 11. Simulating Manual Two-Step Fetch...
    console.log("11. Simulating Manual Two-Step Fetch...");
    // A. Fetch Bids
    const { data: rawBids, error: rawError } = await hoClient
        .from('bids')
        .select('*')
        .in('request_id', [request.id]);

    if (rawError) console.error("   Fail A (Bids):", rawError.message);
    else {
        console.log("   Got Raw Bids:", rawBids.length);
        if (rawBids.length > 0) {
            const proIds = [...new Set(rawBids.map(b => b.pro_id))];
            // B. Fetch Profiles
            const { data: pros, error: proError } = await hoClient
                .from('profiles')
                .select('id, vetting_status, reviews(rating)')
                .in('id', proIds);

            if (proError) console.error("   Fail B (Profiles):", proError.message);
            else {
                console.log("   Got Profiles:", pros.length);
                console.log("   Vetting:", pros[0]?.vetting_status);
                console.log("   Reviews:", pros[0]?.reviews?.length || 0);
                console.log("   SUCCESS! Manual fetch works.");
            }
        }
    }

}

runTest();
