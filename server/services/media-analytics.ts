import { and, eq, gte, lte, sql } from "drizzle-orm";
import {
    articleFeedback,
    articles,
    articleTranslations,
    guideTranslations,
    guides,
    mediaAnalyticsEvents,
} from "../db/schema";
import type { DbLike } from "../db";
import type { z } from "zod";
import type {
    analyticsQueryInput,
    mediaAnalyticsIngestInput,
} from "../../shared/media-analytics";

type EventInput = z.output<typeof mediaAnalyticsIngestInput>;
type Filters = z.output<typeof analyticsQueryInput>;
export async function ingestMediaAnalyticsEvent(db: DbLike, input: EventInput) {
    return db
        .insert(mediaAnalyticsEvents)
        .values(input)
        .onConflictDoNothing({ target: mediaAnalyticsEvents.eventId })
        .returning({ id: mediaAnalyticsEvents.id });
}
const where = (f: Filters) =>
    and(
        gte(mediaAnalyticsEvents.occurredAt, f.from),
        lte(mediaAnalyticsEvents.occurredAt, f.to),
        f.locale ? eq(mediaAnalyticsEvents.locale, f.locale) : undefined,
        f.city ? eq(mediaAnalyticsEvents.city, f.city) : undefined,
    );
const num = (value: any) => Number(value ?? 0);
const sourceCategory = (host: string) => {
    const value = host.toLowerCase();
    if (value === "direct") return "Direct";
    if (value.includes("google") || value.includes("bing")) return "Search";
    if (value.includes("instagram")) return "Instagram";
    if (value.includes("wa.me") || value.includes("whatsapp"))
        return "WhatsApp";
    return "Other";
};
const withPercentages = <T extends Record<string, unknown>>(
    values: T[],
    count: (value: T) => number,
) => {
    const total = values.reduce((sum, value) => sum + count(value), 0);
    return values.map((value) => ({
        ...value,
        percentage: total ? Math.round((count(value) / total) * 1000) / 10 : 0,
    }));
};
export async function getMediaAnalytics(db: DbLike, f: Filters) {
    const condition = where(f);
    const [
        overviewRaw,
        trendRaw,
        pagesRaw,
        contentRaw,
        guidesRaw,
        searchRaw,
        sourceRaw,
        deviceRaw,
        interactionsRaw,
        cityRaw,
    ] = await Promise.all([
        db
            .select({
                pageViews: sql<number>`count(*) filter(where ${mediaAnalyticsEvents.eventType}='page_view')`,
                visitors: sql<number>`count(distinct ${mediaAnalyticsEvents.visitorId})`,
                sessions: sql<number>`count(distinct ${mediaAnalyticsEvents.sessionId})`,
                articleViews: sql<number>`count(*) filter(where ${mediaAnalyticsEvents.eventType}='article_view')`,
            })
            .from(mediaAnalyticsEvents)
            .where(condition),
        db
            .select({
                day: sql<string>`to_char(date_trunc('day',${mediaAnalyticsEvents.occurredAt} at time zone 'Asia/Jakarta'),'YYYY-MM-DD')`,
                pageViews: sql<number>`count(*) filter(where ${mediaAnalyticsEvents.eventType}='page_view')`,
                visitors: sql<number>`count(distinct ${mediaAnalyticsEvents.visitorId})`,
            })
            .from(mediaAnalyticsEvents)
            .where(condition)
            .groupBy(
                sql`date_trunc('day',${mediaAnalyticsEvents.occurredAt} at time zone 'Asia/Jakarta')`,
            )
            .orderBy(
                sql`date_trunc('day',${mediaAnalyticsEvents.occurredAt} at time zone 'Asia/Jakarta')`,
            ),
        db
            .select({
                path: mediaAnalyticsEvents.path,
                views: sql<number>`count(*)`,
                visitors: sql<number>`count(distinct ${mediaAnalyticsEvents.visitorId})`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(condition, eq(mediaAnalyticsEvents.eventType, "page_view")),
            )
            .groupBy(mediaAnalyticsEvents.path)
            .orderBy(sql`count(*) desc`)
            .limit(10),
        db
            .select({
                id: articles.id,
                title: sql<string>`coalesce(${articleTranslations.title},${articles.title})`,
                views: sql<number>`count(distinct ${mediaAnalyticsEvents.id})`,
                visitors: sql<number>`count(distinct ${mediaAnalyticsEvents.visitorId})`,
                helpful: sql<number>`count(distinct ${articleFeedback.id}) filter(where ${articleFeedback.value}='HELPFUL')`,
                notHelpful: sql<number>`count(distinct ${articleFeedback.id}) filter(where ${articleFeedback.value}='NOT_HELPFUL')`,
            })
            .from(mediaAnalyticsEvents)
            .innerJoin(articles, eq(mediaAnalyticsEvents.entityId, articles.id))
            .leftJoin(
                articleTranslations,
                and(
                    eq(articleTranslations.articleId, articles.id),
                    eq(articleTranslations.locale, f.locale ?? "id"),
                ),
            )
            .leftJoin(
                articleFeedback,
                eq(articleFeedback.articleId, articles.id),
            )
            .where(
                and(
                    condition,
                    eq(mediaAnalyticsEvents.eventType, "article_view"),
                    eq(mediaAnalyticsEvents.entityType, "article"),
                ),
            )
            .groupBy(articles.id, articleTranslations.title)
            .orderBy(sql`count(distinct ${mediaAnalyticsEvents.id}) desc`)
            .limit(10),
        db
            .select({
                id: guides.id,
                title: sql<string>`coalesce(${guideTranslations.title},${guides.title})`,
                views: sql<number>`count(*)`,
                visitors: sql<number>`count(distinct ${mediaAnalyticsEvents.visitorId})`,
            })
            .from(mediaAnalyticsEvents)
            .innerJoin(guides, eq(mediaAnalyticsEvents.entityId, guides.id))
            .leftJoin(
                guideTranslations,
                and(
                    eq(guideTranslations.guideId, guides.id),
                    eq(guideTranslations.locale, f.locale ?? "id"),
                ),
            )
            .where(
                and(
                    condition,
                    eq(mediaAnalyticsEvents.eventType, "guide_view"),
                    eq(mediaAnalyticsEvents.entityType, "guide"),
                ),
            )
            .groupBy(guides.id, guideTranslations.title)
            .orderBy(sql`count(*) desc`)
            .limit(10),
        db
            .select({
                keyword: sql<string>`${mediaAnalyticsEvents.metadata}->>'query'`,
                count: sql<number>`count(*)`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(
                    condition,
                    eq(mediaAnalyticsEvents.eventType, "search"),
                    sql`${mediaAnalyticsEvents.metadata}->>'query' is not null`,
                ),
            )
            .groupBy(sql`${mediaAnalyticsEvents.metadata}->>'query'`)
            .orderBy(sql`count(*) desc`)
            .limit(10),
        db
            .select({
                source: sql<string>`coalesce(${mediaAnalyticsEvents.referrerHost},'direct')`,
                count: sql<number>`count(*)`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(condition, eq(mediaAnalyticsEvents.eventType, "page_view")),
            )
            .groupBy(mediaAnalyticsEvents.referrerHost)
            .orderBy(sql`count(*) desc`),
        db
            .select({
                device: sql<string>`coalesce(${mediaAnalyticsEvents.deviceType},'other')`,
                count: sql<number>`count(*)`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(condition, eq(mediaAnalyticsEvents.eventType, "page_view")),
            )
            .groupBy(mediaAnalyticsEvents.deviceType),
        db
            .select({
                type: mediaAnalyticsEvents.eventType,
                count: sql<number>`count(*)`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(
                    condition,
                    sql`${mediaAnalyticsEvents.eventType} in ('whatsapp_click','instagram_click','map_direction_click','gallery_open','contribution_submit','article_feedback_helpful','article_feedback_not_helpful')`,
                ),
            )
            .groupBy(mediaAnalyticsEvents.eventType),
        db
            .select({
                city: mediaAnalyticsEvents.city,
                views: sql<number>`count(*)`,
                articleViews: sql<number>`count(*) filter(where ${mediaAnalyticsEvents.eventType}='article_view')`,
                mapInteractions: sql<number>`count(*) filter(where ${mediaAnalyticsEvents.eventType} in ('map_location_view','map_direction_click'))`,
            })
            .from(mediaAnalyticsEvents)
            .where(
                and(
                    condition,
                    sql`${mediaAnalyticsEvents.city} in ('MAKKAH','MADINAH')`,
                ),
            )
            .groupBy(mediaAnalyticsEvents.city),
    ]);
    const overview = overviewRaw[0] ?? ({} as any),
        sessions = num(overview.sessions);
    const content = contentRaw.map((x: any) => {
        const total = num(x.helpful) + num(x.notHelpful),
            rate = total ? Math.round((num(x.helpful) / total) * 100) : null;
        return {
            ...x,
            views: num(x.views),
            visitors: num(x.visitors),
            helpful: num(x.helpful),
            notHelpful: num(x.notHelpful),
            helpfulRate: rate,
            signal:
                num(x.views) >= 20 && rate !== null && rate < 60
                    ? "Perlu Perhatian"
                    : num(x.views) >= 10 && rate !== null && rate < 75
                      ? "Perlu Dipantau"
                      : "Baik",
        };
    });
    const sourceCounts = new Map<string, number>();
    for (const source of sourceRaw) {
        const category = sourceCategory(String(source.source));
        sourceCounts.set(category, (sourceCounts.get(category) ?? 0) + num(source.count));
    }
    const sources = withPercentages(
        [...sourceCounts].map(([source, count]) => ({ source, count })),
        (value) => value.count,
    ).sort((a, b) => b.count - a.count);
    const devices = withPercentages(
        deviceRaw.map((x: any) => ({ ...x, count: num(x.count) })),
        (value) => value.count,
    ).sort((a, b) => b.count - a.count);
    return {
        overview: {
            pageViews: num(overview.pageViews),
            visitors: num(overview.visitors),
            sessions,
            articleViews: num(overview.articleViews),
            pagesPerSession: sessions
                ? Math.round((num(overview.pageViews) / sessions) * 100) / 100
                : null,
        },
        trend: trendRaw.map((x: any) => ({
            ...x,
            pageViews: num(x.pageViews),
            visitors: num(x.visitors),
        })),
        topPages: pagesRaw.map((x: any) => ({
            ...x,
            views: num(x.views),
            visitors: num(x.visitors),
        })),
        articles: content,
        guides: guidesRaw.map((x: any) => ({
            ...x,
            views: num(x.views),
            visitors: num(x.visitors),
        })),
        searches: searchRaw.map((x: any) => ({ ...x, count: num(x.count) })),
        sources,
        devices,
        interactions: interactionsRaw.map((x: any) => ({
            ...x,
            count: num(x.count),
        })),
        cities: cityRaw.map((x: any) => ({
            ...x,
            views: num(x.views),
            articleViews: num(x.articleViews),
            mapInteractions: num(x.mapInteractions),
        })),
    };
}
