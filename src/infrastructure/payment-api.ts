import z from "zod";
import { CustomerId, MonthInYear, Payment } from "../domain/domain";
import {
  HttpClient,
  NullConfiguration as HttpClientNullConfiguration,
} from "./http-client";
import { IPaymentsApi } from "../application/interfaces";

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

export type NullConfiguration = {
  customerId: CustomerId;
  monthInYear: MonthInYear;
  payments: Payment[];
}[];

export class PaymentApiError extends Error {}

export class PaymentApi implements IPaymentsApi {
  // The `create` factory method creates an instance with the real side effect.
  // In this case a real `HttpClient` instance.
  static create(configuration: PaymentApiConfiguration) {
    return new PaymentApi(configuration, HttpClient.create());
  }

  // The `createNull` facory method creates an instance with a Null instance of
  // the `HttpClient`. We also provide a default configuration for the
  // `PaymentApi`.
  //
  // Notice that the Null configuration for the `PaymentApi` gets converted to
  // the Null configuration for the `HttpClient` so that it behaves in way that
  // in turn results in the desired behavior of the Null `PaymentApi` instance.
  // This way tests that need a `PaymentApi` instance with a specific behavior
  // don't have to know or care about the underlying implementation details. In
  // principle this stack of higher level (app specific) classes using lower
  // level (app independent) side effects can be arbitraryly deep. In practice
  // there are usually no more than three layers.
  static createNull(nullConfiguration?: NullConfiguration) {
    return new PaymentApi(
      { baseUrl: new URL("https://example.com") },
      HttpClient.createNull(convertNullConfiguration(nullConfiguration))
    );
  }

  static paymentsApiPath(customerId: CustomerId, { month, year }: MonthInYear) {
    const paddedMonth = month.toString().padStart(2, "0");
    return `payments-by-month/${customerId}/${year}-${paddedMonth}`;
  }

  constructor(
    private _configuration: PaymentApiConfiguration,
    private _httpClient: HttpClient
  ) {}

  async fetchUserPaymentsByMonth(
    customerId: CustomerId,
    monthInYear: MonthInYear
  ) {
    // We use the injected `_httpClient` instance without knowing if it is the
    // real one or the Nulled version. All the code in this method gets executed
    // inside our tests.
    const response = await this._httpClient.sendRequest({
      method: "GET",
      url: this.paymentsUrl(customerId, monthInYear),
    });

    try {
      // We rigorously validate the data that we receive from the remote server
      // at runtime. No amount of testing can prevent unexpected or erroneous
      // behavior of a third party component outside our system. To account for
      // this we never trust data that enters our system without validation. In
      // the Nullables pattern this is known as Paranoic Telemetry[^1].
      //
      // [^1]: https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#paranoic-telemetry
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

  private paymentsUrl(customerId: CustomerId, monthInYear: MonthInYear) {
    return new URL(
      PaymentApi.paymentsApiPath(customerId, monthInYear),
      this._configuration.baseUrl
    );
  }
}

// The code for converting one Null configuration object into another is
// arguably one of the uglier aspects of the Nullable pattern. We hide it down
// here out of sight. ;-)
const convertNullConfiguration = (
  nullConfiguration: NullConfiguration = []
): HttpClientNullConfiguration => {
  const responses = Object.fromEntries(
    nullConfiguration.map(({ customerId, payments, monthInYear }) => {
      const path = `/${PaymentApi.paymentsApiPath(customerId, monthInYear)}`;
      const response = {
        status: 200,
        body: JSON.stringify(payments),
      };
      return [path, response];
    })
  );

  const defaultResponse = {
    status: 200,
    body: JSON.stringify([]),
  };

  return {
    ...responses,
    "*": defaultResponse,
  };
};
