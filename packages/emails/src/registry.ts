// Every message template (step 3.9): the 34 designed on Figma page 16 (playbook Appendix C) and the undrawn ones the
// flows need (M21, wording A9). Each template is built in the step that first sends it. SMS and WhatsApp wording must
// match the approved template exactly, so it lives here and nowhere else. Safe to import anywhere.

export type Channel = "email" | "sms" | "whatsapp";

export interface TemplateEntry {
  channel: Channel;
  /** The provider-facing key shown in System settings (707:793), for example otp_sign_in. */
  key: string;
  name: string;
  /** Figma frame, or null when not drawn (M21). */
  frame: string | null;
  /** The playbook step that first sends it. */
  step: string;
  /** Built and sendable now. */
  built: boolean;
}

export const TEMPLATES = {
  "email.ops_alarm": {
    channel: "email",
    key: "ops_alarm",
    name: "Operations alarm",
    frame: null,
    step: "13.3",
    built: true,
  },
  // Email · page 16
  "email.quote_received_buyer": {
    channel: "email",
    key: "quote_received_buyer",
    name: "Quote received",
    frame: "665:9",
    step: "9.5",
    built: true,
  },
  "email.order_confirmed_pay_now": {
    channel: "email",
    key: "order_confirmed_pay_now",
    name: "Order confirmed · pay now",
    frame: "665:82",
    step: "10.7",
    built: true,
  },
  "email.payment_instructions": {
    channel: "email",
    key: "payment_instructions",
    name: "Payment instructions",
    frame: "665:151",
    step: "10.5",
    built: false,
  },
  "email.payout_sent": {
    channel: "email",
    key: "payout_sent",
    name: "Payout sent",
    frame: "665:239",
    step: "10.11",
    built: true,
  },
  "email.tender_alert_digest": {
    channel: "email",
    key: "tender_alert_digest",
    name: "Tender alert digest",
    frame: "665:307",
    step: "7.3",
    built: true,
  },
  "email.sign_in_code": {
    channel: "email",
    key: "sign_in_code",
    name: "Sign-in code",
    frame: "671:428",
    step: "3.2",
    built: true,
  },
  "email.rfq_received_supplier": {
    channel: "email",
    key: "rfq_received_supplier",
    name: "RFQ received",
    frame: "671:482",
    step: "9.4",
    built: true,
  },
  "email.rfq_returned": {
    channel: "email",
    key: "rfq_returned",
    name: "RFQ returned",
    frame: "671:554",
    step: "9.4",
    built: true,
  },
  "email.payment_received": {
    channel: "email",
    key: "payment_received",
    name: "Payment received",
    frame: "671:620",
    step: "10.5",
    built: true,
  },
  "email.order_dispatched": {
    channel: "email",
    key: "order_dispatched",
    name: "Order dispatched",
    frame: "671:685",
    step: "10.9",
    built: true,
  },
  "email.acceptance_reminder": {
    channel: "email",
    key: "acceptance_reminder",
    name: "Acceptance reminder",
    frame: "671:756",
    step: "10.10",
    built: false,
  },
  "email.dispute_opened": {
    channel: "email",
    key: "dispute_opened",
    name: "Dispute opened",
    frame: "673:8",
    step: "10.10",
    built: true,
  },
  "email.approval_needed": {
    channel: "email",
    key: "approval_needed",
    name: "Approval needed",
    frame: "673:86",
    step: "10.3",
    built: true,
  },
  "email.invitation": {
    channel: "email",
    key: "invitation",
    name: "Invitation",
    frame: "673:155",
    step: "8.7, 9.1",
    built: true,
  },
  "email.verification_status": {
    channel: "email",
    key: "verification_status",
    name: "Verification status · document expiring",
    frame: "673:221",
    step: "8.2",
    built: true,
  },
  "email.listing_needs_changes": {
    channel: "email",
    key: "listing_needs_changes",
    name: "Listing needs changes",
    frame: "673:287",
    step: "8.3",
    built: true,
  },
  "email.submission_received": {
    channel: "email",
    key: "submission_received",
    name: "Submission received",
    frame: "673:352",
    step: "5.7",
    built: true,
  },
  "email.newsletter_confirmation": {
    channel: "email",
    key: "newsletter_confirmation",
    name: "Newsletter confirmation",
    frame: "676:8",
    step: "5.1 (A46)",
    built: true,
  },
  "email.newsletter_welcome": {
    channel: "email",
    key: "newsletter_welcome",
    name: "Newsletter welcome (after confirming)",
    frame: "676:8",
    step: "5.1 (A46)",
    built: true,
  },
  "email.webinar_registration": {
    channel: "email",
    key: "webinar_registration",
    name: "Webinar registration",
    frame: "676:83",
    step: "5.7",
    built: true,
  },
  "email.grievance_acknowledgement": {
    channel: "email",
    key: "grievance_acknowledgement",
    name: "Grievance acknowledgement",
    frame: "676:154",
    step: "5.8",
    built: true,
  },
  "email.listing_approved": {
    channel: "email",
    key: "listing_approved",
    name: "Listing approved",
    frame: "831:1006",
    step: "8.3",
    built: true,
  },
  "email.event_live": {
    channel: "email",
    key: "event_live",
    name: "Your event is live",
    frame: "831:1080",
    step: "11.2",
    built: true,
  },
  "email.newsletter_issue": {
    channel: "email",
    key: "newsletter_issue",
    name: "India H₂ Weekly issue",
    frame: "648:312",
    step: "11.3",
    built: true,
  },
  "email.changes_needed": {
    channel: "email",
    key: "changes_needed",
    name: "Submission needs changes",
    frame: "633:567",
    step: "11.2",
    built: true,
  },
  "email.job_live": {
    channel: "email",
    key: "job_live",
    name: "Your job post is live",
    frame: "633:1059",
    step: "11.2",
    built: true,
  },
  "email.passkey_reset_admin": {
    channel: "email",
    key: "passkey_reset_admin",
    name: "Passkey reset · admin notified",
    frame: "831:1148",
    step: "3.5",
    built: true,
  },
  // WhatsApp · page 16
  "whatsapp.rfq_received_supplier": {
    channel: "whatsapp",
    key: "rfq_received_supplier",
    name: "RFQ received",
    frame: "668:44",
    step: "9.4",
    built: true,
  },
  "whatsapp.payment_reminder_buyer": {
    channel: "whatsapp",
    key: "payment_reminder_buyer",
    name: "Payment reminder",
    frame: "668:98",
    step: "10.5",
    built: false,
  },
  "whatsapp.tender_alert_instant": {
    channel: "whatsapp",
    key: "tender_alert_instant",
    name: "Tender alert",
    frame: "668:152",
    step: "7.3",
    built: true,
  },
  "whatsapp.order_confirmed": {
    channel: "whatsapp",
    key: "order_confirmed",
    name: "Order confirmed",
    frame: "676:243",
    step: "10.7",
    built: false,
  },
  "whatsapp.payment_instructions": {
    channel: "whatsapp",
    key: "payment_instructions",
    name: "Payment instructions",
    frame: "676:297",
    step: "10.5",
    built: false,
  },
  "whatsapp.scheme_alert": {
    channel: "whatsapp",
    key: "scheme_alert",
    name: "Scheme alert",
    frame: "676:351",
    step: "7.3",
    built: true,
  },
  "whatsapp.webinar_registration": {
    channel: "whatsapp",
    key: "webinar_registration",
    name: "Webinar registration",
    frame: "676:405",
    step: "5.7",
    built: true,
  },
  "whatsapp.webinar_reminder": {
    channel: "whatsapp",
    key: "webinar_reminder",
    name: "Webinar reminder",
    frame: "676:459",
    step: "5.7",
    built: true,
  },
  // SMS · page 16
  "sms.otp_sign_in": {
    channel: "sms",
    key: "otp_sign_in",
    name: "Sign-in OTP",
    frame: "668:194",
    step: "3.2",
    built: true,
  },
  "sms.otp_delivery_receiving_contact": {
    channel: "sms",
    key: "otp_delivery_receiving_contact",
    name: "Delivery OTP",
    frame: "668:232",
    step: "10.9",
    built: true,
  },
  "sms.order_dispatched_receiving_contact": {
    channel: "sms",
    key: "order_dispatched_receiving_contact",
    name: "Order dispatched",
    frame: "668:270",
    step: "10.9",
    built: true,
  },
  // Not drawn (M21; wording A9): built from the screens' own copy in the steps that needed them.
  "email.bank_account_changed": {
    channel: "email",
    key: "bank_account_changed",
    name: "Payout bank account changed",
    frame: null,
    step: "8.6",
    built: true,
  },
  "sms.bank_account_changed": {
    channel: "sms",
    key: "bank_account_changed",
    name: "Payout bank account changed",
    frame: null,
    step: "8.6",
    built: true,
  },
  "email.verify_email": {
    channel: "email",
    key: "verify_email",
    name: "Confirm your email (Join)",
    frame: null,
    step: "3.3",
    built: true,
  },
  "email.join_request_admin": {
    channel: "email",
    key: "join_request_admin",
    name: "Join request to the admin (and reminder)",
    frame: null,
    step: "3.3",
    built: true,
  },
  "email.join_request_answered": {
    channel: "email",
    key: "join_request_answered",
    name: "Join request approved or rejected",
    frame: null,
    step: "3.3",
    built: true,
  },
  "email.recovery_code": {
    channel: "email",
    key: "recovery_code",
    name: "Account recovery code",
    frame: null,
    step: "3.5",
    built: true,
  },
  "email.claim_code": {
    channel: "email",
    key: "claim_code",
    name: "Claim this profile code",
    frame: null,
    step: "6.7",
    built: true,
  },
  "email.recovery_approval": {
    channel: "email",
    key: "recovery_approval",
    name: "Approve a recovery (admin)",
    frame: null,
    step: "3.5",
    built: true,
  },
  "email.support_request": {
    channel: "email",
    key: "support_request",
    name: "Support request (to support)",
    frame: null,
    step: "3.5, 3.7",
    built: true,
  },
  "email.new_email_confirm": {
    channel: "email",
    key: "new_email_confirm",
    name: "Confirm a new work email",
    frame: null,
    step: "3.5",
    built: true,
  },
  "email.mobile_changed": {
    channel: "email",
    key: "mobile_changed",
    name: "Mobile number changed",
    frame: null,
    step: "3.5",
    built: true,
  },
  "email.newsletter_manage": {
    channel: "email",
    key: "newsletter_manage",
    name: "Newsletter: already subscribed, change topics",
    frame: null,
    step: "5.1 (A46)",
    built: true,
  },
  "email.report_download": {
    channel: "email",
    key: "report_download",
    name: "Your report (gated download copy)",
    frame: null,
    step: "4.4",
    built: true,
  },
  "email.test": {
    channel: "email",
    key: "test",
    name: "Test message (/dev/messages)",
    frame: null,
    step: "3.9",
    built: true,
  },
  "sms.mobile_changed": {
    channel: "sms",
    key: "mobile_changed",
    name: "New mobile confirmed",
    frame: null,
    step: "3.5",
    built: true,
  },
} as const satisfies Record<string, TemplateEntry>;

