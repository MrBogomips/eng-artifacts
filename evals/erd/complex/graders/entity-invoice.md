---
type: regex
pattern: "\\binvoice\\b"
flags: i
match: contains
target: { source: file, path: erd.html }
---
