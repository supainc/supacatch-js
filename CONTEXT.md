# SupaCatch SDK

SupaCatch SDK captures server-side failures and submits Events to a SupaCatch ingest endpoint.

## Language

**Event**:
A record of a captured failure submitted to the SupaCatch ingest endpoint.
_Avoid_: Error report, payload

**Ingest Key**:
A secret credential that authorizes submission of Events to a SupaCatch ingest endpoint.
_Avoid_: Token, API key

**Automatic fatal Event capture**:
Capture of an unhandled fatal failure before the runtime terminates.
_Avoid_: Global error handling, crash reporting