export type TemplateId = keyof typeof TEMPLATES;

/** Exact approved wording for SMS (DLT) and WhatsApp templates. Never edit without re-registering the template. */
export const APPROVED_TEXT = {
  /** 668:194 */
  "sms.otp_sign_in": (input: { code: string }) =>
    `${input.code} is your H2 India sign-in code. It expires in 10 minutes. Never share this code with anyone, including H2 India staff. -H2 India`,
  "sms.mobile_changed": () => "Your new mobile number for H2 India is confirmed. -H2 India",
  /** 668:232, template otp_delivery_receiving_contact (step 10.9). The link is the short delivery address. */
  "sms.otp_delivery_receiving_contact": (input: { order: string; supplier: string; link: string; code: string }) =>
    `Delivery of ${input.order} from ${input.supplier} is at your gate. Record what arrived at ${input.link} and enter code ${input.code}. Never share it. -H2 India`,
  /** 668:270, template order_dispatched_receiving_contact (step 10.9). */
  "sms.order_dispatched_receiving_contact": (input: {
    order: string;
    supplier: string;
    carrier: string;
    lr: string;
    expected: string;
  }) =>
    `${input.order} from ${input.supplier} is on its way with ${input.carrier}, LR ${input.lr}. Expected ${input.expected}. We'll text a delivery code when it arrives. -H2 India`,
  /** Not drawn (step 8.6, A159): wording from 588:1179, to register with the provider (M5). */
  "sms.bank_account_changed": (input: { company: string; last4: string; until: string }) =>
    `${input.company}'s payout bank account on H2 India was changed to the account ending ${input.last4}. Payouts are held until ${input.until} IST. Didn't make this change? Cancel it in your account. -H2 India`,
  /** 676:405, template webinar_registered: header "You're registered", footer "H2 India webinars". */
  "whatsapp.webinar_registration": (input: { name: string; title: string; date: string; time: string }) =>
    `Hi ${input.name}, you're registered for ${input.title}. ${input.date}, ${input.time} IST, online. We'll send the join link 1 hour before, and the replay afterwards.`,
  /** 676:459, template webinar_reminder: header "Starts in {{1}}", footer "H2 India webinars". */
  "whatsapp.webinar_reminder": (input: { name: string; title: string; time: string }) =>
    `Hi ${input.name}, ${input.title} starts at ${input.time} IST today. Join from your phone or laptop with the link below.`,
  /** 668:152, template tender_alert_instant: header "Tender alert", footer "Manage alerts on H2 India". */
  "whatsapp.tender_alert_instant": (input: {
    issuer: string;
    change: string;
    title: string;
    reference: string;
    due: string;
    alert: string;
  }) =>
    `${input.issuer} ${input.change}: ${input.title} (${input.reference}). Bid due ${input.due}. This matches your alert for ${input.alert}.`,
  /** 676:351, template scheme_alert_instant: header "Scheme deadline", footer "Manage alerts on H2 India". */
  "whatsapp.scheme_alert": (input: {
    scheme: string;
    what: string;
    due: string;
    where: string;
    left: string;
    alert: string;
  }) =>
    `${input.scheme}: ${input.what} are due ${input.due} on ${input.where}. ${input.left} left. This matches your alert for ${input.alert}.`,
  /** 668:44, template rfq_received_supplier: header "New RFQ: {{1}}", footer "H2 India RFQ alerts", button View and quote. */
  "whatsapp.rfq_received_supplier": (input: {
    name: string;
    buyerType: string;
    item: string;
    quantity: string;
    state: string;
    due: string;
  }) =>
    `Hi ${input.name}, a ${input.buyerType} wants a quote for ${input.item}, quantity ${input.quantity}, delivered to ${input.state}. Send your quote by ${input.due}.`,
} satisfies Partial<Record<TemplateId, (input: never) => string>>;

export type TextTemplateId = keyof typeof APPROVED_TEXT;
