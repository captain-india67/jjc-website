# Johannesburg Junior Council website

Static HTML, CSS and JS. Hosted on Netlify, deployed automatically from this repo. Service-hour logging uses Supabase (Google sign-in + Postgres).

## How deploys work

Push to `main` and Netlify rebuilds the site. No build step: the repo root is published as-is (`netlify.toml`).

One-time setup: in Netlify open the existing site, then **Site configuration > Build & deploy > Continuous deployment > Link repository** and pick this repo. Leave the build command empty and the publish directory as `.`.

## Editing content

- **Events**: edit `events.js`. One object per event. Leave `start`, `end` or `venue` empty to show "TBC". Past events move to the "Already done" section automatically.
- **Schools and committees**: the lists live at the top of the page files (`schools.html`, `committees.html`) and in the dropdowns on `log-hours.html`.
- **Contact**: the email address appears in the footer of every page, `contact.html`, `about.html` and `centenary.html`.

## Backend setup (once)

1. **Supabase project**: make sure it is not paused (free projects pause after a week without traffic; the dashboard shows a Restore button).
2. **Keys**: Project Settings > API. Paste the Project URL and the `anon public` key into `backend/supabase-client.js`. Never the `service_role` key.
3. **Database**: SQL Editor > New query > paste all of `backend/schema.sql` > Run. Safe to run again later.
4. **Google sign-in**:
   - Supabase: Authentication > Providers > Google > enable, paste the Google client ID and secret, and copy the Callback URL it shows.
   - Google Cloud Console > APIs & Services > Credentials > the "JJC Website" OAuth client > Authorized redirect URIs must contain that Supabase callback URL.
   - Google Cloud Console > OAuth consent screen > **Publish app**. While it is in Testing, only listed test users can sign in and their sessions expire after 7 days.
   - Supabase: Authentication > URL Configuration > Site URL = the live site URL. Redirect URLs must include `https://YOUR-SITE.netlify.app/**` (the `/**` matters: without it Supabase bounces sign-ins to the home page and the login never completes).
5. **Admins**: sign in on the site once with the Google account, then in SQL Editor run
   `update public.profiles set role = 'admin' where email = 'their-email@gmail.com';`

## Contact form

The form on `contact.html` uses Netlify Forms. In Netlify: **Site configuration > Forms > Enable form detection**, then add an email notification under Forms > Notifications. If forms are not enabled, the page shows the email address as a fallback.

## Security notes

- `netlify.toml` sets a Content-Security-Policy, so inline `<script>` tags will be blocked. Put page scripts in files (see `backend/`).
- Row Level Security is enforced in the database: councillors only see their own hours, only admins can approve, and `role` cannot be changed through the API.
- The anon key in `backend/supabase-client.js` is meant to be public. The `service_role` key is not and must never be committed.
