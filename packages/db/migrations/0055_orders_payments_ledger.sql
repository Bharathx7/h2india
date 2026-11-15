CREATE TABLE "core"."cart_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"supplier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."delivery_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"wrong_tries" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "core"."delivery_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"condition" text NOT NULL,
	"notes" text,
	"photo_file_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"received_by" text,
	"via" text DEFAULT 'link' NOT NULL,
	"recorded_by" uuid,
	"reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_receipts_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "core"."dispatch_date_changes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"from_date" timestamp with time zone,
	"to_date" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"changed_by" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."disputes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text DEFAULT 'Open' NOT NULL,
	"reason" text NOT NULL,
	"details" text NOT NULL,
	"photo_file_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"disputed_paise" bigint NOT NULL,
	"accepted_paise" bigint DEFAULT 0 NOT NULL,
	"supplier_reply" text,
	"supplier_replied_at" timestamp with time zone,
	"outcome" text,
	"refund_paise" bigint,
	"decision_note" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"opened_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "core"."ledger_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"transaction_id" uuid NOT NULL,
	"account" text NOT NULL,
	"order_id" uuid,
	"organisation_id" uuid,
	"debit_paise" bigint DEFAULT 0 NOT NULL,
	"credit_paise" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."ledger_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"source_event_id" text NOT NULL,
	"kind" text NOT NULL,
	"order_id" uuid,
	"reverses" uuid,
	"memo" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_transactions_source_event_id_unique" UNIQUE("source_event_id")
);
--> statement-breakpoint
CREATE TABLE "core"."order_accounts" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"account_number" text NOT NULL,
	"ifsc" text NOT NULL,
	"payee_name" text NOT NULL,
	"partner" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."order_approvals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"approver_id" uuid NOT NULL,
	"on_behalf_of" uuid,
	"decision" text NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."order_lines" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"hsn" text,
	"quantity" integer NOT NULL,
	"unit" text DEFAULT 'units' NOT NULL,
	"unit_price_paise" bigint NOT NULL,
	"gst_rate_bps" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."order_milestones" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"trigger" text NOT NULL,
	"percent_bps" integer NOT NULL,
	"amount_paise" bigint NOT NULL,
	"paid_paise" bigint DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'Upcoming' NOT NULL,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "core"."order_settlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"supplier_organisation_id" uuid NOT NULL,
	"released_paise" bigint NOT NULL,
	"order_value_ex_gst_paise" bigint NOT NULL,
	"fee_paise" bigint NOT NULL,
	"gst_on_fee_paise" bigint NOT NULL,
	"tcs_paise" bigint NOT NULL,
	"tds_paise" bigint NOT NULL,
	"net_paise" bigint NOT NULL,
	"rate_card_version" text NOT NULL,
	"launch_offer" boolean NOT NULL,
	"payout_due_at" timestamp with time zone NOT NULL,
	"payout_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"buyer_organisation_id" uuid NOT NULL,
	"supplier_organisation_id" uuid NOT NULL,
	"placed_by" uuid NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"quote_id" uuid,
	"quote_version_id" uuid,
	"tier" text DEFAULT 'A' NOT NULL,
	"delivery_site_id" uuid,
	"billing_gstin_id" uuid,
	"receiver_name" text,
	"receiver_mobile" text,
	"payment_method" text DEFAULT 'bank_transfer' NOT NULL,
	"currency" char(3) DEFAULT 'INR' NOT NULL,
	"subtotal_paise" bigint NOT NULL,
	"gst_paise" bigint NOT NULL,
	"freight_paise" bigint DEFAULT 0 NOT NULL,
	"total_paise" bigint NOT NULL,
	"rate_card_version" text,
	"dispatch_by" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"decline_reason" text,
	"decline_note" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"buyer_accepted_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "core"."payment_partner_calls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner" text NOT NULL,
	"operation" text NOT NULL,
	"idempotency_key" text,
	"request" jsonb NOT NULL,
	"response" jsonb,
	"error" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."payment_webhook_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text,
	CONSTRAINT "payment_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "core"."payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"milestone_id" uuid,
	"method" text NOT NULL,
	"partner" text NOT NULL,
	"partner_payment_id" text NOT NULL,
	"checkout_url" text,
	"amount_paise" bigint NOT NULL,
	"status" text DEFAULT 'Pending' NOT NULL,
	"fail_reason" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_partner_payment_id_unique" UNIQUE("partner_payment_id")
);
--> statement-breakpoint
CREATE TABLE "core"."payouts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"supplier_organisation_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"amount_paise" bigint NOT NULL,
	"status" text DEFAULT 'Scheduled' NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"partner_payout_id" text,
	"utr" text,
	"fail_reason" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "core"."reconciliation_issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"kind" text NOT NULL,
	"order_id" uuid,
	"partner_ref" text,
	"expected_paise" bigint,
	"actual_paise" bigint,
	"detail" text NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" uuid,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"order_id" uuid NOT NULL,
	"dispute_id" uuid,
	"payment_id" uuid,
	"amount_paise" bigint NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'Processing' NOT NULL,
	"partner_refund_id" text,
	"requested_by" uuid,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "core"."shipments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_file_id" uuid,
	"eway_bill_number" text,
	"eway_bill_file_id" uuid,
	"transporter" text NOT NULL,
	"vehicle_or_tracking" text,
	"proof_file_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"shipped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shipped_by" uuid,
	CONSTRAINT "shipments_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "core"."sim_partner_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"partner_ref" text NOT NULL,
	"order_ref" text,
	"amount_paise" bigint NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"idempotency_key" text,
	"webhook" jsonb,
	"deliver_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sim_partner_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "core"."cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "core"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD CONSTRAINT "carts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."carts" ADD CONSTRAINT "carts_supplier_id_organisations_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."delivery_links" ADD CONSTRAINT "delivery_links_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."delivery_receipts" ADD CONSTRAINT "delivery_receipts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."delivery_receipts" ADD CONSTRAINT "delivery_receipts_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD CONSTRAINT "dispatch_date_changes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."dispatch_date_changes" ADD CONSTRAINT "dispatch_date_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD CONSTRAINT "disputes_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."disputes" ADD CONSTRAINT "disputes_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."ledger_lines" ADD CONSTRAINT "ledger_lines_transaction_id_ledger_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "core"."ledger_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."ledger_lines" ADD CONSTRAINT "ledger_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."ledger_lines" ADD CONSTRAINT "ledger_lines_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."ledger_transactions" ADD CONSTRAINT "ledger_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_accounts" ADD CONSTRAINT "order_accounts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_approvals" ADD CONSTRAINT "order_approvals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_approvals" ADD CONSTRAINT "order_approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_approvals" ADD CONSTRAINT "order_approvals_on_behalf_of_users_id_fk" FOREIGN KEY ("on_behalf_of") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_milestones" ADD CONSTRAINT "order_milestones_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_settlements" ADD CONSTRAINT "order_settlements_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_settlements" ADD CONSTRAINT "order_settlements_supplier_organisation_id_organisations_id_fk" FOREIGN KEY ("supplier_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_buyer_organisation_id_organisations_id_fk" FOREIGN KEY ("buyer_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_supplier_organisation_id_organisations_id_fk" FOREIGN KEY ("supplier_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_placed_by_users_id_fk" FOREIGN KEY ("placed_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "core"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_quote_version_id_quote_versions_id_fk" FOREIGN KEY ("quote_version_id") REFERENCES "core"."quote_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_delivery_site_id_delivery_sites_id_fk" FOREIGN KEY ("delivery_site_id") REFERENCES "core"."delivery_sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."orders" ADD CONSTRAINT "orders_billing_gstin_id_organisation_gstins_id_fk" FOREIGN KEY ("billing_gstin_id") REFERENCES "core"."organisation_gstins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."payments" ADD CONSTRAINT "payments_milestone_id_order_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "core"."order_milestones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."payouts" ADD CONSTRAINT "payouts_supplier_organisation_id_organisations_id_fk" FOREIGN KEY ("supplier_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."reconciliation_issues" ADD CONSTRAINT "reconciliation_issues_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."reconciliation_issues" ADD CONSTRAINT "reconciliation_issues_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."refunds" ADD CONSTRAINT "refunds_dispute_id_disputes_id_fk" FOREIGN KEY ("dispute_id") REFERENCES "core"."disputes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."refunds" ADD CONSTRAINT "refunds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."shipments" ADD CONSTRAINT "shipments_shipped_by_users_id_fk" FOREIGN KEY ("shipped_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_product" ON "core"."cart_items" USING btree ("cart_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_owner" ON "core"."carts" USING btree ("organisation_id","user_id");--> statement-breakpoint
CREATE INDEX "delivery_links_order" ON "core"."delivery_links" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "disputes_order" ON "core"."disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "disputes_status" ON "core"."disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ledger_lines_account" ON "core"."ledger_lines" USING btree ("account");--> statement-breakpoint
CREATE INDEX "ledger_lines_order" ON "core"."ledger_lines" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ledger_transactions_order" ON "core"."ledger_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ledger_transactions_at" ON "core"."ledger_transactions" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "order_approvals_step" ON "core"."order_approvals" USING btree ("order_id","step");--> statement-breakpoint
CREATE INDEX "order_lines_order" ON "core"."order_lines" USING btree ("order_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "order_milestones_position" ON "core"."order_milestones" USING btree ("order_id","position");--> statement-breakpoint
CREATE INDEX "order_settlements_supplier" ON "core"."order_settlements" USING btree ("supplier_organisation_id","payout_due_at");--> statement-breakpoint
CREATE INDEX "orders_buyer" ON "core"."orders" USING btree ("buyer_organisation_id","status");--> statement-breakpoint
CREATE INDEX "orders_supplier" ON "core"."orders" USING btree ("supplier_organisation_id","status");--> statement-breakpoint
CREATE INDEX "orders_status" ON "core"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_partner_calls_at" ON "core"."payment_partner_calls" USING btree ("at");--> statement-breakpoint
CREATE INDEX "payments_order" ON "core"."payments" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payouts_supplier" ON "core"."payouts" USING btree ("supplier_organisation_id","run_at");--> statement-breakpoint
CREATE INDEX "reconciliation_issues_day" ON "core"."reconciliation_issues" USING btree ("day");--> statement-breakpoint
CREATE INDEX "refunds_order" ON "core"."refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sim_partner_events_ref" ON "core"."sim_partner_events" USING btree ("partner_ref");--> statement-breakpoint
CREATE INDEX "sim_partner_events_due" ON "core"."sim_partner_events" USING btree ("deliver_at");--> statement-breakpoint
-- The ledger and the partner call log are append-only (step 10.6): corrections are reversing entries, never edits.
CREATE OR REPLACE FUNCTION core.money_rows_are_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_append_only BEFORE UPDATE OR DELETE ON core.ledger_transactions
  FOR EACH ROW EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
CREATE TRIGGER ledger_transactions_no_truncate BEFORE TRUNCATE ON core.ledger_transactions
  FOR EACH STATEMENT EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
CREATE TRIGGER ledger_lines_append_only BEFORE UPDATE OR DELETE ON core.ledger_lines
  FOR EACH ROW EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
CREATE TRIGGER ledger_lines_no_truncate BEFORE TRUNCATE ON core.ledger_lines
  FOR EACH STATEMENT EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
CREATE TRIGGER payment_partner_calls_append_only BEFORE UPDATE OR DELETE ON core.payment_partner_calls
  FOR EACH ROW EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
CREATE TRIGGER order_approvals_append_only BEFORE UPDATE OR DELETE ON core.order_approvals
  FOR EACH ROW EXECUTE FUNCTION core.money_rows_are_append_only();
--> statement-breakpoint
-- One side only, never negative.
ALTER TABLE core.ledger_lines ADD CONSTRAINT ledger_lines_one_side CHECK (
  debit_paise >= 0 AND credit_paise >= 0 AND (debit_paise = 0) <> (credit_paise = 0)
);
--> statement-breakpoint
-- Every transaction balances when the database transaction commits.
CREATE OR REPLACE FUNCTION core.ledger_transaction_balances() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE diff bigint;
BEGIN
  SELECT coalesce(sum(debit_paise), 0) - coalesce(sum(credit_paise), 0) INTO diff
    FROM core.ledger_lines WHERE transaction_id = NEW.transaction_id;
  IF diff <> 0 THEN
    RAISE EXCEPTION 'ledger transaction % does not balance (difference % paise)', NEW.transaction_id, diff
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER ledger_lines_balance AFTER INSERT ON core.ledger_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION core.ledger_transaction_balances();
--> statement-breakpoint
ALTER TABLE core.order_milestones ADD CONSTRAINT order_milestones_amounts CHECK (amount_paise >= 0 AND paid_paise >= 0);
--> statement-breakpoint
ALTER TABLE core.orders ADD CONSTRAINT orders_totals CHECK (
  subtotal_paise >= 0 AND gst_paise >= 0 AND freight_paise >= 0 AND total_paise = subtotal_paise + gst_paise + freight_paise
);
--> statement-breakpoint
CREATE TRIGGER sim_partner_events_no_delete BEFORE DELETE ON core.sim_partner_events
  FOR EACH ROW EXECUTE FUNCTION core.money_rows_are_append_only();
