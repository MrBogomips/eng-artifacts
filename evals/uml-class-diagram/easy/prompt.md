---
name: uml-class-diagram-easy
description: Six classes of a small library domain from a short description
tags: [uml-class-diagram]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

I am documenting a small library system. Draw its UML class diagram.

The library lends books. A book has a title and an ISBN, and the library holds one or more physical copies of it; each copy has a barcode and a shelf location. A member has a name, an e-mail address and a membership number; a librarian has a name and an employee number. Members and librarians are both people, with a name, so a person is the common parent of the two. A member can borrow many copies over time: a loan records one member, one copy, the date it was borrowed and the date it is due back. A librarian registers each loan, and one librarian can register many loans.

Deliver one self-contained HTML page named `class-diagram.html` in the current folder that I can open straight from disk in a browser. It must show every class as a box with its name and attributes, show inheritance and associations with the UML notation including multiplicities, and have a switch for light and dark mode.
