import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client";
import { CustomerId, MonthInYear } from "../domain/domain";
import { captureEvents, createPayment } from "../spec-helpers";
import { PaymentApi, PaymentApiError } from "./payment-api";

describe("PaymentApi", () => {
  it("should fetch the list of payments for a given customer id and month", async () => {
    const customerId: CustomerId = "customer-123";
    const monthInYear: MonthInYear = { month: 5, year: 2024 };

    // We use a Null instance of the real `HttpClient` class as collaborator for
    // `PaymentApi`. It has the exact same behavior as the one in production.
    // Only its side effect is turned off.
    const httpClient = HttpClient.createNull({
      "/payments-by-month/customer-123/2024-05": {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify([
          // `createPayment` is a factory function for generating test data. It
          // protects us from having to adjust every single test whenever we
          // make changes to the `Payment` type.
          createPayment({
            price: 10.99,
            category: "electronics",
            description: "Smartphone",
          }),
          createPayment({
            price: 29.99,
            category: "home",
            description: "Cushion",
          }),
          createPayment({
            price: 5.99,
            category: "books",
            description: "Novel",
          }),
        ]),
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://irrelevant.example.com") },
      httpClient,
    );

    const payments = await paymentApi.fetchUserPaymentsByMonth(
      customerId,
      monthInYear,
    );

    expect(payments).toEqual([
      createPayment({
        price: 10.99,
        category: "electronics",
        description: "Smartphone",
      }),
      createPayment({
        price: 29.99,
        category: "home",
        description: "Cushion",
      }),
      createPayment({
        price: 5.99,
        category: "books",
        description: "Novel",
      }),
    ]);
  });

  it("should send requests to the configured base url", async () => {
    const customerId: CustomerId = "customer-123";
    const monthInYear: MonthInYear = { month: 12, year: 2024 };
    const httpClient = HttpClient.createNull({
      "/my-api/payments-by-month/customer-123/2024-12": {
        body: "[]",
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://api.example.com/my-api/") },
      httpClient,
    );
    const events = captureEvents(httpClient.events, "requestSent");

    await paymentApi.fetchUserPaymentsByMonth(customerId, monthInYear);

    expect(events.data()).toEqual([
      expect.objectContaining({
        request: {
          method: "GET",
          url: new URL(
            "https://api.example.com/my-api/payments-by-month/customer-123/2024-12",
          ),
        },
      }),
    ]);
  });

  it("should throw a PaymentApiError if the server responds with unexpected data", async () => {
    // In our Null instances we can implement any behavior we need for testing
    // classes that use them. We could easily extend the `HttpClient` Null
    // instance to throw errors or to time out. And then use these failure
    // behaviors to test that `PaymentApi` handles them gracefully.
    const httpClient = HttpClient.createNull({
      "*": {
        body: JSON.stringify({
          price: "Not a number",
          category: "",
          description: 123,
        }),
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://api.example.com/") },
      httpClient,
    );

    await expect(() =>
      paymentApi.fetchUserPaymentsByMonth("customer-123", {
        year: 2020,
        month: 2,
      }),
    ).rejects.toThrow(PaymentApiError);
  });

  it("should ignore additional unexpected properties in the response payload", async () => {
    const customerId: CustomerId = "customer-123";
    const monthInYear: MonthInYear = {
      month: 5,
      year: 2024,
    };
    const httpClient = HttpClient.createNull({
      "*": {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify([
          {
            ...createPayment({
              price: 10.99,
              category: "electronics",
              description: "Smartphone",
            }),
            someExtraProperty: "does not matter",
          },
        ]),
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://irrelevant.example.com") },
      httpClient,
    );

    const payments = await paymentApi.fetchUserPaymentsByMonth(
      customerId,
      monthInYear,
    );

    expect(payments).toHaveLength(1);
    expect(payments[0]).not.toHaveProperty("someExtraProperty");
  });

  describe("null instance", () => {
    it("should not send actual requests", async () => {
      vi.spyOn(globalThis, "fetch");
      const paymentApi = PaymentApi.createNull();

      await paymentApi
        .fetchUserPaymentsByMonth("irrelevant-id", {
          year: 2010,
          month: 1,
        })
        .catch(() => {
          // discard connection errors
        });

      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return an empty list of payments by default", async () => {
      const paymentApi = PaymentApi.createNull();

      const payments = await paymentApi.fetchUserPaymentsByMonth(
        "irrelevant-id",
        { year: 2010, month: 1 },
      );

      expect(payments).toEqual([]);
    });

    it("should return a configurable list of payments", async () => {
      // The Null configuration of the higher level `PaymentApi` does not leak
      // the lower level `HttpClient` details. The configuration options for
      // `PaymentApi` are designed from the perspective of its consumer.
      const paymentApi = PaymentApi.createNull([
        {
          customerId: "customer-123",
          monthInYear: { month: 9, year: 2024 },
          payments: [
            createPayment({
              price: 10.99,
              category: "groceries",
              description: "Dinner",
            }),
          ],
        },
      ]);

      const payments = await paymentApi.fetchUserPaymentsByMonth(
        "customer-123",
        { year: 2024, month: 9 },
      );

      expect(payments).toEqual([
        createPayment({
          price: 10.99,
          category: "groceries",
          description: "Dinner",
        }),
      ]);
    });
  });
});
