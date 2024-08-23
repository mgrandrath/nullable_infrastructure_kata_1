import { Month, Year } from "../domain";
import { ICalendar } from "../trigger-unusual-spending-email";

export class Calendar implements ICalendar {
  static create() {
    return new Calendar(() => new Date());
  }

  static createNull(options: { month: Month; year: Year }) {
    return new Calendar(createDateStub(options));
  }

  constructor(
    private _createDate: () => Pick<Date, "getMonth" | "getFullYear">
  ) {}

  getCurrentMonthAndYear() {
    const date = this._createDate();
    return { month: date.getMonth() + 1, year: date.getFullYear() };
  }

  getPreviousMonthAndYear() {
    const date = this._createDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return month > 1
      ? { month: month - 1, year }
      : { month: 12, year: year - 1 };
  }
}

const createDateStub = (current: { month: Month; year: Year }) => () => ({
  getMonth: () => current.month - 1,
  getFullYear: () => current.year,
});
