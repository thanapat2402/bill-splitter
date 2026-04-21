export const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers":
    "content-type, authorization, x-client-info, apikey",
};

export function jsonResponse(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  Object.entries(corsHeaders).forEach(([key, value]) =>
    headers.set(key, value),
  );
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function errorResponse(
  status: number,
  errorCode: string,
  message: string,
) {
  return jsonResponse(
    {
      errorCode,
      message,
    },
    { status },
  );
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON_BODY");
  }
}

export function preflightResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
