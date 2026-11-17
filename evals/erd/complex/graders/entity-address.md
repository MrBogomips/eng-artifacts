---
type: regex
pattern: "\\baddress\\b"
flags: i
match: contains
target: { source: file, path: erd.html }
---
