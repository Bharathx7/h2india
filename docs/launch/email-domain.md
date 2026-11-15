# Email authentication for the sending domain

Step 13.2. To set up once the email provider is chosen (M6); until then every email is caught by Mailpit on the
server. Without these records, sign-in codes land in spam.

| Record              | Name                    | Value                                                                                                                          | From                      |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| SPF (TXT)           | the sending domain      | `v=spf1 include:<provider's SPF host> -all`                                                                                    | The provider's setup page |
| DKIM (TXT or CNAME) | `<selector>._domainkey` | The key the provider gives                                                                                                     | The provider's setup page |
| DMARC (TXT)         | `_dmarc`                | Start with `v=DMARC1; p=none; rua=mailto:<reports address>`; after two weeks of clean reports, `p=quarantine`, then `p=reject` | Us                        |
| Return path (CNAME) | as the provider asks    | as the provider asks                                                                                                           | The provider              |

Then:

1. Set `SMTP_*`, `EMAIL_FROM` and `EMAIL_FROM_SECURITY` in `h2india.env` and `dc up -d web-public web-admin worker`.
2. Send a sign-in code to a Gmail and an Outlook address; both must arrive in the inbox with SPF, DKIM and DMARC
   "pass" in the message headers.
3. Remove `mailpit` from the running services once real mail flows.

HTTPS certificates are issued by certbot at the first deploy (`docs/runbooks/deploy.md`) and renew automatically;
check with `sudo certbot renew --dry-run`. HSTS is set by nginx (two years, step 12.1).
