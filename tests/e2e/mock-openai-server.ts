import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

export const MOCK_SUCCESS_KEY = "mock-key-success";
export const MOCK_AUTH_FAIL_KEY = "mock-key-auth-fail";

function apiKeyOf(req: IncomingMessage): string | undefined {
  const authHeader = req.headers["authorization"];
  return typeof authHeader === "string"
    ? authHeader.replace(/^Bearer /, "")
    : undefined;
}

function authError(res: ServerResponse): void {
  res.writeHead(401, { "content-type": "application/json", connection: "close" });
  res.end(
    JSON.stringify({
      error: {
        message: "Incorrect API key provided.",
        type: "invalid_request_error",
        param: null,
        code: "invalid_api_key",
      },
    }),
  );
}

function respondToModelRetrieve(req: IncomingMessage, res: ServerResponse, model: string): void {
  if (apiKeyOf(req) === MOCK_AUTH_FAIL_KEY) {
    authError(res);
    return;
  }
  res.writeHead(200, { "content-type": "application/json", connection: "close" });
  res.end(
    JSON.stringify({ id: model, object: "model", created: 0, owned_by: "openai" }),
  );
}

function respondToChatCompletion(req: IncomingMessage, res: ServerResponse): void {
  if (apiKeyOf(req) === MOCK_AUTH_FAIL_KEY) {
    authError(res);
    return;
  }

  const payload = {
    id: "chatcmpl_mock",
    object: "chat.completion",
    created: 0,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            items: [
              { date: "2026-10-31", merchant: "Milk", amount: "4.99" },
              { date: "2026-10-31", merchant: "Bread", amount: "3.49" },
            ],
          }),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
  res.writeHead(200, { "content-type": "application/json", connection: "close" });
  res.end(JSON.stringify(payload));
}

/**
 * A minimal stand-in for the OpenAI API, selecting a canned response by the
 * `Authorization: Bearer <key>` header the SDK sends — so E2E tests choose a
 * scenario (success / auth failure) via which fake key they save in Settings,
 * with zero production code changes (the SDK already reads OPENAI_BASE_URL).
 */
export function startMockOpenAIServer(port: number): Server {
  const server = createServer((req, res) => {
    const modelMatch = req.url?.match(/^\/v1\/models\/([^/]+)$/);
    if (req.method === "GET" && modelMatch) {
      respondToModelRetrieve(req, res, decodeURIComponent(modelMatch[1] as string));
      return;
    }
    if (req.method === "POST" && req.url?.startsWith("/v1/chat/completions")) {
      // The request body (the base64 image) must be fully drained before
      // responding — otherwise, on a keep-alive connection, the next request
      // reusing this socket can hang waiting on bytes that were never read.
      req.resume();
      req.on("end", () => respondToChatCompletion(req, res));
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port);
  return server;
}
