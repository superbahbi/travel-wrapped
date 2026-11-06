/**
 * City grouping and the order the trip was actually travelled.
 *
 * The ledger keeps the place a bank row names. Day trips and metro-area
 * suburbs are folded into the city they were visited from, so one place never
 * appears twice in city totals, achievements, or the route card.
 */
const CITY_ALIASES: Record<string, string> = {
  "santa monica": "Los Angeles",
  torrance: "Los Angeles",
  "el segundo": "Los Angeles",
  katoomba: "Sydney",
  picton: "Blenheim",
  "apollo bay": "Melbourne",
  arrowtown: "Queenstown",
  fiordland: "Queenstown",
};

/**
 * Fold a ledger city into the city that owns the visit. Matching is
 * case-insensitive; an unmapped city is returned trimmed and unchanged.
 */
export function canonicalCity(city: string): string {
  const trimmed = city.trim();
  return CITY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/**
 * The travelled order, not the order the first bank row happens to appear.
 * Bookings made before a move (a flight to Sydney bought while still in
 * Blenheim) must not pull a city earlier in the route.
 *
 * Los Angeles appears twice because the trip is a round trip.
 */
export const CITY_ROUTE: readonly string[] = [
  "Los Angeles",
  "Auckland",
  "Wellington",
  "Blenheim",
  "Kaikoura",
  "Christchurch",
  "Queenstown",
  "Melbourne",
  "Sydney",
  "Bali",
  "Singapore",
  "Johor Bahru",
  "Melaka",
  "Kuala Lumpur",
  "Penang",
  "Hong Kong",
  "Shenzhen",
  "Guangzhou",
  "Yangshuo",
  "Guilin",
  "Kunming",
  "Pu'er",
  "Dali",
  "Lijiang",
  "Shangri-La",
  "Yading",
  "Litang",
  "Chengdu",
  "Chongqing",
  "Changsha",
  "Jingdezhen",
  "Shanghai",
  "Suzhou",
  "Yancheng",
  "Qingdao",
  "Weihai",
  "Seoul",
  "Daegu",
  "Los Angeles",
];

/**
 * Order visited cities by the travelled route. A city the route does not know
 * about is appended in first-seen order rather than being silently dropped.
 */
export function buildCityRoute(visited: Iterable<string>): string[] {
  const visitedSet = new Set(visited);
  const ordered = CITY_ROUTE.filter(city => visitedSet.has(city));
  const listed = new Set(CITY_ROUTE);
  const unlisted = Array.from(visitedSet).filter(city => !listed.has(city));
  return [...ordered, ...unlisted];
}
