import { analyticsQueryInput } from "~/shared/media-analytics";
import { getMediaAnalytics } from "~/server/services/media-analytics";
import { useDb } from "~/server/db";
export default defineEventHandler(async (event) => {
    const q = getQuery(event);
    const parsed = analyticsQueryInput.safeParse({
        from: q.from,
        to: q.to,
        locale: q.locale || undefined,
        city: q.city || undefined,
    });
    if (!parsed.success)
        throw createError({
            statusCode: 400,
            statusMessage: "Filter analytics tidak valid.",
        });
    return { data: await getMediaAnalytics(useDb(), parsed.data) };
});
