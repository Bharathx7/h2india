# Launch 2 checklist: ordering for the pilot group (Gate 3)

Step 13.7. Ordering and payments open, but only to the pilot companies (Admin › Money › Rate card and pilot).

## Before

- [ ] Gate 3 signed; flows B, F and H passed three nights running. _Founder_
- [ ] Payment partner contracted and connected (M3): `PAYMENT_PARTNER` set, its webhook secret in `h2india.env`, a
      real ₹1 payment and refund done end to end on the live account. `PAYMENT_SIM_ALLOWED` is not set. _Engineer_
- [ ] Rate card, TCS and TDS confirmed by the Chartered Accountant (M11, C1, C3) and entered as a new rate card
      version (not `sample`). _Founder and CA_
- [ ] E-invoicing connected if required (M11). _Engineer_
- [ ] Pilot companies listed in the pilot setting; their payout accounts Active after the hold. _Operations_
- [ ] The money runbooks walked through: `payments.md`, `payout-failed.md`, `bank-change-fraud.md`. _Finance and engineer_
- [ ] Penetration test retest covered payments, payouts, webhooks and the delivery link. _Founder_
- [ ] `pnpm launch:check --launch 2` passes. _Engineer_

## On the day

- [ ] Switch `transactions` on in System settings (a second operator approves). _Founder and one operator_
- [ ] The first pilot order watched end to end: payment, dispatch, delivery code, acceptance, payout with a UTR. _Operations_
- [ ] Next morning: the reconciliation shows no differences and the monthly identity is Balanced. _Finance_

## The way back

Switch `transactions` off (two operators): cart, checkout and payment routes stop at once; orders already placed
keep their state and can be finished by operations.
