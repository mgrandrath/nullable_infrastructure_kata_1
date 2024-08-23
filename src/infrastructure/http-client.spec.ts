import { createServer, Server } from "node:http";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import express, { Express } from "express";
import { HttpClient } from "./http-client";
import { captureEvents } from "../spec-helpers";

describe("HttpClient", () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = new TestServer();
    await testServer.start();
  });

  beforeEach(async () => {
    testServer.reset();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  it("should send headers and body to the given URL using the given method", async () => {
    const httpClient = HttpClient.create();

    await httpClient.sendRequest({
      method: "POST",
      url: new URL(`${testServer.host()}/some/path?someQuery=123`),
      headers: {
        "content-type": "application/json",
        "x-my-request-header": "Some header value",
      },
      body: '{"some":"data"}',
    });

    expect(testServer.lastRequestReceived).toEqual({
      method: "POST",
      path: "/some/path",
      query: {
        someQuery: "123",
      },
      headers: expect.objectContaining({
        "content-type": "application/json",
        "x-my-request-header": "Some header value",
      }),
      body: '{"some":"data"}',
    });
  });

  it("should send default headers and body to the given URL", async () => {
    const httpClient = HttpClient.create();

    await httpClient.sendRequest({
      method: "GET",
      url: new URL(`${testServer.host()}/some/path`),
    });

    expect(testServer.lastRequestReceived).toEqual({
      method: "GET",
      path: "/some/path",
      query: {},
      headers: expect.any(Object),
      body: null,
    });
  });

  it("should return the received server response", async () => {
    testServer.setResponse({
      status: 418,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-my-response-header": "Some header value",
      },
      body: "My server response",
    });
    const httpClient = HttpClient.create();

    const response = await httpClient.sendRequest({
      method: "GET",
      url: new URL(`${testServer.host()}/irrelevant`),
    });

    expect(response).toEqual({
      status: 418,
      headers: expect.objectContaining({
        "content-type": "text/plain; charset=utf-8",
        "x-my-response-header": "Some header value",
      }),
      body: "My server response",
    });
  });

  describe("null instance", () => {
    it("should not send a real request", async () => {
      const httpClient = HttpClient.createNull();

      await httpClient.sendRequest({
        method: "GET",
        url: new URL(`${testServer.host()}/some/path`),
      });

      expect(testServer.lastRequestReceived).toEqual(null);
    });

    it("should return a default response", async () => {
      const httpClient = HttpClient.createNull();

      const response = await httpClient.sendRequest({
        method: "GET",
        url: new URL("https://irrelevant.example.com/"),
      });

      expect(response).toEqual({
        status: 404,
        headers: expect.any(Object),
        body: "Default null response",
      });
    });

    it("should return configured responses", async () => {
      const httpClient = HttpClient.createNull({
        "/some/path": {
          status: 200,
          headers: {
            "x-my-response-header": "Some header value",
          },
          body: "My configured response",
        },

        "/other/path": {
          status: 451,
        },
      });

      const firstResponse = await httpClient.sendRequest({
        method: "GET",
        url: new URL("https://example.com/some/path"),
      });

      expect(firstResponse).toEqual({
        status: 200,
        headers: expect.objectContaining({
          "x-my-response-header": "Some header value",
        }),
        body: "My configured response",
      });

      const secondResponse = await httpClient.sendRequest({
        method: "GET",
        url: new URL("https://example.com/other/path"),
      });

      expect(secondResponse).toEqual({
        status: 451,
        headers: {},
        body: "",
      });
    });

    it("should return a configured default response", async () => {
      const httpClient = HttpClient.createNull({
        "*": {
          status: 202,
          body: "My custom default body",
        },
      });

      const response = await httpClient.sendRequest({
        method: "POST",
        url: new URL("https://example.com/irrelevant/path"),
      });

      expect(response).toMatchObject({
        status: 202,
        body: "My custom default body",
      });
    });

    it("should return a default response for urls that are missing in the configuration", async () => {
      const httpClient = HttpClient.createNull({
        "/irrelevant/path": {
          status: 200,
          body: "Irrelevant response",
        },
      });

      const response = await httpClient.sendRequest({
        method: "GET",
        url: new URL("https://example.com/unconfigured/path"),
      });

      expect(response).toEqual({
        status: 404,
        headers: expect.any(Object),
        body: "Default null response",
      });
    });

    it("should emit an event whenever a request has been sent", async () => {
      const httpClient = HttpClient.createNull({
        "/some/path": {
          status: 201,
          headers: {
            "x-my-response-header": "My header value",
          },
          body: "Configured response for /some/path",
        },
      });
      const events = captureEvents(httpClient.events, "requestSent");

      await httpClient.sendRequest({
        method: "PUT",
        url: new URL("https://example.com/some/path"),
        headers: {
          "x-my-request-header": "My header value",
        },
        body: "My request body",
      });
      await httpClient.sendRequest({
        method: "DELETE",
        url: new URL("https://example.com/some/other/path"),
      });

      expect(events.data()).toEqual([
        {
          request: {
            method: "PUT",
            url: new URL("https://example.com/some/path"),
            headers: {
              "x-my-request-header": "My header value",
            },
            body: "My request body",
          },
          response: {
            status: 201,
            headers: expect.objectContaining({
              "x-my-response-header": "My header value",
            }),
            body: "Configured response for /some/path",
          },
        },
        {
          request: {
            method: "DELETE",
            url: new URL("https://example.com/some/other/path"),
          },
          response: {
            status: 404,
            headers: expect.any(Object),
            body: "Default null response",
          },
        },
      ]);
    });

    it("should not emit an event when sending the request failed", async () => {
      const expectedError = new Error("Fetch failed");
      const failingFetch = vi.fn().mockRejectedValue(expectedError);
      const httpClient = new HttpClient(failingFetch);
      const events = captureEvents(httpClient.events, "requestSent");

      await httpClient
        .sendRequest({
          method: "GET",
          url: new URL("https://irrelevant.example.com/"),
        })
        .catch((error) => {
          if (error !== expectedError) {
            throw error;
          }
        });

      expect(events.data()).toEqual([]);
    });
  });
});

