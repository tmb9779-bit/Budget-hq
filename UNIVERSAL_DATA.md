# Budget HQ Universal Data foundation (0.9.154)

Budget HQ now has an explicit persistence seam. The existing encrypted local vault remains the default and no financial data is uploaded by this build.

## Modes

- `BUDGET_HQ_STORE=local` (default): existing AES-256-GCM local vault behavior.
- `BUDGET_HQ_STORE=hosted`: reserved for the hosted adapter. It deliberately fails closed until a durable hosted database and deployment secrets are configured.

A hosted adapter must preserve the existing asynchronous contract: `get(name, fallback)`, `put(name, value)`, `list(prefix)`, and `remove(name)`.

## Migration safety

Do not delete the original Budget HQ data directory. Migration to hosted storage should be copy-first, verified record-by-record, and only then made authoritative. Encryption keys for hosted data must be deployment secrets and must not be stored beside encrypted database records.
