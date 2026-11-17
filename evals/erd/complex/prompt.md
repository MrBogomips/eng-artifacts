---
name: erd-complex
description: A twelve-table CREATE TABLE script with composite keys, the cardinalities a script can express (mandatory, optional and unique foreign keys; a script cannot say 1..*), a self-relationship, three groups, and owned and referenced relationships
tags: [erd]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

Draw the entity relationship diagram of the database created by this script.

```sql
CREATE TABLE customer (
  id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, created_at timestamp NOT NULL);
CREATE TABLE address (
  id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES customer(id),
  street text NOT NULL, city text NOT NULL, postal_code varchar(12));
CREATE TABLE "order" (
  id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES customer(id),
  shipping_address_id uuid REFERENCES address(id), placed_at timestamp NOT NULL, status text NOT NULL);
CREATE TABLE order_line (
  order_id uuid NOT NULL REFERENCES "order"(id), line_no int NOT NULL,
  product_id uuid NOT NULL REFERENCES product(id), quantity int NOT NULL, unit_price numeric(10,2) NOT NULL,
  PRIMARY KEY (order_id, line_no));
CREATE TABLE category (
  id uuid PRIMARY KEY, parent_id uuid REFERENCES category(id), name text NOT NULL);
CREATE TABLE product (
  id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES category(id),
  title text NOT NULL, price numeric(10,2) NOT NULL);
CREATE TABLE supplier (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE product_supplier (
  product_id uuid NOT NULL REFERENCES product(id), supplier_id uuid NOT NULL REFERENCES supplier(id),
  lead_days int, PRIMARY KEY (product_id, supplier_id));
CREATE TABLE invoice (
  id uuid PRIMARY KEY, order_id uuid NOT NULL UNIQUE REFERENCES "order"(id),
  issued_at date NOT NULL, total numeric(12,2) NOT NULL);
CREATE TABLE payment (
  id uuid PRIMARY KEY, invoice_id uuid NOT NULL REFERENCES invoice(id),
  amount numeric(12,2) NOT NULL, paid_at timestamp);
CREATE TABLE shipment (
  id uuid PRIMARY KEY, order_id uuid NOT NULL REFERENCES "order"(id),
  carrier text NOT NULL, shipped_at timestamp);
CREATE TABLE audit_log (
  id bigint PRIMARY KEY, customer_id uuid REFERENCES customer(id),
  entity text NOT NULL, action text NOT NULL, at timestamp NOT NULL);
```

Show the cardinality at each end of every relationship: a nullable foreign key means the parent side is optional, a UNIQUE foreign key means at most one child, and a table can have zero or more children unless a rule above says otherwise. The category table points to itself.

Distinguish two kinds of relationship. Owned relationships, where the child exists only as part of the parent and its primary key includes the foreign key, are order_line in order, and product_supplier in both product and supplier. Every other foreign key is a plain reference. Draw owned relationships with a solid line and plain references with a dashed line.

Group the tables in three areas: "Sales" (customer, address, order, order_line, shipment), "Catalog" (category, product, supplier, product_supplier) and "Billing" (invoice, payment). audit_log belongs to no area.

Deliver one self-contained HTML page named `erd.html` in the current folder that I can open straight from disk in a browser. It must show every table with its columns, types and keys, the relationships with crow's foot notation, the three areas as visually distinct groups, and have a switch for light and dark mode.
