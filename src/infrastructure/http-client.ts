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

export type HttpClientEventMap = {
  requestSent: [{ request: HttpClientRequest; response: HttpClientResponse }];
};

type Fetch = typeof globalThis.fetch;

export class HttpClient {
  events = new EventEmitter<HttpClientEventMap>();

  static create() {
    return new HttpClient(globalThis.fetch);
  }

  static createNull(nullConfiguration?: NullConfiguration) {
    return new HttpClient(createFetchStub(nullConfiguration));
  }

  constructor(private _fetch: Fetch) {}

  async sendRequest(request: HttpClientRequest): Promise<HttpClientResponse> {
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
    this.events.emit("requestSent", { request, response });

    return response;
  }
}

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
