---
type: regex
pattern: "\\baudit_log\\b"
flags: i
match: contains
target: { source: file, path: erd.html }
---
