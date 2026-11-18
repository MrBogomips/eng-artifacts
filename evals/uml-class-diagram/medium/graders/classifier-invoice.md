---
type: regex
pattern: "\\bInvoice\\b"
flags: i
match: contains
target: { source: file, path: class-diagram.html }
---
