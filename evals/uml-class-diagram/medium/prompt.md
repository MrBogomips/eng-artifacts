---
name: uml-class-diagram-medium
description: A DDD domain model in prose, three bounded contexts, aggregates, value objects, an enumeration
tags: [uml-class-diagram]
runs: 3
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

Draw the UML class diagram of the domain model of an online shop, described below. The model is organised in three bounded contexts, each a package: ordering, shipping and billing.

In ordering, the aggregate root is the Order. An order owns its order lines: a line exists only as part of its order, there is at least one per order, and each line has a quantity and a unit price. An order has a status, one of pending, confirmed or cancelled, kept as an enumeration called OrderStatus, and a total. An order belongs to one Customer, an aggregate root of its own with a name and an e-mail address; a customer can have any number of orders, and the order refers to the customer without owning it. A customer has an Address, a value object with street, city and postal code. Money is a value object with an amount and a currency, and it is used for prices and totals across the contexts.

In shipping, the aggregate root is the Shipment, which refers to the order it delivers by identifier. A shipment owns one or more Parcels, each with a weight and a tracking code. A shipment is handled by a Carrier, an entity that can handle many shipments, and it is sent to an address.

In billing, the aggregate root is the Invoice, which refers to one order and owns one or more Payments; a payment has an amount and a date and carries a PaymentStatus, an enumeration of pending, settled or refunded. An invoice states the amount due as Money.

Show the aggregate roots and value objects with their stereotypes, the parts an aggregate owns as composition and the references between aggregates as plain associations, with a multiplicity at each end. Attributes need no types unless you consider them useful.

Deliver one self-contained HTML page named `class-diagram.html` in the current folder that I can open straight from disk in a browser. It must show the three contexts as visually distinct groups, let me switch the level of detail between all members, public members only, and class names only, and have a switch for light and dark mode.
