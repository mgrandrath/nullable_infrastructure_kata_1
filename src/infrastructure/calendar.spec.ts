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
    // In order to test the real Calendar implementation we need to fool it and
    // take control of the system's date/time. We try to limit the number of
    // tests that need to do this to the absolute minimum. The reason for this
    // is that the fake timer setup is quite complex and error-prone. Notice for
    // example that we need to remember to call `useRealTimers` after the tests.
    // In contrast, configuring and using the Null implementation (see below) is
    // much simpler and can be tailored to perfectly match our needs.
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
    it("should return a default current month", () => {
      // We always want to be able to create functional Null instances without
      // being forced to pass in a configuration object. This is called
      // Parameterless Instantiation[^1] and comes in handy when we need a
      // calendar object within a test that does not care about the specific
      // date it returns.
      //
      // [^1] https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks#instantiation
      const calendar = Calendar.createNull();

      expect(calendar.getCurrentMonthAndYear()).toEqual({
        month: 1,
        year: 1970,
      });
    });

    it("should return a default previous month", () => {
      const calendar = Calendar.createNull();

      expect(calendar.getPreviousMonthAndYear()).toEqual({
        month: 12,
        year: 1969,
      });
    });

    it("should return a configured current month", () => {
      // The configuration object that we pass to `createNull` perfectly matches
      // the configuration options we actually need. In case we require more
      // complex options in the future we can add them then.
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
