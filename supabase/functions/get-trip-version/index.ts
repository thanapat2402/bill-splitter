import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  preflightResponse,
} from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import { hashToken, isShareLinkActive } from "../_shared/trip.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return preflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported.");
  }

  try {
    const body = await parseJsonBody(request);
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return errorResponse(400, "TOKEN_REQUIRED", "Share token is required.");
    }

    const adminClient = createAdminClient();
    const tokenHash = await hashToken(token);

    const linkResult = await adminClient
      .from("trip_share_links")
      .select("trip_id, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkResult.error) {
      throw new Error("GET_TRIP_VERSION_FAILED");
    }

    if (!linkResult.data) {
      return errorResponse(404, "LINK_NOT_FOUND", "Share link was not found.");
    }

    if (!isShareLinkActive(linkResult.data)) {
      const errorCode = linkResult.data.revoked_at ? "LINK_REVOKED" : "LINK_EXPIRED";
      return errorResponse(410, errorCode, "Share link is no longer active.");
    }

    const tripResult = await adminClient
      .from("trips")
      .select("id, version, updated_at, archived_at")
      .eq("id", linkResult.data.trip_id)
      .maybeSingle();

    if (tripResult.error) {
      throw new Error("GET_TRIP_VERSION_FAILED");
    }

    if (!tripResult.data || tripResult.data.archived_at) {
      return errorResponse(404, "TRIP_NOT_FOUND", "Trip was not found.");
    }

    return jsonResponse({
      tripId: tripResult.data.id,
      version: tripResult.data.version,
      updatedAt: tripResult.data.updated_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_BODY") {
      return errorResponse(400, "INVALID_JSON_BODY", "Request body must be valid JSON.");
    }

    if (error instanceof Error && error.message === "SUPABASE_ENV_NOT_CONFIGURED") {
      return errorResponse(500, "SUPABASE_ENV_NOT_CONFIGURED", "Supabase environment variables are missing.");
    }

    return errorResponse(500, "GET_TRIP_VERSION_FAILED", "Could not get latest trip version.");
  }
});