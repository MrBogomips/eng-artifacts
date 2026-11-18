---
type: regex
pattern: "\\bEventStatus\\b"
flags: i
match: contains
target: { source: file, path: class-diagram.html }
---
