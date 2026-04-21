import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  preflightResponse,
} from "../_shared/http.ts";
import { createAdminClient } from "../_shared/supabase.ts";
import {
  hashToken,
  isShareLinkActive,
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
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const expectedVersion = Number(body.expectedVersion);
    const data = body.data;

    if (!token) {
      return errorResponse(400, "TOKEN_REQUIRED", "Share token is required.");
    }

    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      return errorResponse(
        400,
        "EXPECTED_VERSION_REQUIRED",
        "expectedVersion must be a positive integer.",
      );
    }

    validateTripSnapshot(data);

    const adminClient = createAdminClient();
    const tokenHash = await hashToken(token);

    const linkResult = await adminClient
      .from("trip_share_links")
      .select("trip_id, role, revoked_at, expires_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (linkResult.error) {
      throw new Error("SAVE_TRIP_FAILED");
    }

    if (!linkResult.data) {
      return errorResponse(404, "LINK_NOT_FOUND", "Share link was not found.");
    }

    if (!isShareLinkActive(linkResult.data)) {
      const errorCode = linkResult.data.revoked_at
        ? "LINK_REVOKED"
        : "LINK_EXPIRED";
      return errorResponse(410, errorCode, "Share link is no longer active.");
    }

    if (linkResult.data.role !== "edit") {
      return errorResponse(
        403,
        "READ_ONLY_LINK",
        "This share link cannot edit the trip.",
      );
    }

    const updateResult = await adminClient
      .from("trips")
      .update({
        data,
        version: expectedVersion + 1,
      })
      .eq("id", linkResult.data.trip_id)
      .eq("version", expectedVersion)
      .is("archived_at", null)
      .select("id, version, updated_at")
      .maybeSingle();

    if (updateResult.error) {
      throw new Error("SAVE_TRIP_FAILED");
    }

    if (!updateResult.data) {
      const latestTrip = await adminClient
        .from("trips")
        .select("version, updated_at")
        .eq("id", linkResult.data.trip_id)
        .maybeSingle();

      return jsonResponse(
        {
          errorCode: "VERSION_CONFLICT",
          message: "Trip was updated by another client.",
          latestVersion: latestTrip.data?.version ?? null,
          latestUpdatedAt: latestTrip.data?.updated_at ?? null,
        },
        { status: 409 },
      );
    }

    return jsonResponse({
      tripId: updateResult.data.id,
      version: updateResult.data.version,
      updatedAt: updateResult.data.updated_at,
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

    return errorResponse(500, "SAVE_TRIP_FAILED", "Could not save trip.");
  }
});
