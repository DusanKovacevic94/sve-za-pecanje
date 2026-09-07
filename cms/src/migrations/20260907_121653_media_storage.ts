import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT 'media';
  ALTER TABLE "media" ADD COLUMN "url" varchar;
  ALTER TABLE "media" ADD COLUMN "thumbnail_u_r_l" varchar;
  ALTER TABLE "media" ADD COLUMN "filename" varchar;
  ALTER TABLE "media" ADD COLUMN "mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "width" numeric;
  ALTER TABLE "media" ADD COLUMN "height" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN "focal_y" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_mobile_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_cover_desktop_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_inline_filename" varchar;
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_cover_mobile_sizes_cover_mobile_filename_idx" ON "media" USING btree ("sizes_cover_mobile_filename");
  CREATE INDEX "media_sizes_cover_desktop_sizes_cover_desktop_filename_idx" ON "media" USING btree ("sizes_cover_desktop_filename");
  CREATE INDEX "media_sizes_inline_sizes_inline_filename_idx" ON "media" USING btree ("sizes_inline_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_filename_idx";
  DROP INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx";
  DROP INDEX "media_sizes_cover_mobile_sizes_cover_mobile_filename_idx";
  DROP INDEX "media_sizes_cover_desktop_sizes_cover_desktop_filename_idx";
  DROP INDEX "media_sizes_inline_sizes_inline_filename_idx";
  ALTER TABLE "media" DROP COLUMN "prefix";
  ALTER TABLE "media" DROP COLUMN "url";
  ALTER TABLE "media" DROP COLUMN "thumbnail_u_r_l";
  ALTER TABLE "media" DROP COLUMN "filename";
  ALTER TABLE "media" DROP COLUMN "mime_type";
  ALTER TABLE "media" DROP COLUMN "filesize";
  ALTER TABLE "media" DROP COLUMN "width";
  ALTER TABLE "media" DROP COLUMN "height";
  ALTER TABLE "media" DROP COLUMN "focal_x";
  ALTER TABLE "media" DROP COLUMN "focal_y";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_url";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_width";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_height";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_mobile_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_url";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_width";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_height";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_cover_desktop_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_url";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_width";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_height";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_inline_filename";`)
}
