---
name: erd-medium
description: About eight entities from prose, with two groups and optional relationships
tags: [erd]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

Draw the entity relationship diagram of the data model of an online course platform, described below.

Courses are created by instructors. A course has a title, a price and a level, and belongs to exactly one category; categories can be nested, a category has an optional parent category. A course is divided into lessons, which only exist as part of their course and are numbered within it; a lesson has a title and a duration in minutes. Students enroll in courses: an enrollment links one student to one course, with the enrollment date and an optional completion date, and a student can enroll in a course only once. Students can leave reviews: a review belongs to one enrollment, has a rating from 1 to 5 and an optional comment. Instructors and students are both users with an e-mail, a display name and a creation date; an instructor additionally has a biography.

Group the tables in two areas: a "Catalog" area (course, lesson, category) and a "People" area (instructor, student, enrollment, review). Relationships that are optional on one side must show that. Show the column types you consider sensible.

Deliver one self-contained HTML page named `erd.html` in the current folder that I can open straight from disk in a browser. It must show every entity as a table with its columns, types and keys, show the relationships with crow's foot notation including optionality, show the two areas as visually distinct groups, and have a switch for light and dark mode.
