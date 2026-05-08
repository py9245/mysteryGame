# Case Data

This folder holds the shared root-level case fixtures for Mystery Time.

- `index.json` lists the available sample cases.
- `case-001.json`, `case-002.json`, `case-003.json` are the current MVP fixtures.
- admin runtime now loads each case file from `index.json` and renders case detail read-only in `/admin`.

These files mirror the Agent 3 content scaffold and are the runtime-facing source for content loading.
