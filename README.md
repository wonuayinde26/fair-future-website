# Fair Future

A full-stack web platform for Fair Future, a student-support organisation that connects students with work experience, volunteering opportunities, and funding support.

**Live site:** [fairfuturecic.co.uk](https://fairfuturecic.co.uk)

## About

Fair Future helps students find work and volunteering opportunities, and provides a route for students to request funding for things like open day travel or equipment. The site lets applicants submit requests through dedicated forms, tracks their status via a personal dashboard, and routes each submission to the right team member automatically.

## Features

- **Applicant intake forms** — separate forms for Health, Career, and Access (funding) requests, each tailored to what that request type needs
- **Volunteer applications** — a form for people wanting to help the Fair Future team, with a ranked preference system across the organisation's different strands (events & fundraising, partnerships, healthcare, careers, finance, communications & media)
- **School partnership enquiries** — a form for schools wanting to set up fundraising partnerships with Fair Future
- **Accounts & dashboards** — login-gated submissions so every request is tied to an account; applicants/volunteers and schools each get a dashboard showing their own submissions and status
- **Automated notifications** — each submission triggers an email with the full details to the relevant team inbox (different addresses for Health, Career, Access, Schools, and Volunteers)
- **Donations** — Stripe-powered donation flow
- **Browse opportunities** — a curated directory of external programmes (university outreach schemes, summer schools, volunteering programmes) students can browse and click through to

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js
- **Database:** Supabase
- **Payments:** Stripe
- **Email:** Gmail SMTP (transactional notification emails), moving to Resend
- **Hosting:** Railway

## How It Works

1. A user fills in one of the intake forms (Health, Career, Access, Volunteer, or School) on the frontend
2. On submit, the form data is sent to the Node.js backend
3. The backend writes the submission to Supabase, linked to the logged-in account
4. The backend sends a notification email — with the full submission details — to whichever team inbox owns that form type (e.g. Access requests go to the finance inbox, Health requests go to the healthcare inbox)
5. The applicant can log in at any time and see their own submissions and status on their dashboard
6. Donations follow a separate flow: the frontend calls the backend to create a Stripe Checkout session, and the user is redirected to Stripe to complete payment

## Getting Started

Clone the repo and install backend dependencies:

```bash
git clone https://github.com/wonuayinde26/fair-future-website.git
cd fair-future-website/server
npm install
```

Create a `.env` file inside `server/` with the following (values are not included in this repo — request them from the project owner if you need to run it locally):

```
SUPABASE_URL=
SUPABASE_KEY=
STRIPE_SECRET_KEY=
EMAIL_USER=
EMAIL_PASS=
```

Then start the backend:

```bash
npm start
```

The frontend pages (`index.html`, `health.html`, etc.) can then be opened directly or served with any static file server.

## Security & Data Handling

- Secrets (Stripe keys, Supabase credentials, email credentials) are kept out of version control via `.gitignore` and loaded from environment variables
- Login is required before any form submission, so requests are reliably linked to an account rather than matched by email
- Applicant data is only used to route requests to the relevant team member — no data is shared outside the organisation

## Project Structure

```
├── index.html, health.html, career.html, access.html, ...   # frontend pages
├── applicants.css, login.css, ...                            # styles
├── script.js                                                 # frontend logic
├── images/                                                   # logo, team photos
├── server/                                                    # Node.js backend
│   └── .env (not committed) — Supabase, Stripe & email credentials
└── .gitignore
```

## Author

Built by [Omowonuola Ayinde](https://github.com/wonuayinde26), Finance & Partnership Lead at Fair Future.
