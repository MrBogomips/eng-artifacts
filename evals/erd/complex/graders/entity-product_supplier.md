---
type: regex
pattern: "\\bproduct_supplier\\b"
flags: i
match: contains
target: { source: file, path: erd.html }
---
