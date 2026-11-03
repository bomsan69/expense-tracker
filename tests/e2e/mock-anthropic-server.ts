import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export const MOCK_SUCCESS_KEY = "mock-key-success";
export const MOCK_AUTH_FAIL_KEY = "mock-key-auth-fail";

function respond(req: IncomingMessage, res: ServerResponse): void {
  // The SDK sends the key as `Authorization: Bearer <key>` (not `x-api-key`)
  // for this client configuration.
  const authHeader = req.headers["authorization"];
  const apiKey =
    typeof authHeader === "string" ? authHeader.replace(/^Bearer /, "") : authHeader;

  if (apiKey === MOCK_AUTH_FAIL_KEY) {
    res.writeHead(401, { "content-type": "application/json", connection: "close" });
    res.end(
      JSON.stringify({
        type: "error",
        error: { type: "authentication_error", message: "invalid x-api-key" },
      }),
    );
    return;
  }

  const payload = {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content: [
      {
        type: "text",
        text: JSON.stringify({
          items: [
            { date: "2026-10-31", merchant: "Milk", amount: "4.99" },
            { date: "2026-10-31", merchant: "Bread", amount: "3.49" },
          ],
        }),
      },
    ],
    stop_reason: "end_turn",
    usage: { input_tokens: 1, output_tokens: 1 },
  };
  res.writeHead(200, { "content-type": "application/json", connection: "close" });
  res.end(JSON.stringify(payload));
}

/**
 * A minimal stand-in for the Anthropic Messages API, selecting a canned
 * response by the `x-api-key` header the SDK sends — so E2E tests choose a
 * scenario (success / auth failure) via which fake key they save in Settings,
 * with zero production code changes (the SDK already reads ANTHROPIC_BASE_URL).
 */
export function startMockAnthropicServer(port: number): Server {
  const server = createServer((req, res) => {
    if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
      res.writeHead(404).end();
      return;
    }

    // The request body (the base64 image) must be fully drained before
    // responding — otherwise, on a keep-alive connection, the next request
    // reusing this socket can hang waiting on bytes that were never read.
    req.resume();
    req.on("end", () => respond(req, res));
  });
  server.listen(port);
  return server;
}