type ServerResponse = Readonly<{
  status: number;
  headers: Record<string, string>;
  body: string;
}>;

class TestServer {
  lastRequestReceived!: Readonly<{
    method: string;
    path: string;
    headers: Record<string, string[] | string | undefined>;
    query: qs.ParsedQs;
    body: string | null;
  }> | null;
  private _serverResponse!: ServerResponse;
  private _app: Express;
  private _httpServer: Server | null;

  constructor() {
    this._httpServer = null;

    this._app = express();
    this._app.use(express.text({ type: "*/*" }));
    this._app.all("/*", (request, response) => {
      this.lastRequestReceived = {
        method: request.method,
        path: request.path,
        headers: request.headers,
        query: request.query,
        body: typeof request.body === "string" ? request.body : null,
      };
      response
        .status(this._serverResponse.status)
        .header(this._serverResponse.headers)
        .send(this._serverResponse.body);
    });

    this.reset();
  }

  reset() {
    this.lastRequestReceived = null;
    this._serverResponse = {
      status: 200,
      headers: {},
      body: "Default test server response",
    };
  }

  setResponse(response: ServerResponse) {
    this._serverResponse = response;
  }

  async start() {
    this._httpServer = createServer(this._app);

    return new Promise<void>((resolve, reject) => {
      this._httpServer?.on("error", reject);
      this._httpServer?.listen(0, resolve);
    });
  }

  async stop() {
    if (!this._httpServer) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this._httpServer!.close((error) => {
        if (error) {
          reject(error);
        } else {
          this._httpServer = null;
          resolve();
        }
      });
    });
  }

  host() {
    return `http://localhost:${this.port()}`;
  }

  port() {
    const address = this._httpServer?.address();
    if (!address) {
      throw new Error(
        "Server is not running. Please call `start()` before calling `port()`."
      );
    }
    if (typeof address === "string") {
      throw new Error(
        "Server is listening on a pipe or socket. There is no port available."
      );
    }

    return address.port;
  }
}
