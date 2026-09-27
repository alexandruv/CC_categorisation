# Production deployment

Frontend: https://cc.pomeloapps.com (GitHub Pages)
API: https://cc-api.pomeloapps.com (Cloudflare Worker)

Every push to `main` runs tests, bundles the Worker, builds an explicitly allowlisted Pages artifact, deploys the Worker, and then publishes Pages. The Pages deployment is blocked if the API deployment fails. You can also run **Actions → Deploy Folio → Run workflow**. No VPS is required.

## One-time account setup

1. In Cloudflare, create an API token using **Edit Cloudflare Workers**, scoped to your account and the `pomeloapps.com` zone. It needs Workers Scripts Edit, Workers Routes Edit, Account Settings Read and Zone Read for the custom domain. Use the template rather than a global API key.
2. In GitHub repository **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`: that token.
   - `CLOUDFLARE_ACCOUNT_ID`: the account ID shown in Cloudflare's account dashboard.
   - `TYPESAFE_API_KEY`: already populated from this workspace's existing key.
   - `APP_ACCESS_TOKEN`: already populated with a random workspace access code.
3. DNS for the frontend: CNAME `cc` → `alexandruv.github.io`, **DNS only**. GitHub Pages is configured for Actions and `cc.pomeloapps.com`.
4. Leave `cc-api` unconfigured: Wrangler's custom-domain deployment creates its Cloudflare DNS record and certificate automatically. An existing conflicting CNAME at `cc-api` must be removed first.
5. After DNS validation and GitHub certificate issuance, enable **Enforce HTTPS** under GitHub Settings → Pages. The API only accepts the HTTPS production origin.
6. Push to `main`, or run the workflow manually. Open the website and use the code in the local, ignored `data/deployment-access.txt` file. This is a workspace access code, not the Jev key. Keep it private.

## Data and authentication

The static website contains no keys or transaction data. A protected API sample returns the original 339 matched transactions; the full original statements are not served by Pages. Uploaded statements are parsed in the browser. Only merchant, description, operation type and optional bank category go to the API and Jev. The Worker uses up to 12 transactions per request, completing both the initial and bank-comparison passes before returning results. The browser commits each completed batch to IndexedDB and retains the last imported statement across refreshes, tab closure and locking. Cloud snapshots are encrypted with the workspace access code. Completed imports are restored without Jev requests. A new valid upload replaces the current statement and starts a fresh assessment. Interrupted imports require an explicit resume and only unfinished expenses are submitted. Manual corrections remain in browser local storage. This cache is specific to the browser profile; clearing site data or using a different browser requires a new initial assessment. The built-in statement includes previously computed Jev results, so even its first load costs no inference credits. The build matches saved decisions by a hash of merchant, description, operation and bank category. Newly uploaded files still receive a fresh assessment.

The API checks the workspace bearer code on every sensitive endpoint, rejects other browser origins, and fails closed if secrets are missing. It does not use public, unauthenticated AI requests. The code is stored in session storage until you lock the workspace or close the browser tab. The health endpoint returns only readiness. This is a single-owner workspace, not a multi-user account system.

The repository itself is currently public and already contains the original bank statement files from the initial requested push. The app's access code does not restrict access to public GitHub files or history. Make the repository private if those source files should not be public; check your GitHub plan supports Pages from private repositories first.

## Development and validation

- `npm start`: original Node app at localhost:3000.
- `npm test`: parser, reconciliation, review, API auth, CORS and Jev contract checks.
- `npm run check:worker`: production Worker bundle validation without deployment.
- `npm run build`: builds `dist/` without statements or credentials.
- `node cache-browser-check.mjs`: checks that refresh, unlock and a new tab use zero additional Jev requests, new uploads reassess once, and amount controls work.
- `node cloud-browser-check.mjs`: browser integration checks against the real Worker handler with mocked Jev answers, no inference charges.
- `npm run deploy:worker`: manual Worker deployment after Wrangler authentication and secrets setup.

Secrets are passed to Wrangler through a temporary permission-restricted JSON file removed after deployment. No secrets are embedded in the static artifact or repository.

Sources: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Cloudflare Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
