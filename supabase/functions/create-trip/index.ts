import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  preflightResponse,
} from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  generateShareToken,
  hashToken,
  validateTripSnapshot,
} from "../_shared/trip.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported.");
  }

  try {
    const body = await parseJsonBody(request);
    const title = typeof body.title === "string" ? body.title.trim() : null;
    const data = body.data;

    validateTripSnapshot(data);

    const adminClient = createAdminClient();
    const viewToken = generateShareToken();
    const editToken = generateShareToken();
    const viewTokenHash = await hashToken(viewToken);
    const editTokenHash = await hashToken(editToken);

    const tripResult = await adminClient
      .from("trips")
      .insert({
        title,
        data,
        version: 1,
      })
      .select("id, version, updated_at")
      .single();

    if (tripResult.error || !tripResult.data) {
      throw new Error("TRIP_CREATE_FAILED");
    }

    const linkResult = await adminClient.from("trip_share_links").insert([
      {
        trip_id: tripResult.data.id,
        token_hash: viewTokenHash,
        role: "view",
      },
      {
        trip_id: tripResult.data.id,
        token_hash: editTokenHash,
        role: "edit",
      },
    ]);

    if (linkResult.error) {
      throw new Error("TRIP_LINK_CREATE_FAILED");
    }

    const appBaseUrl =
      Deno.env.get("APP_BASE_URL") ?? new URL(request.url).origin;

    return jsonResponse({
      tripId: tripResult.data.id,
      version: tripResult.data.version,
      updatedAt: tripResult.data.updated_at,
      viewUrl: `${appBaseUrl}/?share=${viewToken}`,
      editUrl: `${appBaseUrl}/?share=${editToken}`,
      viewToken,
      editToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return errorResponse(
        400,
        "INVALID_JSON_BODY",
        "Request body must be valid JSON.",
      );
    }

    if (error instanceof Error && error.message === "INVALID_TRIP_DATA") {
      return errorResponse(
        422,
        "INVALID_TRIP_DATA",
        "Trip snapshot is invalid.",
      );
    }

    if (error instanceof Error && error.message === "UNSUPPORTED_TRIP_SCHEMA") {
      return errorResponse(
        422,
        "UNSUPPORTED_TRIP_SCHEMA",
        "Unsupported trip schema version.",
      );
    }

    if (
      error instanceof Error &&
      error.message === "SUPABASE_ENV_NOT_CONFIGURED"
    ) {
      return errorResponse(
        500,
        "SUPABASE_ENV_NOT_CONFIGURED",
        "Supabase environment variables are missing.",
      );
    }

    return errorResponse(500, "CREATE_TRIP_FAILED", "Could not create trip.");
  }
});
