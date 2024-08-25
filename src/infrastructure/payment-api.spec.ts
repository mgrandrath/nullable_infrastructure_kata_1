import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client";
import { CustomerId, Month, Year } from "../domain";
import { captureEvents, createPayment } from "../spec-helpers";
import { PaymentApi, PaymentApiError } from "./payment-api";

describe("PaymentApi", () => {
  it("should fetch the list of payments for a given customer id and month", async () => {
    const customerId: CustomerId = "customer-123";
    const year: Year = 2024;
    const month: Month = 5;
    const httpClient = HttpClient.createNull({
      "/payments-by-month/customer-123/2024-05": {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify([
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
      httpClient
    );

    const payments = await paymentApi.fetchUserPaymentsByMonth(
      customerId,
      year,
      month
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

  it("should send requests to the correct configured url", async () => {
    const customerId: CustomerId = "customer-123";
    const year: Year = 2024;
    const month: Month = 12;
    const httpClient = HttpClient.createNull({
      "/my-api/payments-by-month/customer-123/2024-12": {
        body: "[]",
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://api.example.com/my-api/") },
      httpClient
    );
    const events = captureEvents(httpClient.events, "requestSent");

    await paymentApi.fetchUserPaymentsByMonth(customerId, year, month);

    expect(events.data()).toEqual([
      expect.objectContaining({
        request: {
          method: "GET",
          url: new URL(
            "https://api.example.com/my-api/payments-by-month/customer-123/2024-12"
          ),
        },
      }),
    ]);
  });

  it("should throw a PaymentApiError if the server responds with unexpected data", async () => {
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
      httpClient
    );

    await expect(() =>
      paymentApi.fetchUserPaymentsByMonth("customer-123", 2020, 2)
    ).rejects.toThrow(PaymentApiError);
  });

  it("should ignore additional properties", async () => {
    const customerId: CustomerId = "customer-123";
    const year: Year = 2024;
    const month: Month = 5;
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
      httpClient
    );

    const payments = await paymentApi.fetchUserPaymentsByMonth(
      customerId,
      year,
      month
    );

    expect(payments).toEqual([
      createPayment({
        price: 10.99,
        category: "electronics",
        description: "Smartphone",
      }),
    ]);
  });

  describe("null instance", () => {
    it("should not send actual requests", async () => {
      vi.spyOn(globalThis, "fetch");
      const paymentApi = PaymentApi.createNull();

      await paymentApi
        .fetchUserPaymentsByMonth("irrelevant-id", 2010, 1)
        .catch(() => {
          // discard connection errors
        });

      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return an empty list of payments by default", async () => {
      const paymentApi = PaymentApi.createNull();

      const payments = await paymentApi.fetchUserPaymentsByMonth(
        "irrelevant-id",
        2010,
        1
      );

      expect(payments).toEqual([]);
    });

    it("should return a configurable list of payments", async () => {
      const paymentApi = PaymentApi.createNull({
        "customer-123/2024-09": [
          createPayment({
            price: 10.99,
            category: "groceries",
            description: "Dinner",
          }),
        ],
      });

      const payments = await paymentApi.fetchUserPaymentsByMonth(
        "customer-123",
        2024,
        9
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
