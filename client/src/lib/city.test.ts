import { describe, expect, it } from "vitest";
import { CITY_ROUTE, buildCityRoute, canonicalCity } from "./city";

describe("canonicalCity", () => {
  it("folds metro-area suburbs into their base city", () => {
    expect(canonicalCity("Santa Monica")).toBe("Los Angeles");
    expect(canonicalCity("torrance")).toBe("Los Angeles");
    expect(canonicalCity("El Segundo")).toBe("Los Angeles");
    expect(canonicalCity("Katoomba")).toBe("Sydney");
  });

  it("folds Picton into Blenheim", () => {
    expect(canonicalCity("Picton")).toBe("Blenheim");
  });

  it("folds the Great Ocean Road and Queenstown day trips", () => {
    expect(canonicalCity("Apollo Bay")).toBe("Melbourne");
    expect(canonicalCity("Arrowtown")).toBe("Queenstown");
    expect(canonicalCity("Fiordland")).toBe("Queenstown");
  });

  it("leaves an unmapped city unchanged", () => {
    expect(canonicalCity("  Chengdu ")).toBe("Chengdu");
    expect(canonicalCity("Kuala Lumpur")).toBe("Kuala Lumpur");
  });
});

describe("buildCityRoute", () => {
  it("uses the travelled order rather than first-seen order", () => {
    expect(buildCityRoute(["Chengdu", "Lijiang"])).toEqual([
      "Lijiang",
      "Chengdu",
    ]);
  });

  it("keeps the round-trip return to Los Angeles", () => {
    expect(buildCityRoute(["Los Angeles", "Seoul"])).toEqual([
      "Los Angeles",
      "Seoul",
      "Los Angeles",
    ]);
  });

  it("appends a city the route does not know about in first-seen order", () => {
    expect(
      buildCityRoute(["Chengdu", "Atlantis", "Lijiang", "Elbonia"])
    ).toEqual(["Lijiang", "Chengdu", "Atlantis", "Elbonia"]);
  });

  it("handles an empty trip", () => {
    expect(buildCityRoute([])).toEqual([]);
  });

  it("lists every seeded stop exactly where it was travelled", () => {
    expect(CITY_ROUTE[0]).toBe("Los Angeles");
    expect(CITY_ROUTE[CITY_ROUTE.length - 1]).toBe("Los Angeles");
    expect(CITY_ROUTE).toContain("Kuala Lumpur");
    expect(CITY_ROUTE).toContain("Daegu");
    expect(CITY_ROUTE).not.toContain("Apollo Bay");
    expect(CITY_ROUTE).not.toContain("Arrowtown");
    expect(CITY_ROUTE).not.toContain("Fiordland");
  });
});
