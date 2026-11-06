## Agent skills

### Issue tracker

Issues live in GitHub Issues (`superbahbi/travel-wrapped`), driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles mapped 1:1 to label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Data conversion

When a bank CSV is pasted into the conversation, follow `docs/canonical-csv.md`: analyze every row, ask about genuinely ambiguous categories or cities, flag transfers, refunds, and rows missing a city, and do not write the canonical files until open questions are answered. Record resolved merchant mappings in `docs/merchant-categories.md`.
