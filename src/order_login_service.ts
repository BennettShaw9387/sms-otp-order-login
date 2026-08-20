import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ZodError, type ZodType } from "zod";
import {
  requestCodeBody,
  requestOrderCode,
  verifyCodeBody,
  verifyOrderAccess,
} from "./order_access.js";

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function validated<T>(request: IncomingMessage, schema: ZodType<T>): Promise<T> {
  return schema.parse(await jsonBody(request));
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/login/code") {
      reply(response, 202, await requestOrderCode(await validated(request, requestCodeBody)));
      return;
    }
    if (request.method === "POST" && request.url === "/login/verify") {
      reply(response, 200, await verifyOrderAccess(await validated(request, verifyCodeBody)));
      return;
    }
    reply(response, 404, { error: "route not found" });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "invalid request body" });
      return;
    }
    console.error(error);
    reply(response, 502, { error: "login request could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Order login service listening on http://localhost:${port}`));
