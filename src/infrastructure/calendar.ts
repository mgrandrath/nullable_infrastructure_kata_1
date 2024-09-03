import { Month, Year } from "../domain";
import { ICalendar } from "../trigger-unusual-spending-email";

export type NullConfiguration = {
  month: Month;
  year: Year;
};

export type DateFactory = () => Pick<Date, "getMonth" | "getFullYear">;

export class Calendar implements ICalendar {
  static create() {
    // The `create` factory method creates an instance with the real side
    // effect.
    return new Calendar(() => new Date());
  }

  static createNull(nullConfiguration: NullConfiguration) {
    // The `createNull` facory method creates an instance with a configured stub
    // instead of the actual side effect. Notice that we only stub out external
    // code (in this case the `Date` object provided by the JavaScript runtime),
    // never our own classes.
    return new Calendar(createDateStub(nullConfiguration));
  }

  constructor(private _createDate: DateFactory) {}

  getCurrentMonthAndYear() {
    // We use the injected `_createDate` factory without knowing if it is the
    // real one or the stub. All the code in this method gets executed inside
    // our tests.
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

// We implement only the bare minimum that we need to replace the `Date` class
// in our use cases. Here, this means just implementing the `getMonth` and
// `getFullYear` methods. The tight coupling between the `Calendar` class above
// and this stub is the reason we implement both in the same file.
const createDateStub = (current: NullConfiguration) => () => ({
  getMonth: () => current.month - 1,
  getFullYear: () => current.year,
});
