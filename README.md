# Johannesburg Junior Council website

Static HTML, CSS and JS. Hosted on Netlify, deployed automatically from this repo. Service-hour logging uses Supabase (Google sign-in + Postgres). Forms (contact, event sign-up) use Netlify Forms.

## How deploys work

Push to `main` and Netlify publishes the repo root as-is (`netlify.toml`, no build step). Two or three minutes later the change is live.

## Editing the site (the bits that change often)

- **Events**: `events.js`. One line per event. Fields:
  - `date` (YYYY-MM-DD), `start`, `end` (24h, leave `""` for TBC), `committee`, `title`, `venue` (leave `""` for TBC)
  - `image`: a photo from `images/` shown on the card
  - `signup: true` if guests may sign up for it (adds the Sign up link and lists it in the sign-up form). Leave it out for internal events like GEM meetings
  - `link`: optional page the title links to (the centenary events link to `centenary.html`)
  - Past events move to "Already done" on the events page automatically. The home page shows the next three. Each committee card shows its own upcoming events.
- **Numbers and contact details**: `site.js`. Councillors, schools, committees, email, Instagram and TikTok. Every page reads from here, so change it once.
- **Schools**: the list is in `schools.html` and in the dropdowns on `log-hours.html`.
- **Committees**: `committees.html` and the home page cards. The dropdown on `log-hours.html` too.
- **Centenary programme text**: `centenary.html`.
- **Home page hero photo**: the Johannesburg skyline is loaded from Unsplash. To use your own, drop a file at `images/joburg-skyline.jpg` and change the `<img src>` in the hero of `index.html` to that path.

## Forms (contact + event sign-up)

Both forms post to Netlify Forms. One-time setup in Netlify: **Site configuration > Forms > Enable form detection**, then redeploy once. Submissions appear under **Forms** in the Netlify dashboard (`contact` and `event-signup`). Add an email notification under Forms > Notifications so the council gets each sign-up by email. Free plan: 100 submissions a month across both forms.

If form detection is off, the forms show the fallback error with the email address.

## Backend setup (once)

1. **Supabase project**: make sure it is not paused (free projects pause after a week without traffic; the dashboard shows a Restore button).
2. **Keys**: Project Settings > API. Paste the Project URL and the `anon public` key into `backend/supabase-client.js`. Never the `service_role` key.
3. **Database**: SQL Editor > New query > paste all of `backend/schema.sql` > Run. Safe to run again later.
4. **Google sign-in**:
   - Supabase: Authentication > Providers > Google > enable, paste the Google client ID and secret, and copy the Callback URL it shows.
   - Google Cloud Console > APIs & Services > Credentials > the "JJC Website" OAuth client > Authorized redirect URIs must contain that Supabase callback URL.
   - Google Cloud Console > OAuth consent screen > **Publish app**. While it is in Testing, only listed test users can sign in and their sessions expire after 7 days.
   - Supabase: Authentication > URL Configuration > Site URL = the live site URL. Redirect URLs must include `https://YOUR-SITE.netlify.app/**` (the `/**` matters).
5. **Admins**: sign in on the site once with the Google account, then in SQL Editor run
   `update public.profiles set role = 'admin' where email = 'their-email@gmail.com';`

## Security notes

- `netlify.toml` sets a Content-Security-Policy, so inline `<script>` tags and `onclick` attributes are blocked. Put page scripts in files.
- Row Level Security is enforced in the database: councillors only see their own hours, only admins can approve, and `role` cannot be changed through the API.
- The anon key in `backend/supabase-client.js` is meant to be public. The `service_role` key is not and must never be committed.
