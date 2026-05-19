// supabase/functions/send-sms/index.ts
// ---------------------------------------------------------------------------
// Send-sms — Database Webhook handler for service_requests INSERT
//
// Triggered by Supabase Database Webhook on:
//   table: service_requests  |  event: INSERT
//
// Finds premium professionals (is_premium = true, vetting_status = 'approved')
// whose active_zipcode matches the new request's zip code, looks up their phone
// from professional_details.onboarding_data.phone, and texts them an alert.
//
// Source-of-truth lives in this repo. To deploy: paste this code into the
// Supabase Dashboard's Edge Function editor for the function named
// "Send-sms" (URL slug "clever-endpoint") and click Deploy. The Dashboard
// remains the only place where the function actually runs.
//
// TODO(rate-limiting): No throttling. If many pros match a zip code, the
//   function fires an SMS per pro in a tight loop. Add rate limiting before
//   high-volume launch (e.g. cap at N SMS per minute, dedupe per recipient).
//
// TODO(international): Phone normalization assumes US (+1). Non-US pros
//   will fail to receive SMS until format handling is generalized.
// ---------------------------------------------------------------------------

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Twilio credentials from Supabase Edge Function Secrets
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// Supabase native credentials (automatically provided by Supabase Edge environment)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Received Payload:", JSON.stringify(payload));

    const record = payload.record;
    if (!record) {
      return new Response("No record found in payload", { status: 400 });
    }

    // Extract the zip code from city_state since we store it as "City, State 12345" or just "12345"
    const cityState = record.city_state || '';
    const zipCodeMatch = cityState.match(/\b\d{5}\b/);
    if (!zipCodeMatch) {
       console.log("No zip code found in city_state:", cityState);
       return new Response("No valid zip code extracted", { status: 200 });
    }
    const targetZip = zipCodeMatch[0];

    console.log("Target Zip Code for Job:", targetZip);
    console.log("Job Category:", record.category);

    // Fetch professionals in this exact zip code whose status is completely approved
    const { data: pros, error } = await supabase
      .from('profiles')
      .select('id, name, type, vetting_status, zipcode')
      .eq('type', 'professional')
      .eq('vetting_status', 'approved')
       .eq('is_premium', true)
      .eq('active_zipcode', targetZip);

    if (error) {
      console.error("Error fetching professionals:", error);
      return new Response("Database error", { status: 500 });
    }

    if (!pros || pros.length === 0) {
      console.log(`Found 0 approved professionals in zip code ${targetZip}`);
      return new Response("No target professionals found", { status: 200 });
    }

    console.log(`Found ${pros.length} matching professionals. Requesting phone data...`);

    // Fetch phone numbers for these specific professionals from their JSON onboarding_data
    const proIds = pros.map(p => p.id);
    const { data: detailsList, error: detailsError } = await supabase
      .from('professional_details')
      .select('pro_id, onboarding_data')
      .in('pro_id', proIds);

    if (detailsError) {
      console.error("Error fetching professional details:", detailsError);
      return new Response("Database error details", { status: 500 });
    }

    let successCount = 0;

    for (const detail of detailsList) {
       let phone = detail.onboarding_data?.phone;

       if (!phone) {
         console.log(`No phone number recorded for pro_id ${detail.pro_id}`);
         continue;
       }

       // Format phone for Twilio (Assumes US +1 by default)
       phone = phone.replace(/\D/g, ''); // strip non-numeric
       if (phone.length === 10) {
         phone = '+1' + phone;
       } else if (!phone.startsWith('+')) {
         phone = '+' + phone;
       }

       console.log(`Attempting to send SMS to ${phone} for Job: ${record.category}`);

       // Call Twilio SMS API
       const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
       const bodyParams = new URLSearchParams();
       bodyParams.append('To', phone);
       bodyParams.append('From', TWILIO_PHONE_NUMBER);
       bodyParams.append('Body', `FixIt Hub Alert: A new ${record.category} job was just posted in your precise area (${targetZip})! Log in to view details and bid right now. Reply STOP to opt out.`);

       const twilioResponse = await fetch(twilioUrl, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
           'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
         },
         body: bodyParams.toString()
       });

       const twilioResult = await twilioResponse.json();

       if (twilioResponse.ok) {
          console.log(`SMS successfully sent to ${phone}: SID ${twilioResult.sid}`);
          successCount++;
       } else {
          console.error(`Twilio Error sending to ${phone}:`, twilioResult);
       }
    }

    return new Response(JSON.stringify({ successCount }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error("Unhandled Error:", err);
    return new Response("Internal Error", { status: 500 });
  }
});
