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
import { captureEventsNew } from "../spec-helpers";

describe("HttpClient", () => {
  // We use a real HTTP server in our tests in order to verify the actual core
  // side effect of the `HttpClient` class. This test is part of our suite of
  // narrow tests that we run continuously. There is no need for a separate
  // integration test.
  let testHttpServer: TestHttpServer;

  beforeAll(async () => {
    testHttpServer = new TestHttpServer();
    await testHttpServer.start();
  });

  beforeEach(async () => {
    // Starting and stopping the server is a bit expensive. To speed up our
    // tests we start the server only once and reset its state after each test.
    testHttpServer.reset();
  });

  afterAll(async () => {
    if (testHttpServer) {
      await testHttpServer.stop();
    }
  });

  it("should send headers and body to the given URL using the given method", async () => {
    // Let's create a real `HttpClient` and actually send an HTTP request to our
    // test server.
    const httpClient = HttpClient.create();

    await httpClient.sendRequest({
      method: "POST",
      url: testHttpServer.url("/some/path?someQuery=123"),
      headers: {
        "content-type": "application/json",
        "x-my-request-header": "Some header value",
      },
      body: '{"some":"data"}',
    });

    expect(testHttpServer.lastRequestReceived).toEqual({
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
      url: testHttpServer.url("/some/path"),
    });

    expect(testHttpServer.lastRequestReceived).toEqual({
      method: "GET",
      path: "/some/path",
      query: {},
      headers: expect.any(Object),
      body: null,
    });
  });

  it("should return the received server response", async () => {
    testHttpServer.setResponse({
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
      url: testHttpServer.url("/irrelevant"),
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
      // Test that we can turn off the side effect.
      const httpClient = HttpClient.createNull();

      await httpClient.sendRequest({
        method: "GET",
        url: testHttpServer.url("/some/path"),
      });

      expect(testHttpServer.lastRequestReceived).toEqual(null);
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
      // This Null instance has a rather elaborate configuration object. Be
      // careful not to overdo it!
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
      const events = captureEventsNew(httpClient.eventsNew);

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
          type: "requestSent",
          payload: {
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
        },
        {
          type: "requestSent",
          payload: {
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
        },
      ]);
    });

    it("should not emit an event when sending the request failed", async () => {
      const expectedError = new Error("Fetch failed");
      const failingFetch = vi.fn().mockRejectedValue(expectedError);
      const httpClient = new HttpClient(failingFetch);
      const events = captureEventsNew(httpClient.eventsNew);

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

class TestHttpServer {
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

    // This middleware let's us access the request body payload under the `body`
    // property as a string. Without it we'd need to consume and convert the
    // stream data ourselves.
    this._app.use(express.text({ type: "*/*" }));

    // Set up a listener for all incoming paths that records the last received
    // request and responds with a configured status, headers, and body.
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
    // Seting the listen port to `0` causes the server to choose a random
    // available port. This means that our tests don't have to rely on a
    // specific port to be available. The `port()` method below tells us the
    // actual port the test server listens on.
    const port = 0;

    this._httpServer = createServer(this._app);

    return new Promise<void>((resolve, reject) => {
      this._httpServer?.on("error", reject);
      this._httpServer?.listen(port, resolve);
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

  url(path: string) {
    return new URL(path, `http://localhost:${this.port()}`);
  }

  port() {
    const address = this._httpServer?.address();
    if (!address) {
      throw new Error(
        "Server is not running. Please call `start()` before calling `port()`.",
      );
    }
    if (typeof address === "string") {
      throw new Error(
        "Server is listening on a pipe or socket. There is no port available.",
      );
    }

    return address.port;
  }
}
