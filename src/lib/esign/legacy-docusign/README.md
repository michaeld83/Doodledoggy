# LEGACY: DocuSign (inactive on the `signwell` branch)

The DocuSign integration that runs in production (tag `v1-docusign-snapshot`) is kept intact.
It is only used when `ESIGN_PROVIDER=docusign`.

Files (unchanged except for a LEGACY header comment):

| File | Purpose |
|---|---|
| `src/lib/docusign.ts` | JWT grant, envelope create → prefill tabs → send |
| `src/lib/docusign-prefill-tabs.ts` | Litter/Puppy, Place (pick #), Price, Deposit Method prefill tabs |
| `src/lib/docusign-template-tabs.ts` | Buyer address text tabs, email blurb |
| `src/app/api/docusign/send/route.ts` | Reservation "Send to DocuSign" |
| `src/app/api/docusign/send-customer/route.ts` | Customer page "Send contract" |
| `src/components/DocuSignButton.tsx` | Old reservation send button (replaced by `ContractSendButton`) |
| `src/lib/esign/legacy-docusign/connection.ts` | Adapter: DocuSign → `EsignConnection` for the UI |

To switch back: set `ESIGN_PROVIDER=docusign` plus the `DOCUSIGN_*` env vars. The UI then posts to `/api/docusign/*`.
