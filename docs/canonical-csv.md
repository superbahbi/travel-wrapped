# Canonical CSV schema

Both data files are hand-converted from pasted bank statements into the schema
below. Raw statements are never committed. The app parses these files directly
and rejects anything that drifts from the documented shape.

- `client/public/data/transactions.csv` — the spending ledger
- `client/public/data/accommodation.csv` — optional per-night detail

## `transactions.csv`

| Column      | Type                | Required | Notes                                              |
| ----------- | ------------------- | -------- | -------------------------------------------------- |
| `Date`      | `YYYY-MM-DD HH:mm:ss` | yes    | `00:00:00` means the source had no time            |
| `Merchant`  | text                | yes      | Quoted when it contains a comma                    |
| `Amount`    | signed number       | yes      | Native currency; negative is spend, positive refund |
| `Currency`  | ISO 4217            | yes      | Three uppercase letters, e.g. `CNY`, `EUR`         |
| `AmountUSD` | signed number       | yes      | Base-currency amount; negative is spend            |
| `FXRate`    | positive number      | yes      | Native units per USD                               |
| `FXDate`    | `YYYY-MM-DD`         | yes      | Date the rate applies to                           |
| `Category`  | text                | yes      | See the category set below                         |
| `Payment`   | text                | yes      | `Alipay`, `WeChat`, `Cash`, card label, …          |
| `City`      | text                | yes      | `China` is the generic trip-wide bucket            |
| `Country`   | text                | yes      | Country the spend belongs to                       |
| `Notes`     | text                | no       | Free text from the statement                       |

Example row:

```csv
Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes
2026-06-08 00:00:00,Dengba Hostel,-60.10,CNY,-8.89,6.7593,2026-06-08,Accommodation,Other,Shenzhen,China,1 night Jun 8
```

## `accommodation.csv`

| Column      | Type           | Required | Notes                              |
| ----------- | -------------- | -------- | ---------------------------------- |
| `Date`      | `YYYY-MM-DD`    | yes      | Night the stay covers              |
| `Merchant`  | text           | yes      | Property name                      |
| `City`      | text           | yes      |                                    |
| `Country`   | text           | yes      |                                    |
| `Amount`    | positive number | yes     | Native currency                    |
| `Currency`  | ISO 4217       | yes      |                                    |
| `AmountUSD` | positive number | yes     | Base currency                      |
| `FXRate`    | positive number | yes      | Native units per USD               |
| `FXDate`    | `YYYY-MM-DD`    | yes      |                                    |
| `Notes`     | text           | no       | Statement line reference           |

The per-night file is detail only. The ledger owns the accommodation spend
total; the two files are allowed to differ and are labelled separately in the
UI.

## Rules

**Dates.** Times are kept. `00:00:00` is an unknown time, never midnight. The
display layer formats dates; nothing re-parses a string it already owns.

**Spend.** A row is spend if and only if `AmountUSD < 0`. Positive rows are
refunds and are excluded from every spend aggregate. No aggregate sums
`Math.abs` over a mixed set.

**Currency.** `Amount` stays native; `AmountUSD` is the normalized base amount.
When the bank statement shows a USD amount, that is `AmountUSD` and `FXRate` is
derived from it. Otherwise use a dated reference rate and record it.

**Categories.** Current set: `Food`, `Accommodation`, `Transport`,
`Intercity Transport`, `Activities`, `Shopping`, `Laundry`, `Personal Care`,
`Subscription`, `Fees`. A new category is added only when a row genuinely fits
none of these, and only after confirming it in the question batch.

**Generic city.** `China`, `Unknown`, and an empty city are the trip-wide
bucket. They are excluded from city stats and counted in `tripWideTotal`.

## Conversion workflow

When a statement is pasted into the conversation:

1. Parse and inspect every row — dates, signed amounts, currency, duplicates.
2. Categorize best-effort from merchant and notes.
3. Ask only where genuinely unsure, grouped by merchant, showing date, amount,
   city, notes, the proposed category, and the plausible alternative.
4. Flag transfers between own accounts, credit-card payments, ATM withdrawals,
   refunds, and rows missing a city or country. These double-count silently.
5. Do not write the canonical files until open questions are answered.
6. Write the files, then record resolved merchant → category mappings in
   [`merchant-categories.md`](./merchant-categories.md).

## Validation

`parseTransactions` and `parseAccommodations` throw `CanonicalCsvError` with the
row number when a required column is missing, a date or currency is malformed,
or a numeric field is not a number. Schema drift fails loudly instead of
silently dropping rows.

## Privacy

Only the converted files are committed. Raw statements can contain account
numbers and card digits; they stay out of the repository. The converted file is
still public on the deployed site.
