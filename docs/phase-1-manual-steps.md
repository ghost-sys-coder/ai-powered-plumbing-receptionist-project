# Phase 1 — Manual Steps (Frank)

These steps run **after** the Phase 1 code has been deployed. Don't run them locally unless you're exposing the webhook via ngrok or similar.

## 1. Register the Clerk webhook

1. Clerk dashboard → **Webhooks** → **Add Endpoint**
2. **URL:** `https://<deployed-url>/api/webhooks/clerk`
   (for local testing, use an ngrok tunnel → `https://<id>.ngrok.app/api/webhooks/clerk`)
3. **Subscribe to events:** `user.created`, `user.updated`, `user.deleted`
4. Save → copy the **Signing Secret** (`whsec_…`)
5. Paste it into `.env.local`, replacing the placeholder:

   ```text
   CLERK_WEBHOOK_SECRET=whsec_<the_real_one>
   ```

   > Note: the spec said `.env.local`. The rest of the project loads `.env`
   > (via dotenv in `drizzle.config.ts` and `db/drizzle.ts`), but Next.js auto-loads
   > `.env.local` for the running server, so the webhook route picks it up. If you
   > prefer to consolidate, move it into `.env` — both work for the webhook handler.

6. Redeploy (or restart `next dev`) so the new env var is picked up.

## 2. Expose `publicMetadata` on session claims

1. Clerk dashboard → **Sessions** → **Customize session token**
2. Add this claim:

   ```json
   {
     "metadata": "{{user.public_metadata}}"
   }
   ```

3. Save. From here on, every session token carries `sessionClaims.metadata`,
   which is what `lib/auth/require-admin.ts` reads.

## 3. Make Frank an admin

1. Clerk dashboard → **Users** → find Frank's account
2. Edit **Public metadata** to:

   ```json
   { "role": "admin" }
   ```

3. Save.

## 4. Refresh the session

1. Sign out of the app
2. Sign back in (new session token now contains `metadata.role = "admin"`)

## 5. Verify

- Frank's account can open `/admin` and `/admin/admin` — no redirect.
- A second test account (no `publicMetadata.role`) hitting `/admin` should be
  redirected to `/dashboard`.
- Creating a new account should produce a row in `users` with
  `clerk_id`, `email`, `name` populated and `role = 'client'`.
  Check the Clerk webhook delivery log if no row appears.

## Notes / fallbacks

- If editing the session token isn't available in the current Clerk plan/version,
  swap the layout check to fetch metadata server-side:
  `clerkClient.users.getUser(userId).then(u => u.publicMetadata.role === 'admin')`.
  Same outcome, one extra round trip per request.
- `drizzle-kit push` stays in use through Phase 1. We'll move to
  `generate` + `migrate` once there's real customer data to protect.
