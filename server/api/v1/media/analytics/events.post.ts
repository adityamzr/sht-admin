import { mediaAnalyticsIngestInput } from "~/shared/media-analytics";
import { ingestMediaAnalyticsEvent } from "~/server/services/media-analytics";
import { useDb } from "~/server/db";
export default defineEventHandler(async (event) => {
    const configured = useRuntimeConfig().analyticsIngestSecret;
    if (
        !configured ||
        getHeader(event, "x-analytics-ingest-key") !== configured
    )
        throw createError({
            statusCode: 401,
            statusMessage: "Analytics ingestion tidak diizinkan.",
        });
    const body = await readBody(event);
    const parsed = mediaAnalyticsIngestInput.safeParse(body);
    if (!parsed.success)
        throw createError({
            statusCode: 400,
            statusMessage: "Event analytics tidak valid.",
        });
    const inserted = await ingestMediaAnalyticsEvent(useDb(), parsed.data);
    return { ok: true, duplicate: inserted.length === 0 };
});
