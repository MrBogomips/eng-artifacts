---
type: regex
pattern: "\\bpayment\\b"
flags: i
match: contains
target: { source: file, path: erd.html }
---
