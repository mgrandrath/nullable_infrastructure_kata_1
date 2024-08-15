import { describe, expect, it } from "vitest";
import { greet } from "./deleteme";

describe("greet", () => {
  it("should greet the world", () => {
    expect(greet("World")).toEqual("Hello, World!");
  });
});
