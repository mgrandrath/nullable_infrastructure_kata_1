import { describe, expect, it, vi } from "vitest";
import { HttpClient } from "./http-client";
import { CustomerId } from "../domain";
import { captureEvents, createPayment } from "../spec-helpers";
import { PaymentApi, PaymentApiError } from "./payment-api";

describe("PaymentApi", () => {
  it("should fetch the list of payments for a given customer id", async () => {
    const customerId: CustomerId = "customer-123";
    const httpClient = HttpClient.createNull({
      "/payments/customer-123": {
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

    const payments = await paymentApi.fetchPaymentsForCustomer(customerId);

    expect(payments).toEqual({
      data: [
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
      ],
    });
  });

  it("should send requests to the configured url", async () => {
    const customerId: CustomerId = "customer-123";
    const httpClient = HttpClient.createNull({
      "/my-api/payments/customer-123": {
        body: "[]",
      },
    });
    const paymentApi = new PaymentApi(
      { baseUrl: new URL("https://api.example.com/my-api/") },
      httpClient
    );
    const events = captureEvents(httpClient.events, "requestSent");

    await paymentApi.fetchPaymentsForCustomer(customerId);

    expect(events.data()).toEqual([
      expect.objectContaining({
        request: {
          method: "GET",
          url: new URL("https://api.example.com/my-api/payments/customer-123"),
        },
      }),
    ]);
  });

  it("should throw a PaymentApiError if the server responds unexpectedly", async () => {
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
      paymentApi.fetchPaymentsForCustomer("customer-123")
    ).rejects.toThrow(PaymentApiError);
  });

  describe("null instance", () => {
    it("should not send actual requests", async () => {
      vi.spyOn(globalThis, "fetch");
      const paymentApi = PaymentApi.createNull();

      await paymentApi.fetchPaymentsForCustomer("irrelevant-id").catch(() => {
        // discard errors
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it("should return an empty list of payments by default", async () => {
      const paymentApi = PaymentApi.createNull();

      const payments = await paymentApi.fetchPaymentsForCustomer(
        "irrelevant-id"
      );

      expect(payments.data).toEqual([]);
    });

    it("should return a configurable list of payments", async () => {
      const paymentApi = PaymentApi.createNull({
        "customer-123": [
          createPayment({
            price: 10.99,
            category: "groceries",
            description: "Dinner",
          }),
        ],
      });

      const payments = await paymentApi.fetchPaymentsForCustomer(
        "customer-123"
      );

      expect(payments.data).toEqual([
        createPayment({
          price: 10.99,
          category: "groceries",
          description: "Dinner",
        }),
      ]);
    });
  });
});
