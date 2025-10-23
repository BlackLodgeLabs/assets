const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use environment variable for live key

// Initialize Firestore
const firestore = new Firestore();

// Get the Stripe webhook signing secret from environment variables
// IMPORTANT: You MUST set this environment variable in Cloud Run
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Handles Stripe Webhook events, specifically checkout.session.completed
 *
 * @param {import('@google-cloud/functions-framework').Request} req
 * @param {import('@google-cloud/functions-framework').Response} res
 */
functions.http('stripeWebhookHandler', async (req, res) => {
  if (req.method !== 'POST') {
    console.log('Received non-POST request');
    return res.status(405).send('Method Not Allowed');
  }

  if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET environment variable not set.');
      return res.status(500).send('Webhook secret not configured.');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe using the signing secret
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    console.log(`Verified Stripe event: ${event.id}, type: ${event.type}`);

  } catch (err) {
    // On error, log and return the error message
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Extract customer email (handle different scenarios)
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.error('Could not extract customer email from session:', session.id);
      // Still send 200 OK to Stripe so it doesn't retry, but log the error
      return res.status(200).send('Success (but no email found)');
    }

    console.log(`Processing successful payment for: ${customerEmail}`);

    // Generate a simple unique license key (you might want a more robust method later)
    const licenseKey = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      // Save the license details to Firestore
      const licenseRef = firestore.collection('licenses').doc(customerEmail); // Use email as document ID
      await licenseRef.set({
        email: customerEmail,
        licenseKey: licenseKey,
        purchaseDate: new Date(),
        productId: session.metadata?.productId || 'UNKNOWN', // Store which product was bought if available
        planType: session.mode, // 'payment' for LTD, 'subscription' for recurring
        stripeCustomerId: session.customer, // Useful for managing subscriptions later
        stripeCheckoutSessionId: session.id
      }, { merge: true }); // Use merge:true to update if email already exists

      console.log(`License created/updated for ${customerEmail} with key ${licenseKey}`);

    } catch (dbError) {
      console.error(`Failed to save license for ${customerEmail}:`, dbError);
      // Send 500 so Stripe might retry, or handle failure differently
      return res.status(500).send('Database error');
    }
  } else {
    console.log(`Received unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).send('Received');
});
