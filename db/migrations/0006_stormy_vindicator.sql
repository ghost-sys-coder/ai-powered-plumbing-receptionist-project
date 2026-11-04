ALTER TYPE "public"."user_role" ADD VALUE 'agency';--> statement-breakpoint
ALTER TABLE "pending_invites" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "is_house" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Hand-edited: customers already exist, so add the column nullable, create the
-- house agency (direct customers), assign every existing customer to it, and
-- only then require it.
ALTER TABLE "customers" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
INSERT INTO "organizations" ("name", "is_house")
SELECT 'Direct customers', true
WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE "is_house");--> statement-breakpoint
UPDATE "customers" SET "organization_id" = (SELECT "id" FROM "organizations" WHERE "is_house" LIMIT 1)
WHERE "organization_id" IS NULL;--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD COLUMN "role" text DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_single_house_idx" ON "organizations" USING btree ("is_house") WHERE "organizations"."is_house";--> statement-breakpoint
CREATE INDEX "customers_organization_id_idx" ON "customers" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "pending_invites" ADD CONSTRAINT "pending_invites_target_check" CHECK (("pending_invites"."role" = 'client' AND "pending_invites"."customer_id" IS NOT NULL AND "pending_invites"."organization_id" IS NULL)
        OR ("pending_invites"."role" = 'agency' AND "pending_invites"."organization_id" IS NOT NULL AND "pending_invites"."customer_id" IS NULL));