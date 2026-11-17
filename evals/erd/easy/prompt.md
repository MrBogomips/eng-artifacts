---
name: erd-easy
description: Four entities from a short description
tags: [erd]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

I am documenting the data model of a small library. Draw its entity relationship diagram.

The library has members, books, loans and authors. A member can borrow many books over time, and each loan records one member, one book, the date it was borrowed and the date it is due back. A book has a title and an ISBN, and is written by one or more authors; an author can have written many books. Members have a name and an e-mail address; authors have a name.

Deliver one self-contained HTML page named `erd.html` in the current folder that I can open straight from disk in a browser. It must show every entity as a table with its columns, their types and its primary and foreign keys, show the relationships between the entities with crow's foot notation (one, many, optional), and have a switch for light and dark mode.
