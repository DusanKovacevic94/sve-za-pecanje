# Blog editor guide

The editor lives at `https://cms.svezapecanje.rs/admin` after the separately authorized
rollout. Public articles live on the marketplace at `/blog`. This guide describes the
current English Payload controls; **Publish changes** is referred to as Publish below.
Article text must be Serbian Latin (`č ć ž š đ`).
Local rehearsals use disposable addresses and synthetic content, never production.

## Sign in and recover access

Use your individual CMS account, not your marketplace login. An administrator creates
editor accounts in **Users**; there is no public editor registration. Editors can manage
all articles, authors and media, but cannot grant roles or manage other accounts.

Use **Forgot password?** on the CMS login page if needed. The emailed link expires after
30 minutes and is single-use. Five incorrect passwords lock an account for ten minutes;
ask a CMS administrator to unlock it if necessary. Do not share passwords, recovery links
or preview links. If recovery mail does not arrive, contact the operator; do not create a
replacement account or repeatedly attempt bootstrap. Sign out on shared computers.

## Prepare author and images

In **Authors → Create New**, enter the real approved public name and a short, factual
biography. Enable **Is Public** when the profile is ready to appear in an article.
The author profile is separate from the private editor account. Internal notes are not
reader-facing. Do not invent expertise, endorsements or product-testing experience.

In **Media → Create New**, choose an image, fill **Alt**, add a factual caption and a
credit identifying the photographer/source and permission, then save. Enable **Is Public**
only when its metadata is approved for publication. Publication requires this flag and alt
text for the cover and every inline image.

- Use only images you own or have permission to publish. Keep license/permission evidence
  outside the public caption if it contains private information.
- Files are **publicly addressable immediately, including images uploaded for drafts**.
  Unchecking Is Public hides metadata, not the stored image. Never upload personal
  documents, addresses, private messages or confidential material.
- JPEG, PNG and WebP only; no animation or SVG. Maximum 10 MB, at least 180 pixels per side,
  no more than 10,000 pixels per side or 40 megapixels. A landscape image around 1600×900
  suits the cover; check its automatically generated 16:9 crop in preview.
- The server strips embedded metadata and creates WebP sizes. Alt text describes the
  useful visual information, not a keyword list. Put source/rights information in Credit.
- Files and crops cannot be replaced in place. Upload a new media record, change article
  references, and review the preview. Do not reuse a filename as a replacement mechanism.
- Deletion is blocked while any article or retained version references the file. Ask the
  operator about obsolete media; do not bypass this protection in object storage.

## Create and save an article

Open **Posts → Create New**. Prepare these fields:

| Field | What to enter |
| --- | --- |
| Title | Specific, useful Serbian Latin heading; maximum 180 characters. |
| Slug | Short lowercase Latin URL words separated by single hyphens; no accents/spaces. Must be unique. `preview` is reserved. |
| Excerpt | A factual introduction for the blog index; maximum 400 characters. |
| Body | Article text with headings, paragraphs, lists, emphasis, quotes and approved images/links. No raw HTML, scripts or embeds. |
| Author | The approved public author profile. |
| Cover Image | A saved image with approved metadata and meaningful alt text. |
| Seo Title | Search-result title; maximum 70 characters. |
| Seo Description | Accurate summary; maximum 180 characters. No unsupported promises. |
| Naslov za društvene mreže | Optional shorter title for social artwork; maximum 100 characters. Blank uses Title without changing it. |
| Opis za društvene mreže | Optional shorter description for social artwork; maximum 180 characters. Blank uses Excerpt without changing it. |
| Marketplace Category Slug | Optional slug from an existing `/kategorije/<slug>` URL, not the full URL. Leave blank if unrelated. |
| Substantive Updated At | Only a meaningful update after publication; not a typo, future date or SEO freshness trick. |

**First Published At** is set by the CMS. Do not attempt to edit it. **Internal Notes**
are for editorial coordination and are excluded from public article data.

