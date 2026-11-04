import type { Instrumentation } from "next";

// Captures every server-side error Next.js sees (render, route handler,
// Server Action, proxy/middleware) and writes it to logs/YYYY-MM-DD.log so a
// production failure can be diagnosed after the fact. Dynamically imports
// the fs-backed logger rather than importing it at the top of this file,
// since this file is also compiled for the Edge runtime (middleware.ts runs
// there), which has no `fs` module.
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }
  const { logError } = await import("@/lib/logging/error-log");
  logError(error, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
  });
};
