---
type: llm
focus: trace
---

PASS if the written specification contains acceptance criteria with IDs (AC-1, AC-2, ...) phrased in EARS form (for example "WHEN ..., the system shall ..." or "IF ..., THEN the system shall ..."), each describing one testable behavior, and it covers at least one error or edge case (for example invalid output or stderr handling) and states non-goals.
FAIL if the criteria have no IDs, are vague (for example "works well"), or the specification describes implementation details such as file names or class design instead of behavior.
