# SignWell setup (branch `signwell`)

The `signwell` branch sends puppy contracts through **SignWell** instead of DocuSign.
DocuSign code is kept intact as legacy (`ESIGN_PROVIDER=docusign`, see `src/lib/esign/legacy-docusign/README.md`).
Production (`main`, tag `v1-docusign-snapshot`) is unchanged until this branch is merged and deployed.

## How it works

| Action | App route | SignWell API |
|---|---|---|
| Customer page → Send contract | `POST /api/esign/send-customer` | `GET /api/v1/document_templates/{id}` then `POST /api/v1/document_templates/documents` |
| Reservation → Send contract | `POST /api/esign/send` | same |
| Refresh status | `GET /api/esign/documents/{id}` | `GET /api/v1/documents/{id}` |
| Download signed PDF | `GET /api/esign/documents/{id}/pdf` | `GET /api/v1/documents/{id}/completed_pdf?audit_page=true` |
| Status webhooks | `POST /api/esign/webhook` (public) | SignWell → your URL |
| Connection state | `GET /api/esign/status` | none (env only) |

Auth: `X-Api-Key: <SIGNWELL_API_KEY>`. Code: `src/lib/esign/signwell.ts`, field mapping `src/lib/esign/fields.ts`.

Contract records: the SignWell **document id** is stored in the existing `Contract.docusignEnvelopeId` /
`Reservation.docusignEnvelopeId` columns, status in `docusignStatus`, SignWell template id in
`Contract.docusignTemplateId`, and `templateFieldsJson` includes `"provider":"signwell"`.
**No database schema change** is needed.

When `SIGNWELL_API_KEY` or a template ID is missing, the Send contract buttons are disabled and show
"SignWell not connected" with the missing variable names. Nothing else in the app is affected.

## Template field API IDs

Every contract template (Goldendoodle and Bernedoodle) needs **text fields** with these API IDs
(SignWell field settings → "API ID"; case-sensitive). Assign them to the **Buyer** placeholder and mark them
read-only/locked if you don't want the buyer to edit them.

| API ID | Required | Filled with | Example |
|---|---|---|---|
| `litter_puppy` | yes | Litter and puppy, "litter / puppy" | `Honey x Cedar — Planned / Red` |
| `place` | yes | Pick number only (from reservation pick position / "Pick # (Place)") | `3` |
| `price` | yes | Puppy price, default `TBD` | `TBD` |
| `deposit_method` | yes | Deposit method + amount | `Venmo — $1200` |
| `buyer_name` | optional | Buyer name | `Jane Doe` |
| `buyer_email` | optional | Buyer email | `jane@example.com` |
| `buyer_street` | optional | Street (only if on customer record) | `123 Main St` |
| `buyer_city` | optional | City | `Florence` |
| `buyer_state` | optional | State | `AL` |
| `buyer_zip` | optional | ZIP | `35633` |
| `buyer_phone` | optional | Phone | `2565551234` |

Blank required values are sent as `—` (price as `TBD`). Optional fields are sent only if the template has
that API ID **and** the value is on file. Leave address fields editable if the buyer should fill them when signing.
The app reads the template first: if a required API ID is missing it refuses to send and names the missing IDs.

Recipient: one signer, name/email from the form, assigned to the placeholder named **`Buyer`**
(if a template has exactly one placeholder with another name, that one is used).
Signature, initials, and date-signed fields go on the Buyer placeholder as usual.

## Setup steps (once Michael has a SignWell account)

1. **Create a SignWell account** at https://www.signwell.com (the API is on the Developer/API plan;
   test-mode documents are free).
2. **API key:** SignWell → Settings → API → create an API key. Save it as `SIGNWELL_API_KEY`.
3. **Rebuild both contracts as templates** (Templates → New template, upload the Goldendoodle and the
   Bernedoodle contract PDFs):
   - Add one signer placeholder named **`Buyer`**.
   - Add text fields with the API IDs above (`litter_puppy`, `place`, `price`, `deposit_method`, optional
     `buyer_*`) where the DocuSign prefill fields were (Litter/Puppy, Place, Puppy Price, Deposit Method).
   - Add Buyer signature / initials / date / address fields as on the DocuSign version.
   - Set the CC (copied contact) to **minigoldendoodlesofgeorgia@gmail.com** so the business gets every
     completed contract. (Alternatively set `SIGNWELL_CC_EMAILS`, but not both, or the CC is sent twice.)
   - Save and copy each template ID (from the template URL or API) → `SIGNWELL_TEMPLATE_GOLDENDOODLE`,
     `SIGNWELL_TEMPLATE_BERNEDOODLE`.
4. **Webhook:** SignWell → Settings → API → Webhooks (or `POST /api/v1/hooks`) → URL
   `https://<app-domain>/api/esign/webhook`. Copy the **webhook ID** and set it as `SIGNWELL_WEBHOOK_SECRET`
   (SignWell signs `event.hash` = HMAC-SHA256(webhook ID, "<event type>@<event time>")).
5. **Env vars** (Vercel project → Environment Variables, or `.env` locally):
   - `ESIGN_PROVIDER=signwell`
   - `SIGNWELL_API_KEY`
   - `SIGNWELL_TEMPLATE_GOLDENDOODLE`
   - `SIGNWELL_TEMPLATE_BERNEDOODLE`
   - `SIGNWELL_WEBHOOK_SECRET`
   - `SIGNWELL_TEST_MODE=true` (switch to `false` only after a successful test send)
6. **Test:** on a test customer, Send contract to your own email with pick 3 → check the SignWell document shows
   Place `3`, sign it, then check the contract turns SIGNED (webhook) and "Download signed PDF" works.
7. **Go live:** set `SIGNWELL_TEST_MODE=false`, merge `signwell` into `main`, and deploy.

## Safety notes

- This branch does not change the database schema. Do not run migrations against prod Turso for it.
- Do not create a Vercel preview of this branch while previews share the production database.
- Webhook without `SIGNWELL_WEBHOOK_SECRET` accepts events unverified (logged). Set it before going live.
