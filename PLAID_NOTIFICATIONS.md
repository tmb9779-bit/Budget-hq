# Optional Plaid notifications — hosting preparation

Local daily/manual refresh works without this setup. Do not expose the desktop app port to enable notifications.

When you have hosting or a reverse proxy configured:

1. Provide a public HTTPS URL ending exactly in /plaid/webhook.
2. Forward ONLY that path to the same computer's 127.0.0.1:4174. Keep the app on localhost:4173 private. The receiver has no browser login; it requires a valid Plaid signature.
3. Set BUDGET_HQ_PLAID_WEBHOOK_URL to that full URL in the server environment and restart npm start. On Windows Command Prompt: set BUDGET_HQ_PLAID_WEBHOOK_URL=https://YOUR-HOST/plaid/webhook
4. Refresh connected banks once. This registers the webhook URL for existing connections; new connections include it automatically. Registration failures appear in the per-bank status.
5. Confirm Settings shows notifications Enabled. Verify a Sandbox notification, then an authorized live transaction update when available.

The optional listener runs only on loopback, outside sample mode. It validates ES256 signatures using Plaid verification keys, verifies the raw body SHA-256 and a five-minute timestamp window, caps request size/rate, and stores a per-bank work queue before acknowledgement. Jobs retry with backoff if fetching bank data fails. Pending work survives server restarts. It handles transaction updates, liability notifications and relevant connection/consent notices. It fetches current data through the normal import pipeline; webhook bodies never directly change balances.

The receiver does not make the main application ready for public hosting. HTTPS, process uptime and proxy setup are still required. Hosting was not configured or tested in this release. The server must run to process queued updates. Disabling the environment variable stops the local listener; unregister an old URL with Plaid before retiring that public endpoint.

Reference: https://plaid.com/docs/api/webhooks/webhook-verification/
Reference: https://plaid.com/docs/api/items/
Reference: https://plaid.com/docs/api/products/transactions/
