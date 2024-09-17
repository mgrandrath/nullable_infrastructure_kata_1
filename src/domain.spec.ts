import { describe, expect, it } from "vitest";
import {
  detectUnusualSpending,
  groupPaymentsByCategory,
  Payment,
  UnusualSpending,
  unusualSpendingToEmailMessage,
} from "./domain";
import { createPayment } from "./spec-helpers";

const irrelevantYear = 2020;
const irrelevantMonth = 3;

describe("unusualSpendingToEmailMessage", () => {
  it("should throw a TypeError when called with an empty object", () => {
    const unusualSpending: UnusualSpending = {};

    expect(() =>
      unusualSpendingToEmailMessage({
        year: irrelevantYear,
        month: irrelevantMonth,
        unusualSpending,
      })
    ).toThrow(
      new TypeError("Cannot create an email message from an empty object")
    );
  });

  it("should create an email message from a single unusual spending", () => {
    const unusualSpending: UnusualSpending = {
      groceries: {
        spending: 80,
        before: 20,
      },
    };

    const email = unusualSpendingToEmailMessage({
      year: 2024,
      month: 5,
      unusualSpending,
    });

    expect(email).toEqual({
      subject: "Unusual spending of $80 detected!",
      body: [
        "Hello card user!",
        "",
        "We have detected unusually high spending on your card in these categories in 2024-05:",
        "",
        "* You spent $80 on groceries",
        "",
        "Love,",
        "",
        "The Credit Card Company",
      ].join("\n"),
    });
  });

  it("should create an email message from a list of unusual spendings", () => {
    const unusualSpending: UnusualSpending = {
      groceries: {
        spending: 80,
        before: 20,
      },
      vacation: {
        spending: 120,
        before: 50,
      },
    };

    const email = unusualSpendingToEmailMessage({
      year: 2024,
      month: 5,
      unusualSpending,
    });

    expect(email).toEqual({
      subject: "Unusual spending of $200 detected!",
      body: [
        "Hello card user!",
        "",
        "We have detected unusually high spending on your card in these categories in 2024-05:",
        "",
        "* You spent $80 on groceries",
        "* You spent $120 on vacation",
        "",
        "Love,",
        "",
        "The Credit Card Company",
      ].join("\n"),
    });
  });
});

describe("detectUnusualSpending", () => {
  it("should detect no unusual spending when no payment has been made", () => {
    const paymentsLastMonth: Payment[] = [];
    const paymentsThisMonth: Payment[] = [];

    const unusualSpending = detectUnusualSpending(
      paymentsLastMonth,
      paymentsThisMonth
    );

    expect(unusualSpending).toEqual(null);
  });

  it("should detect no unusual spending when no payment has been made this month", () => {
    const paymentsLastMonth: Payment[] = [createPayment()];
    const paymentsThisMonth: Payment[] = [];

    const unusualSpending = detectUnusualSpending(
      paymentsLastMonth,
      paymentsThisMonth
    );

    expect(unusualSpending).toEqual(null);
  });

  it("should detect no unusual spending when payment increases less than 50%", () => {
    const paymentsLastMonth: Payment[] = [
      createPayment({ price: 100, category: "groceries" }),
    ];
    const paymentsThisMonth: Payment[] = [
      createPayment({ price: 149, category: "groceries" }),
    ];

    const unusualSpending = detectUnusualSpending(
      paymentsLastMonth,
      paymentsThisMonth
    );

    expect(unusualSpending).toEqual(null);
  });

  it("should detect an unusual spending when payment increases at least 50%", () => {
    const paymentsLastMonth: Payment[] = [
      createPayment({ price: 70, category: "groceries" }),
      createPayment({ price: 30, category: "groceries" }),
    ];
    const paymentsThisMonth: Payment[] = [
      createPayment({ price: 10, category: "groceries" }),
      createPayment({ price: 100, category: "groceries" }),
      createPayment({ price: 40, category: "groceries" }),
    ];

    const unusualSpending = detectUnusualSpending(
      paymentsLastMonth,
      paymentsThisMonth
    );

    expect(unusualSpending).toEqual({
      groceries: {
        spending: 150,
        before: 100,
      },
    });
  });

  it("should detect an unusual spending when spending was 0 last month", () => {
    const paymentsLastMonth: Payment[] = [];
    const paymentsThisMonth: Payment[] = [
      createPayment({ price: 1, category: "groceries" }),
    ];

    const unusualSpending = detectUnusualSpending(
      paymentsLastMonth,
      paymentsThisMonth
    );

    expect(unusualSpending).toEqual({
      groceries: {
        spending: 1,
        before: 0,
      },
    });
  });
});

describe("groupPaymentsByCategory", () => {
  it("should return an empty object for an empty list of payments", () => {
    const payments: Payment[] = [];

    const groupedPayments = groupPaymentsByCategory(payments);

    expect(groupedPayments).toEqual({});
  });

  it("should group a single payment per category", () => {
    const payments: Payment[] = [
      createPayment({ price: 11, category: "groceries" }),
      createPayment({ price: 17, category: "vacation" }),
    ];

    const groupedPayments = groupPaymentsByCategory(payments);

    expect(groupedPayments).toEqual({
      groceries: 11,
      vacation: 17,
    });
  });

  it("should add all payments within each category", () => {
    const payments: Payment[] = [
      createPayment({ price: 11, category: "groceries" }),
      createPayment({ price: 17, category: "vacation" }),
      createPayment({ price: 23, category: "vacation" }),
      createPayment({ price: 7, category: "groceries" }),
    ];

    const groupedPayments = groupPaymentsByCategory(payments);

    expect(groupedPayments).toEqual({
      groceries: 18,
      vacation: 40,
    });
  });
});
