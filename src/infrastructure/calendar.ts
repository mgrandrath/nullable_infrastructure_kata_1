import { ICalendar } from "../application";
import { Month, Year } from "../domain";

export type NullConfiguration = {
  month: Month;
  year: Year;
};

// We create a subset of the built-in `Date` interface that we actually use in
// our implementation. This subset can grow over time as needed.
export type DateFactory = () => Pick<Date, "getMonth" | "getFullYear">;

export class Calendar implements ICalendar {
  // The `create` factory method creates an instance with the real side effect.
  // In this case creating `Date` instances that access the global system state.
  static create() {
    return new Calendar(() => new Date());
  }

  // The `createNull` facory method creates an instance with a configured stub
  // instead of the actual side effect. Notice that we only stub out external
  // code (in this case the `Date` object provided by the JavaScript runtime),
  // never our own classes.
  static createNull(nullConfiguration?: NullConfiguration) {
    return new Calendar(createDateStub(nullConfiguration));
  }

  constructor(private _createDate: DateFactory) {}

  getCurrentMonthAndYear() {
    // We use the injected `_createDate` factory function without knowing if it
    // is the real one or the stub. All the code in this method gets executed
    // inside our tests.
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

// We only implement the bare minimum that we need in order to replace the
// `Date` class in our use cases. Here, this means we only implement the
// `getMonth` and `getFullYear` methods. The tight coupling between the
// `Calendar` class above and this stub is the reason we implement both in the
// same file.
const createDateStub =
  (current: NullConfiguration = { month: 1, year: 1970 }) =>
  () => ({
    getMonth: () => current.month - 1,
    getFullYear: () => current.year,
  });
