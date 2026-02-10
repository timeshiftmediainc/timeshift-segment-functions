# Segment Functions

Segment Insert Functions for three workspaces:

| Directory | Segment Workspaces |
|---|---|
| `anytime/` | [Pilates Anytime](https://app.segment.com/pilates-anytime/functions/catalog), [Yoga Anytime](https://app.segment.com/yoga-anytime/functions/catalog) |
| `timeshift-platform/` | [Timeshift Platform](https://app.segment.com/timeshift-platform/functions/catalog) |

## Structure

```
anytime/
  source-insert/         # Runs on incoming events before they reach the source
    identify-to-timeshift.js
  destination-insert/    # Runs on events going to a specific destination (typically Iterable)
    transform-to-timeshift.js

timeshift-platform/
  source-insert/
    identify-to-timeshift.js
  destination-insert/
    transform-to-timeshift.js

shared/                  # Shared helpers (for testing only — not deployed to Segment)
  helpers.js
  identity.js
```

Each function file is self-contained and deployed independently to Segment. The `shared/` directory extracts duplicated logic for testing purposes only. This will inevitably lead to drift in the Segment-deployed version and the `shared/` version tested.

## Testing

```sh
npm install
npm test
```

## TODO

- CI/CD pipeline to deploy these to Segment via GitHub Actions
