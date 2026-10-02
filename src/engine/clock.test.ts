import { expect, it } from "vitest";
import { parseClock } from "./clock";
it("Zeiteingabe mit Doppelpunkt, Punkt, Komma, nur Ziffern", () => {
  expect(parseClock("12:34")).toBe(754);
  expect(parseClock("12.34")).toBe(754);
  expect(parseClock("12,34")).toBe(754);
  expect(parseClock("1234")).toBe(754);
  expect(parseClock("905")).toBe(545);
  expect(parseClock("12")).toBe(720);
  expect(parseClock("3:25.4")).toBeCloseTo(205.4);
  expect(parseClock("3.25.4")).toBeCloseTo(205.4);
  expect(parseClock("12.75")).toBeNull();
  expect(parseClock("abc")).toBeNull();
  expect(parseClock("12.5")).toBeNull();
  expect(parseClock("12:5")).toBe(725);
});
