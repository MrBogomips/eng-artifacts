---
type: regex
pattern: "\\bOrderStatus\\b"
flags: i
match: contains
target: { source: file, path: class-diagram.html }
---
