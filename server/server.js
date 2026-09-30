// This is the entry point for your backend server.

const express = require('express');
require('dotenv').config();
const { Pool } = require('pg');
const { Resend } = require('resend');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
// Railway (and most hosts) assign a port via an environment variable.
// Locally, that variable won't exist, so we fall back to 3000.
const PORT = process.env.PORT || 3000;

// --- STRIPE WEBHOOK ---
// This route MUST come before app.use(express.json()) below, because
// Stripe needs the raw, unprocessed request body to verify the signature -
// if express.json() parses it first, verification will fail.
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // This checks the request genuinely came from Stripe (not someone
    // pretending to be Stripe) using the webhook signing secret.
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // We only care about successful checkouts for now.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      await pool.query(
        `INSERT INTO donations (stripe_session_id, amount, currency, recurring, donor_email)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stripe_session_id) DO NOTHING`,
        [
          session.id,
          session.amount_total / 100, // Stripe sends pence, we store pounds
          session.currency,
          session.mode === 'subscription',
          session.customer_details?.email || null,
        ]
      );

      sendNotification('access', 'New Donation Received', [
        `Amount: £${(session.amount_total / 100).toFixed(2)}`,
        `Type: ${session.mode === 'subscription' ? 'Monthly (recurring)' : 'One-time'}`,
        `Donor email: ${session.customer_details?.email || 'Not provided'}`,
      ]);
    } catch (err) {
      console.error('Failed to save donation:', err);
    }
  }

  // Stripe expects a fast 200 response just to confirm we received the event.
  res.status(200).json({ received: true });
});

app.use(express.json());

