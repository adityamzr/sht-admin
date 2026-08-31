# Media localization: Guides, Gallery, Maps, Home

Branch: `dev`. This phase extends Article localization in `sht-admin` only. It does not add bilingual routes or translated static copy to `sh-web`, modify `sht-web` / Tour, or release to `main`.

## Migration and staging rollout

`0016_media_localization.sql` creates four translation tables and copies existing Indonesian content, including Guide structured bodies and Home topic labels. It does not create English translations, replace master IDs, delete content, or localize Makkah/Madinah Page Settings.

Before using this revision on staging:

1. Back up the staging database and verify the connection belongs to staging, not production.
2. Use the repository's existing secret configuration (`NUXT_DATABASE_URL` in your local environment / untracked `.env`). Never commit or share the connection string.
3. From the updated `dev` checkout run `npm ci`, then `npm run db:migrate`. Do not run `db:generate` or reseed existing content for this rollout.
4. Deploy/redeploy this revision to staging after the migration succeeds. Code queries the new tables, so do not leave staging serving this revision against an unmigrated database.
5. Perform the authenticated smoke checklist below before any production release.

The additive migration can be applied while the previous code is still running. A successful build or Vercel deployment does **not** prove migration or staging smoke completion. The agent's isolated tests do not access any staging / production database.

## Content contract

- `translations.id` is canonical for localized input, admin reads, and public ID reads. Existing top-level localized columns are derived compatibility mirrors.
- Legacy request bodies normalize into ID only when the entire ID translation is absent. An existing ID translation is never patched from conflicting legacy fields.
- English may be saved partially. Omission of `translations.en` preserves an existing English translation; an explicitly supplied empty English object clears its content.
- Shared master fields include IDs, assets, coordinates, categories/tags, group/order, status, publication dates, and selected article IDs. Editing English does not republish or unpublish content.
- Each module writes master and translations in one transaction. No asset cleanup occurs before Home's transaction commits.

| Module | Localized fields | English public readiness |
| --- | --- | --- |
| Guides | title, slug, summary, structured body | Nonblank title and slug; nonempty body |
| Gallery | altText, title, description, locationName | Nonblank altText; other text remains optional |
| Maps | name, shortDescription, altText | Nonblank name and shortDescription |
| Home | heroHeadline, heroSubheadline, heroTopicLabels | Both hero texts plus labels for every active custom topic |

Guide slugs are unique within a locale. Nullable English slugs may coexist. The same literal slug in different locales may identify different masters, so consumers must always retain locale with a slug.

Home custom topic structure uses shared `{ id, isActive, sortOrder }` records. Translation labels are keyed by topic ID, not position. A null topic override delegates defaults to the future locale-aware frontend. Partial Home English returns null text/topic overrides with `translationAvailable: false`; it never returns ID text as an English fallback. A shared hero image remains available. English article slots include only published articles with complete English translations, preserving their master IDs.

## APIs and editors

Existing public paths accept `?locale=id|en`; omitted / empty locale keeps ID compatibility. Unsupported locales return 400. Guides/Gallery/Locations exclude incomplete English and hidden masters before filtering, limit, and pagination. Search uses the requested translation. Detail endpoints include `availableLocales`; Guide detail also includes `localizedSlugs`. Unavailable English detail returns 404.

Admin lists expose `translations` and completeness. `?translation=complete|incomplete` filters the whole matching dataset in SQL before pagination and counting. All three list editors include one English filter, readiness badges, independent language state, and locale preview. Home has language tabs, readiness, preview, and shared topic controls under Indonesia.

This does not translate stored content automatically. Editors still need to author English content. Bilingual frontend routes, labels for shared category codes, language switcher, SEO/hreflang and legal copy remain the next `sh-web` phase.

## Verification

```bash
npm run test:media
node node_modules/vue-tsc/bin/vue-tsc.js --noEmit
npm run build
```

Tests use existing `node:test`, PGlite with the actual migration history, and compiled/rendered Vue SFCs. They cover old-data backfill, canonical mirrors/read/reload, partial EN, public visibility/search/pagination, readiness filters, Guide slug collisions, real database failure rollback, Home topic identity/slots, and editor/preview language separation. Existing Article regression tests are included.

Authenticated staging smoke after migration:

- Open existing ID content in each editor; verify bodies, images, coordinates, and order are unchanged.
- Save partial EN; reload and confirm partial content persists but public EN list/detail excludes it.
- Complete EN; verify both preview languages and readiness filters across multiple pages.
- Open a Guide by both localized slugs, and Gallery/Location by the same ID with each locale.
- Edit English on published content and confirm status and original publication date remain unchanged.
- Reorder a Home topic and confirm English labels stay with the correct ID; check partial/default Home output and English article slot exclusions.
- Check Article, contributions, feedback, and Makkah/Madinah settings still work.
- Check ID consumers in `sh-web`; no `/en` frontend is part of this change.
