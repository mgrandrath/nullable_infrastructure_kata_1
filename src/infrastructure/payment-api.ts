import z from "zod";
import { CustomerId, Month, Payment, Year } from "../domain";
import {
  HttpClient,
  NullConfiguration as HttpClientNullConfiguration,
} from "./http-client";
import { IPaymentsApi } from "../trigger-unusual-spending-email";

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

export class PaymentApi implements IPaymentsApi {
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

  async fetchUserPaymentsByMonth(
    customerId: CustomerId,
    year: Year,
    month: Month
  ) {
    const response = await this._httpClient.sendRequest({
      method: "GET",
      url: new URL(
        `payments-by-month/${customerId}/${year}-${month
          .toString()
          .padStart(2, "0")}`,
        this._configuration.baseUrl
      ),
    });

    try {
      return ResponseSchema.parse(JSON.parse(response.body));
    } catch (error) {
      throw new PaymentApiError(
        `Failed to fetch payments for customer "${customerId}": Invalid response from server`,
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
    Object.entries(nullConfiguration).map(([idAndMonth, payments]) => {
      const match = /^(.*)\/(\d{4})-(\d{1,2})$/.exec(idAndMonth);
      if (!match) {
        throw new Error(
          `Invalid format. Expected "<customerId>/<year>-<month>" (ex. "customer-123/2020-05") but got "${idAndMonth}"`
        );
      }
      const [_, customerId, year, month] = match;
      return [
        `/payments-by-month/${customerId}/${year}-${month
          ?.toString()
          .padStart(2, "0")}`,
        {
          status: 200,
          body: JSON.stringify(payments),
        },
      ];
    })
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
