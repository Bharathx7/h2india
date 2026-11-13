CREATE TABLE "core"."message_reads" (
	"thread_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp with time zone NOT NULL,
	CONSTRAINT "message_reads_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "core"."message_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"buyer_organisation_id" uuid NOT NULL,
	"supplier_organisation_id" uuid NOT NULL,
	"rfq_id" uuid,
	"order_id" uuid,
	"product_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "core"."messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"author_organisation_id" uuid NOT NULL,
	"body" text NOT NULL,
	"attachments" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."message_reads" ADD CONSTRAINT "message_reads_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "core"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."message_threads" ADD CONSTRAINT "message_threads_buyer_organisation_id_organisations_id_fk" FOREIGN KEY ("buyer_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."message_threads" ADD CONSTRAINT "message_threads_supplier_organisation_id_organisations_id_fk" FOREIGN KEY ("supplier_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."message_threads" ADD CONSTRAINT "message_threads_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "core"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."message_threads" ADD CONSTRAINT "message_threads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "core"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."messages" ADD CONSTRAINT "messages_thread_id_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "core"."message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."messages" ADD CONSTRAINT "messages_author_organisation_id_organisations_id_fk" FOREIGN KEY ("author_organisation_id") REFERENCES "core"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_threads_rfq" ON "core"."message_threads" USING btree ("rfq_id","supplier_organisation_id") WHERE "core"."message_threads"."rfq_id" is not null;--> statement-breakpoint
CREATE INDEX "message_threads_buyer" ON "core"."message_threads" USING btree ("buyer_organisation_id","last_message_at");--> statement-breakpoint
CREATE INDEX "message_threads_supplier" ON "core"."message_threads" USING btree ("supplier_organisation_id","last_message_at");--> statement-breakpoint
CREATE INDEX "messages_thread" ON "core"."messages" USING btree ("thread_id","created_at");