// Only these origins are allowed to make requests to this backend.
// Your live domain (both with and without www), plus localhost so you
// can keep testing on your own computer with Live Server.
const ALLOWED_ORIGINS = [
  'https://fairfuturecic.co.uk',
  'https://www.fairfuturecic.co.uk',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Sets up the connection to Gmail's SMTP using the app password from .env.
// This "transporter" is reused for every email we send.
// Resend sends email over a normal HTTPS API call instead of raw SMTP -
// this is what sidesteps Railway blocking outbound SMTP ports.
const resend = new Resend(process.env.RESEND_API_KEY);

// Where each category's notification email should go.
const NOTIFICATION_EMAILS = {
  health: 'fairfuturehealthcare@gmail.com',
  career: 'fairfuturecareers@gmail.com',
  access: 'fairfuturefinance@gmail.com',
  schools: 'olapartnershipsinquiry@gmail.com',
  volunteers: 'volunteerforfairfuture@gmail.com',
};

// A reusable helper: sends a notification email to the right team address.
// 'category' picks the recipient, 'subject' and 'bodyLines' build the message.
// This one function is used by all five submission routes below.
async function sendNotification(category, subject, bodyLines) {
  const to = NOTIFICATION_EMAILS[category];

  // bodyLines is an array of "Label: value" strings - joined with line breaks
  // so the email is easy to scan, e.g. ["Name: Jane Doe", "Email: jane@..."]
  const text = bodyLines.join('\n');

  try {
    const { error } = await resend.emails.send({
      from: 'Fair Future Notifications <notifications@fairfuturecic.co.uk>',
      to,
      replyTo: 'infofairfuture@gmail.com',
      subject,
      text,
    });

    // Resend doesn't throw on failure the way nodemailer did - it returns
    // an "error" object instead, so we check for that explicitly.
    if (error) {
      console.error('Email failed to send:', error);
    }
  } catch (err) {
    // We log this but don't stop the request - the database save already
    // succeeded, so a failed email shouldn't make the whole submission fail.
    console.error('Email failed to send:', err);
  }
}

// Test routes
app.get('/', (req, res) => {
  res.send('Fair Future backend is running!');
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`Database connected! Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Database connection failed - check your .env file and connection string.');
  }
});

// --- HEALTH FORM SUBMISSION ---
app.post('/submit-health', async (req, res) => {
  const { fullName, email, ranking, othersDetail } = req.body;

  if (!fullName || !email || !ranking) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO health_requests (full_name, email, ranking, others_detail)
       VALUES ($1, $2, $3, $4)`,
      [fullName, email, JSON.stringify(ranking), othersDetail || null]
    );

    // Respond right away - the submission is safely saved. The email below
    // happens in the background, so a slow or failing email never delays
    // the person's confirmation.
    res.status(201).json({ message: 'Health request saved successfully.' });

    sendNotification('health', 'New Health Request', [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Ranking (1st to last): ${ranking.join(', ')}`,
      `Others detail: ${othersDetail || 'N/A'}`,
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your request.' });
  }
});

// --- CAREER FORM SUBMISSION ---
app.post('/submit-career', async (req, res) => {
  const { fullName, email, aspiration, ranking, othersDetail } = req.body;

  if (!fullName || !email || !ranking) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO career_requests (full_name, email, aspiration, ranking, others_detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [fullName, email, aspiration || null, JSON.stringify(ranking), othersDetail || null]
    );

    res.status(201).json({ message: 'Career request saved successfully.' });

    sendNotification('career', 'New Career Request', [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Wants to be: ${aspiration || 'N/A'}`,
      `Ranking (1st to last): ${ranking.join(', ')}`,
      `Others detail: ${othersDetail || 'N/A'}`,
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your request.' });
  }
});

// --- ACCESS (FUNDING) FORM SUBMISSION ---
app.post('/submit-access', async (req, res) => {
  const { fullName, email, school, fundingReason, amount } = req.body;

  if (!fullName || !email || !school || !fundingReason || !amount) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO access_requests (full_name, email, school, funding_reason, amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [fullName, email, school, fundingReason, amount]
    );

    res.status(201).json({ message: 'Access request saved successfully.' });

    sendNotification('access', 'New Access (Funding) Request', [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `School: ${school}`,
      `Funding reason: ${fundingReason}`,
      `Amount requested: £${amount}`,
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your request.' });
  }
});

// --- VOLUNTEER APPLICATION SUBMISSION ---
app.post('/submit-volunteer', async (req, res) => {
  const { fullName, email, phone, strandRanking, motivation } = req.body;

  if (!fullName || !email || !phone || !strandRanking || !motivation) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO volunteer_applications (full_name, email, phone, strand_ranking, motivation)
       VALUES ($1, $2, $3, $4, $5)`,
      [fullName, email, phone, JSON.stringify(strandRanking), motivation]
    );

    res.status(201).json({ message: 'Volunteer application saved successfully.' });

    sendNotification('volunteers', 'New Volunteer Application', [
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Strand ranking (1st to last): ${strandRanking.join(', ')}`,
      `Motivation: ${motivation}`,
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your application.' });
  }
});

// --- SCHOOL INQUIRY SUBMISSION ---
app.post('/submit-school', async (req, res) => {
  const { schoolName, address, email, phone, fundraisingIdea, partnershipType, preferredDate, supportNeeded } = req.body;

  if (!schoolName || !address || !email || !phone || !fundraisingIdea || !partnershipType || !supportNeeded) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    await pool.query(
      `INSERT INTO school_inquiries (school_name, address, email, phone, fundraising_idea, partnership_type, preferred_date, support_needed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [schoolName, address, email, phone, fundraisingIdea, partnershipType, preferredDate || null, supportNeeded]
    );

    res.status(201).json({ message: 'School inquiry saved successfully.' });

    sendNotification('schools', 'New School Fundraising Inquiry', [
      `School: ${schoolName}`,
      `Address: ${address}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Fundraising idea: ${fundraisingIdea}`,
      `Partnership type: ${partnershipType}`,
      `Preferred date: ${preferredDate || 'Not specified'}`,
      `Support needed: ${supportNeeded}`,
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving your inquiry.' });
  }
});

// --- CREATE A STRIPE CHECKOUT SESSION (for donations) ---
// This does NOT require login - anyone should be able to donate.
app.post('/create-checkout-session', async (req, res) => {
  const { amount, recurring, successUrl, cancelUrl } = req.body;

  // amount comes in as pounds (e.g. 10 for £10) - Stripe wants pence.
  const amountInPence = Math.round(Number(amount) * 100);

  if (!amount || amountInPence <= 0) {
    return res.status(400).json({ error: 'Please enter a valid donation amount.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      // 'subscription' charges monthly and repeats; 'payment' charges once.
      mode: recurring ? 'subscription' : 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: recurring ? 'Monthly donation to Fair Future' : 'Donation to Fair Future',
            },
            unit_amount: amountInPence,
            // Only include "recurring" at all when this is a subscription -
            // Stripe rejects it for one-time payments.
            ...(recurring && { recurring: { interval: 'month' } }),
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Send the Checkout page URL back - the frontend will redirect the
    // browser there to actually collect payment.
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong starting your donation.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});