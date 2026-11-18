---
type: regex
pattern: "\\bPaymentMethod\\b"
flags: i
match: contains
target: { source: file, path: class-diagram.html }
---
