import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../server/db/schema";
import type { DbLike } from "../server/db";
import {
    analyticsQueryInput,
    mediaAnalyticsIngestInput,
} from "../shared/media-analytics";
import {
    getMediaAnalytics,
    ingestMediaAnalyticsEvent,
} from "../server/services/media-analytics";

describe("first-party Media analytics", { concurrency: false }, () => {
    let client: PGlite, db: DbLike;
    before(async () => {
        client = await PGlite.create();
        db = drizzle(client, { schema }) as unknown as DbLike;
        const journal = JSON.parse(
            await readFile(
                new URL(
                    "../server/db/migrations/meta/_journal.json",
                    import.meta.url,
                ),
                "utf8",
            ),
        );
        for (const entry of journal.entries)
            await client.exec(
                await readFile(
                    new URL(
                        `../server/db/migrations/${entry.tag}.sql`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            );
    });
    after(async () => client.close());
    const base = {
        eventId: "00000000-0000-4000-8000-000000000001",
        eventType: "page_view" as const,
        visitorId: "00000000-0000-4000-8000-000000000010",
        sessionId: "00000000-0000-4000-8000-000000000020",
        path: "/makkah",
        locale: "id" as const,
        entityType: null,
        entityId: null,
        city: "MAKKAH" as const,
        category: null,
        referrerHost: "direct",
        deviceType: "mobile" as const,
        countryCode: "ID",
        metadata: null,
        occurredAt: new Date(),
    };
    it("strictly validates allowlisted, privacy-safe events", () => {
        assert.equal(mediaAnalyticsIngestInput.safeParse(base).success, true);
        assert.equal(
            mediaAnalyticsIngestInput.safeParse({
                ...base,
                eventType: "arbitrary",
            }).success,
            false,
        );
        assert.equal(
            mediaAnalyticsIngestInput.safeParse({
                ...base,
                metadata: { email: "private@example.com" },
            }).success,
            false,
        );
        assert.equal(
            mediaAnalyticsIngestInput.safeParse({
                ...base,
                path: "/x?secret=1",
            }).success,
            false,
        );
        assert.equal(
            analyticsQueryInput.safeParse({
                from: "2026-01-01",
                to: "2028-01-01",
            }).success,
            false,
        );
    });
    it("deduplicates retries and aggregates distinct visitors/sessions and filters", async () => {
        await ingestMediaAnalyticsEvent(db, base);
        assert.equal((await ingestMediaAnalyticsEvent(db, base)).length, 0);
        await ingestMediaAnalyticsEvent(db, {
            ...base,
            eventId: "00000000-0000-4000-8000-000000000002",
            visitorId: "00000000-0000-4000-8000-000000000011",
            sessionId: "00000000-0000-4000-8000-000000000021",
            locale: "en",
            city: "MADINAH",
        });
        const range = {
            from: new Date(Date.now() - 86400000),
            to: new Date(Date.now() + 60000),
        };
        const all = await getMediaAnalytics(db, range);
        assert.equal(all.overview.pageViews, 2);
        assert.equal(all.overview.visitors, 2);
        assert.equal(all.overview.sessions, 2);
        assert.deepEqual(all.sources, [
            { source: "Direct", count: 2, percentage: 100 },
        ]);
        assert.deepEqual(all.devices, [
            { device: "mobile", count: 2, percentage: 100 },
        ]);
        const id = await getMediaAnalytics(db, {
            ...range,
            locale: "id",
            city: "MAKKAH",
        });
        assert.equal(id.overview.pageViews, 1);
    });
    it("keeps ingestion private and admin reporting behind the Media guard", async () => {
        const ingestRoute = await readFile(
            new URL(
                "../server/api/v1/media/analytics/events.post.ts",
                import.meta.url,
            ),
            "utf8",
        );
        const adminGuard = await readFile(
            new URL("../server/middleware/admin-guard.ts", import.meta.url),
            "utf8",
        );
        assert.match(ingestRoute, /x-analytics-ingest-key/);
        assert.match(ingestRoute, /analyticsIngestSecret/);
        assert.equal(
            adminGuard.includes("path.startsWith('/api/admin/media/') ? 'media'"),
            true,
        );
    });
});
