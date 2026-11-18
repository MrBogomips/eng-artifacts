---
type: regex
pattern: "\\bPaymentStatus\\b"
flags: i
match: contains
target: { source: file, path: class-diagram.html }
---
