import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export const eventId = "0198a0b0-0000-7000-8000-000000000001";

export interface ReceivedRequest {
  readonly authorization: string | undefined;
  readonly body: string;
  readonly url: string | undefined;
}

export interface IngestServer {
  readonly endpoint: string;
  readonly requests: Array<ReceivedRequest>;
  readonly close: () => Promise<void>;
}

export const listen = (
  respond: (request: IncomingMessage, response: ServerResponse) => void,
): Promise<IngestServer> =>
  new Promise((resolve, reject) => {
    const requests: Array<ReceivedRequest> = [];
    const server = createServer((request, response) => {
      const chunks: Array<Buffer> = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        requests.push({
          authorization: request.headers.authorization,
          body: Buffer.concat(chunks).toString("utf8"),
          url: request.url,
        });
        respond(request, response);
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("test server did not expose a TCP address"));
        return;
      }
      resolve({
        endpoint: `http://127.0.0.1:${address.port}`,
        requests,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.closeAllConnections();
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          }),
      });
    });
  });

export const accepted = (_request: IncomingMessage, response: ServerResponse): void => {
  response.writeHead(202, { "content-type": "application/json" });
  response.end(JSON.stringify({ eventId }));
};

export const silent = (_request: IncomingMessage, _response: ServerResponse): void => undefined;
