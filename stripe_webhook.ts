import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=denonext';

// Initialize Supabase Client internally
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// We grab the Stripe Secret Key directly from your Supabase Edge Function Secrets
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16', // Uses modern Stripe SDK
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // To prevent hackers, Stripe cryptographically signs the event in the header
  const signature = req.headers.get('stripe-signature');
  const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  try {
    const body = await req.text();
    let event;

    try {
      // Very securely decrypt and verify the origin of this payload
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature!,
        endpointSecret!,
        undefined,
        cryptoProvider
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // -------------------------------------------------------------
    // PHASE 4: The Golden Rule - A custom has successfully paid!
    // -------------------------------------------------------------
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Because we passed '?client_reference_id=' in the URL earlier, it is magically here!
      const userId = session.client_reference_id;

      if (userId) {
        console.log(`Payment confirmed for User ID: ${userId}. Upgrading to Premium...`);

        // FLIP THE MASTER KEY
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);

        if (error) {
          console.error(`FAILED to upgrade user ${userId}:`, error);
        } else {
          console.log(`MASSIVE SUCCESS! User ${userId} is now a Premium Pro!`);
        }
      } else {
        console.error('No client_reference_id found in the checkout session.');
      }
    }

    // Acknowledge receipt back to Stripe so they stop retrying
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Unhandled webhook error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
});
