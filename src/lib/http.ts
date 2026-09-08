import { createHash, randomUUID } from "node:crypto";
import { query } from "./db";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "request_error",
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Usa Content-Type: application/json.");
  const reader = request.body?.getReader();
  let text = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 65536) {
        await reader.cancel();
        throw new ApiError(413, "La solicitud supera 64 KB.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "El JSON no es válido.");
  }
}
export function checkOrigin(request: Request, required = false) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || new URL(request.url).origin;
  if ((required && !origin) || (origin && origin !== expected))
    throw new ApiError(403, "Origen de solicitud no permitido.", "csrf");
}
export async function limit(key: string, max = 120, seconds = 60) {
  const result = await query<{ count: number }>(
    `INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+($2 * interval '1 second')) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END, expires_at=CASE WHEN rate_limits.expires_at<now() THEN excluded.expires_at ELSE rate_limits.expires_at END RETURNING count`,
    [hash(key), seconds],
  );
  if (result.rows[0].count > max)
    throw new ApiError(
      429,
      "Demasiadas solicitudes. Intenta nuevamente en un minuto.",
      "rate_limited",
    );
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return json(
      { error: { code: error.code, message: error.message } },
      error.status,
      error.status === 429 ? { "Retry-After": "60" } : {},
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["23505", "23503", "23001"].includes(String(error.code))
  )
    return json(
      {
        error: {
          code: "conflict",
          message:
            "El registro ya existe o tiene relaciones que impiden esta operación.",
        },
      },
      409,
    );
  const id = randomUUID();
  console.error(
    "Request failed",
    id,
    error instanceof Error ? error.name : "UnknownError",
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "",
  );
  if (process.env.NODE_ENV === "development" && error instanceof Error)
    console.error(error.message);
  return json(
    {
      error: {
        code: "internal_error",
        message: "No pudimos completar la operación.",
        requestId: id,
      },
    },
    500,
  );
}
