# Wednesday Swindle: first database connection preview

This is a development copy of the uploaded project. Nothing has been deployed.

## What is implemented

- Main-admin email/password sign-in against Supabase Auth.
- Admin-role check using the existing sw_user_roles table and its RLS policy.
- Fetch courses, tees and hole details from sw_courses and sw_course_holes.
- Select a course, refresh its details, sign out, and handle errors or session expiry.
- Existing App.jsx and scorecard remain unchanged. Select "Open the existing scorecard" to use them.

This first milestone is read-only for competition data. Scoring sync, players,
Jokers, leaderboards, finalisation and publishing buttons are not yet connected.
Secondary-admin and scorer login access will be added later.

## Develop separately from the live website

1. In GitHub, create a new branch named season-development from main.
2. Switch to that branch before uploading any files.
3. Extract this ZIP. Upload the project contents at the repository root, retaining
   the src/season folder. Do not upload the ZIP itself or an extra parent folder.
4. The changed/new implementation files are:
   - src/main.jsx
   - src/season/SeasonPreview.jsx
   - src/season/api.js
   - src/season/config.js
   - .gitignore
   - .env.example
   - tests/database-api.test.mjs
   - DEVELOPMENT-SETUP.md
5. Commit on season-development. Do not merge it into main yet.
6. Your public Supabase URL and publishable key are configured in
   src/season/config.js. In the existing Vercel project, add this variable for
   Preview deployments only, scoped to the season-development branch:

   VITE_ENABLE_SEASON_PREVIEW=true

   Optional overrides: VITE_SUPABASE_URL and
   VITE_SUPABASE_PUBLISHABLE_KEY. These are not required for this project.

   Leave these unset for Production. If a preview build already exists, redeploy
   the branch after changing the variables. Vite reads these settings at build time.
7. Open that branch's Vercel Preview deployment, not wednesdayswindle.co.uk.
8. Sign in with the app admin account created in Supabase Authentication.
9. Confirm Bungay / White shows 10 holes, par 4 on hole 1 and total par 38.

Use only a public publishable key, or the legacy anon key. Never use a secret or
service_role key in VITE_ variables: those variables are included in browser code.
The app rejects known privileged key types as an additional configuration check.
Database row security remains the actual access protection.

## Local preview on your Mac

From the project folder:

    npm ci

Copy .env.example to .env.local and fill in the public project settings, then run:

    npm run dev

Open the address Vite prints. .env.local is ignored by Git.

## Verification completed

- Nine mocked API tests passed: privileged-key rejection, URL checks, login,
  non-admin rejection, authorised course reads, error handling and logout.
- Production builds checked both with the season preview disabled and enabled.
- Public Supabase settings are configured, but no user password is supplied; live sign-in/RLS/course loading still
  require the configured preview smoke test. No browser visual QA was performed.

Run the automated checks with:

    node --test tests/database-api.test.mjs
    npm run build

## Session and cache behaviour for this milestone

The preview holds the login token only in memory. Reloading requires signing in
again. It does not keep the password or refresh token. Session expiry returns to
sign-in. A normal sign-out also requests server-side session revocation.
The development portal does not register the scorecard's service worker.
The old scorecard keeps its existing local storage and worker behaviour.

## Repository housekeeping

The original ZIP included node_modules. This delivery excludes dependencies and
build output; npm ci recreates dependencies from the unchanged package lock.
.gitignore prevents newly untracked copies being added. It does not remove
node_modules that are already tracked in Git; those can be cleaned up separately.
No dependency or package-lock changes are required for this milestone.
