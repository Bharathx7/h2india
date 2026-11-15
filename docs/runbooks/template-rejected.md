# DLT or WhatsApp template rejected

**Trigger.** The SMS provider reports a DLT template mismatch, or Meta rejects or pauses a WhatsApp template; sends fail with `TemplateNotApprovedError` (the delivery row says Refused).

**Impact.** That one message stops: SMS (delivery codes, dispatch notice) or WhatsApp (alerts, reminders). Email
still goes.

## First 15 minutes

1. Which template and its status: `dc exec postgres psql -U h2india -c "select template, status, updated_at from core.template_approvals"`.
2. For a delivery code SMS, use the fallback in [delivery-code.md](delivery-code.md) for any waiting order.

## Diagnosis

- The words sent must match the approved template exactly: compare the template in the provider's console with
  `APPROVED_TEXT` in `packages/emails/src/registry.ts` (variables, spaces and the `-H2 India` ending included).
- WhatsApp: Meta's reason (category, wording, quality rating).

## Fix

- Text drifted: change `APPROVED_TEXT` back to the approved words (a release), never edit the template to match
  unapproved code.
- New wording needed: register the new template with the provider and DLT, wait for approval, then change
  `APPROVED_TEXT` in a release and record the approval with `setTemplateApproval()` (audited; there's no screen for
  it yet).

Rollback: record the template as not approved again with `setTemplateApproval()`; sends of it stop cleanly.

## Confirm

A test send of that template arrives.

## Who to tell

Support; the team that owns the message.

## Follow-up

Keep the provider's approved texts and our `APPROVED_TEXT` in the same pull request whenever either changes.
