import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" ADD COLUMN "social_title" varchar;
  ALTER TABLE "posts" ADD COLUMN "social_description" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_social_title" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_social_description" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts" DROP COLUMN "social_title";
  ALTER TABLE "posts" DROP COLUMN "social_description";
  ALTER TABLE "_posts_v" DROP COLUMN "version_social_title";
  ALTER TABLE "_posts_v" DROP COLUMN "version_social_description";`)
}
