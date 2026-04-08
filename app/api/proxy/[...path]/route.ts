import { NextRequest } from "next/server";
import { getApiBaseCandidates } from "@/lib/apiBase";

const UPSTREAM_TIMEOUT_MS = 75000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function buildTargetUrl(apiBaseUrl: string, pathParts: string[], search: string): string {
  const joinedPath = pathParts.join("/");
  return `${apiBaseUrl}/${joinedPath}${search}`;
}

function copyResponseHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers();

  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      nextHeaders.set(key, value);
    }
  });

  return nextHeaders;
}

async function forwardRequest(
  request: NextRequest,
  pathParts: string[]
): Promise<Response> {
  const method = request.method.toUpperCase();
  const search = request.nextUrl.search;
  const requestBody =
    method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  let lastError: Error | null = null;
  let lastRetryableResponse: Response | null = null;

  for (const apiBaseUrl of getApiBaseCandidates()) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
      const upstreamHeaders = new Headers(request.headers);
      HOP_BY_HOP_HEADERS.forEach((header) => upstreamHeaders.delete(header));

      const upstreamResponse = await fetch(
        buildTargetUrl(apiBaseUrl, pathParts, search),
        {
          method,
          headers: upstreamHeaders,
          body: requestBody,
          cache: "no-store",
          redirect: "manual",
          signal: controller.signal,
        }
      );

      if (RETRYABLE_STATUSES.has(upstreamResponse.status)) {
        lastRetryableResponse = upstreamResponse;
        continue;
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: copyResponseHeaders(upstreamResponse.headers),
      });
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Failed to reach backend");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  if (lastRetryableResponse) {
    return new Response(lastRetryableResponse.body, {
      status: lastRetryableResponse.status,
      statusText: lastRetryableResponse.statusText,
      headers: copyResponseHeaders(lastRetryableResponse.headers),
    });
  }

  return Response.json(
    {
      message:
        lastError?.message ||
        "Unable to reach any configured backend service at this time.",
    },
    { status: 503 }
  );
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return forwardRequest(request, path);
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return handle(request, context);
}