The two social-copy fields are visible only to CMS editors/admins, including after
publication. They participate in autosave and version recovery. Clear a field to restore
its fallback; clearing one does not affect the other. Whitespace-only values count as
blank. Social copy does not change article text, SEO metadata, or the article URL.

Character limits are field limits, not a guarantee that copy fits the image: wide words
or long lines may require shorter social copy later. An article can still be published
with no social overrides or with fallback text too long for a card. Image preview and
download are the next implementation step; these fields do not publish to social accounts.

Save the initial draft before leaving the screen. Autosave runs while editing an existing
article, but is not a promise that an offline or interrupted edit reached the server.
Wait for the saved indicator, then reload and confirm your last change before ending a
session. An incomplete draft may be saved; **Publish** validates all required information.
Coordinate edits with colleagues rather than overwriting their work.

## Preview and publish

1. Save and use the article's **Preview** link. It opens the marketplace's separate preview
   screen in a new tab with a visible draft banner. Reopen Preview if the short-lived
   handoff expires. A copied public-looking preview path will not work for another reader.
2. Review title, introduction, author, image crops/alt text/credits, links and headings at
   desktop and mobile widths. Check spelling, claims, factual safety advice and permissions.
3. Check **Povezani oglasi** if a category is selected. These are current marketplace ads,
   not an endorsement or evidence the article tested those products. Empty inventory is
   valid; a missing category must be corrected or cleared before publishing.
4. Get the editorial approval required by your team. **Publish makes the article public
   immediately**; there is no separate approval queue or scheduled publishing workflow.
5. Click **Publish**. If a validation message appears, correct the named fields and try
   again. During a category API outage, save the draft and retry later; do not clear a
   useful category merely to work around an unreviewed operational failure.
6. Open the public article in a signed-out window and check the blog index. End the preview
   using **Završi pregled**. Never use preview screenshots as proof an article is public.

The slug becomes immutable at first publication, even after withdrawal. Choose it carefully.
Ask engineering about a deliberate redirect/migration if a published URL truly must change.

## Revisions, recovery and withdrawal

Editing an already published article saves a **private draft revision**; readers keep the
last published version until you click Publish again. Reload to confirm autosave, open a
fresh Preview and review the differences before republishing.

Use the document's **Versions** history to inspect earlier revisions. Up to 50 versions
per article are retained; this is not a permanent archive. Compare the version before
restoring it. For a previously published version, use **Restore as draft** where offered;
restoring a published state can affect the live article. Confirm the restore dialog,
return to the editor, preview the recovered text and publish only after review. Database
and media backups are an operator responsibility, not a replacement for this history.

To remove an article from public view, open the document's three-dot menu, choose
**Unpublish**, and click **Confirm** in the dialog. Saving a
private revision is not withdrawal. Check the public URL returns not found and that the
article is absent from the index/sitemap. Search engines may retain their own previous
copies until recrawling. Prefer withdrawal over deleting an article/history by accident.
Image URLs remain public even when the article is withdrawn.

If a publish/unpublish result is inconsistent, send the operator the article ID, time and
observed public URL—not passwords, cookies, recovery tokens or signed preview URLs.

## First real article checklist

After rollout approval, and before anyone publishes a real article:

- [ ] Confirm the live editor hostname, assigned account, recovery email and responsible editor.
- [ ] Use real approved content and author details; no `probni-` or synthetic test material.
- [ ] Verify all factual claims, image rights, credits and Serbian Latin text.
- [ ] Confirm title/excerpt/SEO fields, final immutable slug and meaningful image alternatives.
- [ ] Preview mobile/desktop, keyboard links and cover crops; verify the selected category.
- [ ] Obtain editorial approval and explicit authorization for first publication.
- [ ] After publishing, check signed-out article/index/sitemap and relevant marketplace links.
- [ ] Keep analytics disabled until its separate privacy/configuration review is approved.

Operators: see [CMS operations](cms-operations.md). Release reviewers: see the
[release checklist](blog-release-checklist.md). Click counts describe engagement, not
seller contacts or confirmed sales.
