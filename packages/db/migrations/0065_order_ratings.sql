CREATE TABLE "core"."order_ratings" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"rated_by" uuid NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."order_ratings" ADD CONSTRAINT "order_ratings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "core"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_ratings" ADD CONSTRAINT "order_ratings_rated_by_users_id_fk" FOREIGN KEY ("rated_by") REFERENCES "core"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."order_ratings" ADD CONSTRAINT "order_ratings_range" CHECK (rating BETWEEN 1 AND 5);
