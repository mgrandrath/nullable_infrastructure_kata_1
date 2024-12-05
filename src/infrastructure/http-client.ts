import EventEmitter from "node:events";

export type HttpClientRequest = {
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD"
    | "CONNECT"
    | "TRACE";
  url: URL;
  headers?: Record<string, string>;
  body?: string;
};

export type HttpClientResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export type NullConfiguration = Record<string, Partial<HttpClientResponse>>;

// The event map defines the events that the `HttpClient` emits. In this case it
// emits `"requestSent"` events with `request` and `response` properties. The
// reason the event schema is wrapped in an array is that the native Node.js
// event emitters allow emitting an arbitrary number of arguments for any event
// type.
export type HttpClientEventMap = {
  requestSent: [{ request: HttpClientRequest; response: HttpClientResponse }];
};

type Fetch = typeof globalThis.fetch;

export class HttpClient {
  // Create an `EventEmitter` instance that is used for Output Tracking[^1] in
  // tests. This implementation deviates from James Shore's original approach of
  // creating `OutputTracker` objects. In my opinion using an `EventEmitter` is
  // more flexible and enables other uses such as logging.
  //
  // [^1] https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#output-tracking
  events = new EventEmitter<HttpClientEventMap>();

  // The `create` factory method creates an instance with the real side effect.
  // In this case this is the global `fetch` function for sending HTTP requests.
  static create() {
    return new HttpClient(globalThis.fetch);
  }

  // The `createNull` facory method creates an instance with a configured stub
  // instead of the actual side effect. Notice that we only stub out external
  // code (in this case the `fetch` function provided by the JavaScript
  // runtime), never our own classes.
  static createNull(nullConfiguration?: NullConfiguration) {
    return new HttpClient(createFetchStub(nullConfiguration));
  }

  constructor(private _fetch: Fetch) {}

  async sendRequest(request: HttpClientRequest): Promise<HttpClientResponse> {
    // We use the injected `_fetch` function without knowing if it is the real
    // one or the stub. All the code in this method gets executed inside our
    // tests.
    const rawResponse = await this._fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    const response = {
      status: rawResponse.status,
      headers: Object.fromEntries(rawResponse.headers.entries()),
      body: await rawResponse.text(),
    };

    // We emit an event that the HTTP request has been sent. We deliberately
    // call `emit` *after* the side effect so that it is not emitted when
    // sending the request failed with an error.
    this.events.emit("requestSent", { request, response });

    return response;
  }
}

// This embedded stub is more complicated than most. The reason for this is that
// we allow for a quite flexible configuration object. Of course this stub
// behavior is also covered by tests.
const createFetchStub = (nullConfiguration: NullConfiguration = {}): Fetch => {
  return async (input) => {
    const url = fetchInputToUrl(input);
    const defaultResponse = nullConfiguration["*"] ?? {
      status: 404,
      body: "Default null response",
    };
    const response = nullConfiguration[url.pathname] ?? defaultResponse;

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  };
};

const fetchInputToUrl = (input: string | URL | Request): URL =>
  input instanceof Request ? new URL(input.url) : new URL(input);
