import { z } from "zod";

export const MEDIA_ANALYTICS_EVENTS = [
    "page_view",
    "article_view",
    "guide_view",
    "gallery_open",
    "map_location_view",
    "map_direction_click",
    "search",
    "instagram_click",
    "whatsapp_click",
    "contribution_submit",
    "article_feedback_helpful",
    "article_feedback_not_helpful",
] as const;
export type MediaAnalyticsEventType = (typeof MEDIA_ANALYTICS_EVENTS)[number];

const metadata = z
    .object({ query: z.string().trim().max(100).optional() })
    .strict()
    .nullable()
    .optional();
export const mediaAnalyticsIngestInput = z
    .object({
        eventId: z.string().uuid(),
        eventType: z.enum(MEDIA_ANALYTICS_EVENTS),
        visitorId: z.string().uuid(),
        sessionId: z.string().uuid(),
        path: z
            .string()
            .startsWith("/")
            .max(300)
            .refine((v) => !v.includes("?") && !v.includes("#")),
        locale: z.enum(["id", "en"]),
        entityType: z
            .enum(["article", "guide", "gallery", "map_location"])
            .nullable()
            .optional(),
        entityId: z
            .number()
            .int()
            .positive()
            .max(2_147_483_647)
            .nullable()
            .optional(),
        city: z.enum(["MAKKAH", "MADINAH", "GENERAL"]).nullable().optional(),
        category: z.string().trim().max(80).nullable().optional(),
        referrerHost: z.string().trim().max(120).nullable().optional(),
        deviceType: z
            .enum(["desktop", "mobile", "tablet", "other"])
            .nullable()
            .optional(),
        countryCode: z
            .string()
            .regex(/^[A-Z]{2}$/)
            .nullable()
            .optional(),
        metadata,
        occurredAt: z.coerce
            .date()
            .refine(
                (value) =>
                    value.getTime() <= Date.now() + 60_000 &&
                    value.getTime() >= Date.now() - 86_400_000,
            ),
    })
    .strict();

export const analyticsQueryInput = z
    .object({
        from: z.coerce.date(),
        to: z.coerce.date(),
        locale: z.enum(["id", "en"]).optional(),
        city: z.enum(["MAKKAH", "MADINAH"]).optional(),
    })
    .refine(
        (v) =>
            v.to >= v.from &&
            v.to.getTime() - v.from.getTime() <= 366 * 86_400_000,
    );
