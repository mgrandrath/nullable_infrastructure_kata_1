import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Calendar } from "./calendar";

describe("Calendar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the current month and year", () => {
    vi.setSystemTime(new Date("2024-06-01"));

    const calendar = Calendar.create();

    expect(calendar.getCurrentMonthAndYear()).toEqual({
      month: 6,
      year: 2024,
    });
  });

  it("should return the previous month and year", () => {
    vi.setSystemTime(new Date("2024-06-01"));

    const calendar = Calendar.create();

    expect(calendar.getPreviousMonthAndYear()).toEqual({
      month: 5,
      year: 2024,
    });
  });

  it("should return the previous month and wrap the year if needed", () => {
    vi.setSystemTime(new Date("2024-01-01"));

    const calendar = Calendar.create();

    expect(calendar.getPreviousMonthAndYear()).toEqual({
      month: 12,
      year: 2023,
    });
  });

  describe("null instance", () => {
    it("should return a configured current month", () => {
      const calendar = Calendar.createNull({ month: 12, year: 2018 });

      expect(calendar.getCurrentMonthAndYear()).toEqual({
        month: 12,
        year: 2018,
      });
    });

    it("should return a configured previous month", () => {
      const calendar = Calendar.createNull({ month: 10, year: 2016 });

      expect(calendar.getPreviousMonthAndYear()).toEqual({
        month: 9,
        year: 2016,
      });
    });
  });
});
