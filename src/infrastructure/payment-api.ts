import z from "zod";
import { CustomerId, Payment } from "../domain";
import {
  HttpClient,
  NullConfiguration as HttpClientNullConfiguration,
} from "./http-client";

const ResponseSchema = z.array(
  z.object({
    price: z.number().positive(),
    category: z.string().min(1),
    description: z.string(),
  })
);

export type PaymentApiConfiguration = {
  baseUrl: URL;
};

export type NullConfiguration = Record<CustomerId, Payment[]>;

export class PaymentApiError extends Error {}

export class PaymentApi {
  static createNull(nullConfiguration?: NullConfiguration) {
    return new PaymentApi(
      { baseUrl: new URL("https://example.com") },
      HttpClient.createNull(convertNullConfiguration(nullConfiguration))
    );
  }

  static create(configuration: PaymentApiConfiguration) {
    return new PaymentApi(configuration, HttpClient.create());
  }

  constructor(
    private _configuration: PaymentApiConfiguration,
    private _httpClient: HttpClient
  ) {}

  async fetchPaymentsForCustomer(customerId: CustomerId) {
    const result = await this._httpClient.sendRequest({
      method: "GET",
      url: new URL(`payments/${customerId}`, this._configuration.baseUrl),
    });

    try {
      const data = ResponseSchema.parse(JSON.parse(result.body));
      return { data };
    } catch (error) {
      throw new PaymentApiError(
        `Failed to fetch payments for customer "${customerId}": Unexpected response from server`,
        {
          cause: error,
        }
      );
    }
  }
}

const convertNullConfiguration = (
  nullConfiguration: NullConfiguration = {}
): HttpClientNullConfiguration => {
  const responses = Object.fromEntries(
    Object.entries(nullConfiguration).map(([customerId, payments]) => [
      `/payments/${customerId}`,
      {
        status: 200,
        body: JSON.stringify(payments),
      },
    ])
  );
  const defaultResponse = {
    status: 200,
    body: "[]",
  };
  return {
    ...responses,
    "*": defaultResponse,
  };
};
