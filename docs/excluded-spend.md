# Excluded spend

Rows that were removed from `client/public/data/transactions.csv` because they
are not part of the trip the wrapped analyses. Kept here so the decision is
auditable without keeping the rows in the ledger.

The trip runs **2026-02-23 (first New Zealand day) through 2026-10-28 (last
South Korea day)**. Los Angeles stays the start and finish city because the
route is the fixed travelled order, not a function of spend dates.

## Outside the trip window

| Date | Merchant | Category | AmountUSD |
| --- | --- | --- | ---: |
| 2026-02-18 | Walmart | `Food` | $15.79 |
| 2026-02-19 | Din Tai Fung | `Food` | $67.00 |
| 2026-02-19 | Mobimatter | `Subscription` | $3.49 |
| 2026-02-20 | GeoBlue | `Fees` | $219.22 |
| 2026-10-29 | IN-N-OUT EL SEGUNDO | `Food` | $13.23 |
| 2026-10-30 | HABIT SANTA MONICA 213 | `Food` | $15.60 |
| 2026-11-01 | MCDONALD'S M5764 OF CA | `Food` | $2.24 |
| 2026-11-01 | McDonalds 1288 | `Food` | $1.09 |

Total: **$337.66**

GeoBlue is travel insurance bought three days before departure. It is excluded
by the window rule even though it is trip-related.

## Home subscriptions and bank charges

Removed in `551ace4` as recurring home-life costs rather than trip spend
(`$529.20` across 55 rows).

| Merchant | Category | Rows | AmountUSD |
| --- | --- | ---: | ---: |
| APPLE.COM/BILL | `Subscription` | 9 | $99.91 |
| ANNUAL MEMBERSHIP FEE | `Fees` | 1 | $95.00 |
| PAYPAL *PROTON | `Subscription` | 8 | $92.61 |
| SANTAMONICA PARKINGVIOL | `Fees` | 1 | $75.50 |
| TARGET T-0199 | `Shopping` | 1 | $34.14 |
| Acorns | `Subscription` | 9 | $27.00 |
| PURCHASE INTEREST CHARGE | `Fees` | 1 | $25.19 |
| FREETAXUSA.COM | `Subscription` | 1 | $15.99 |
| GOOGLE *Google One | `Subscription` | 8 | $15.92 |
| TRANSACTION FEE | `Fees` | 1 | $10.00 |
| CLAUDE | `Subscription` | 2 | $10.00 |
| OPENCODE | `Subscription` | 1 | $10.00 |
| Spotify | `Subscription` | 1 | $6.99 |
| ELEVENLABS.IO | `Subscription` | 1 | $5.00 |
| GOOGLE *CLOUD ZxW4SV | `Subscription` | 1 | $5.00 |
| GOOGLE *CLOUD (9 other lines) | `Subscription` | 9 | $0.95 |

## Totals

| | AmountUSD |
| --- | ---: |
| Merged 2026 ledger | $9,351.21 |
| Outside the trip window | −$337.66 |
| Home subscriptions and bank charges | −$529.20 |
| **Wrapped trip spend** | **$8,484.35** |
