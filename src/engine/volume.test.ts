import { expect, it } from "vitest";
import type { UserProfile } from "../types";
import { maintenanceVolume, volumeRange } from "./volume";

const user = (u: Partial<UserProfile> = {}): UserProfile => ({ level: "fortgeschritten", ...u }) as UserProfile;

it("Wachstumsbereich nach Erfahrung", () => {
  expect(volumeRange(user({ level: "einsteiger" }))).toEqual([6, 10]);
  expect(volumeRange(user({ level: "fortgeschritten" }))).toEqual([10, 16]);
  expect(volumeRange(user({ level: "erfahren" }))).toEqual([12, 20]);
  expect(volumeRange(user({ level: null }))).toEqual([10, 16]);
});

it("Eigener Richtwert schlägt die Erfahrung", () => {
  expect(volumeRange(user({ volumeRange: [8, 14] }))).toEqual([8, 14]);
});

it("Erhaltung: etwa die Hälfte des unteren Richtwerts", () => {
  expect(maintenanceVolume(user({ level: "einsteiger" }))).toBe(3);
  expect(maintenanceVolume(user({ level: "fortgeschritten" }))).toBe(5);
  expect(maintenanceVolume(user({ level: "erfahren" }))).toBe(6);
  expect(maintenanceVolume(user({ volumeRange: [9, 15] }))).toBe(4.5);
});
