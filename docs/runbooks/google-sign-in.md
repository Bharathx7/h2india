# Runbook: set up Google sign-in

Step 3.2. Founder task: only the owner of the H2 India Google account can create these credentials. Takes about
10 minutes. Never paste the secret into chat, an issue or a screenshot (`docs/secrets.md`).

## 1. Create the credentials (Google Cloud console)

1. Open https://console.cloud.google.com and create a project named **H2 India** (or pick the existing one).
2. Open **Google Auth Platform**. When asked, register the app:
   - App name: **H2 India**; support email: the H2 India support address.
   - Audience: **External**.
   - Contact email: yours. Accept the policy and create.
3. **Data access**: add only the scopes `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
   Sign-in needs nothing else, and these do not need Google's app review.
4. **Clients** → **Create client** → Application type **Web application**, name **H2 India web**:
   - Authorised JavaScript origins: `http://localhost:3000`
   - Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Create. Copy the **Client ID** and **Client secret** now; the secret is shown only once.
5. **Audience**: while the app is in Testing, only test users you add here can sign in with Google. Add your own
   Google address. Publish the app before launch (step 13.2).

## 2. Put them in your local settings

In `C:\H2India\.env.local` (never committed), fill the two empty lines:

```
GOOGLE_CLIENT_ID=<the client ID>
GOOGLE_CLIENT_SECRET=<the client secret>
```

Restart `pnpm dev`. "Continue with Google" now goes to Google and back.

## 3. Check it

1. Sign in with Google using a test user. You land on the page you started from.
2. Sign out, then sign in with an email code to the **same** Gmail address: you must land in the same account
   (Better Auth links Google accounts whose email Google has verified).

## 4. On the server (later)

When the domain is settled (M1), add `https://<domain>` as an origin and
`https://<domain>/api/auth/callback/google` as a redirect URI on the same client, and put the two values in the
server env file (ADR 0006). Keep the localhost entries for development, or use a separate client for production.
