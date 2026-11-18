---
name: uml-class-diagram-complex
description: A class diagram reverse-engineered from TypeScript source, with every UML relationship kind, stereotypes, packages, detail levels and highlighting
tags: [uml-class-diagram]
runs: 3
max_turns: 80
timeout_seconds: 2700
allowed_tools: [Read, Write, Edit, Bash, Glob, Grep, Skill]
---

I am handing you the domain layer of an event ticketing service, written in TypeScript, and need its UML class diagram as an interactive page. Each folder is a package.

```typescript
// shared/money.ts
export enum Currency { EUR, USD, GBP }
/** @valueObject */
export class Money {
  constructor(readonly amount: number, readonly currency: Currency) {}
  add(other: Money): Money { return new Money(this.amount + other.amount, this.currency); }
  static zero(currency: Currency): Money { return new Money(0, currency); }
}

// shared/entity.ts
export abstract class Entity<TId> {
  protected constructor(readonly id: TId) {}
  equals(other: Entity<TId>): boolean { return this.id === other.id; }
}
export interface DomainEvent { readonly occurredAt: Date; }
export interface Repository<T> {
  findById(id: string): Promise<T | undefined>;
  save(item: T): Promise<void>;
}

// catalog/venue.ts
/** @valueObject */
export class Address { constructor(readonly street: string, readonly city: string, readonly postalCode?: string) {} }
export class Section {
  constructor(readonly name: string, readonly rows: number, readonly seatsPerRow: number) {}
  seat(row: number, n: number): Seat { return new Seat(row, n); }
}
/** @aggregateRoot */
export class Venue extends Entity<string> {
  private sections: Section[] = [];
  constructor(id: string, public name: string, public address: Address) { super(id); }
  capacity(): number { return this.sections.reduce((s, x) => s + x.rows * x.seatsPerRow, 0); }
  addSection(section: Section): void { this.sections.push(section); }
}

// catalog/event.ts
export enum EventStatus { Draft, OnSale, SoldOut, Cancelled }
export class PriceTier { constructor(readonly name: string, readonly price: Money, readonly section: Section) {} }
export class EventCancelled implements DomainEvent {
  readonly occurredAt = new Date();
  constructor(readonly eventId: string, readonly reason: string) {}
}
/** @aggregateRoot */
export class Event extends Entity<string> {
  private priceTiers: PriceTier[] = [];
  status: EventStatus = EventStatus.Draft;
  constructor(id: string, public title: string, public startsAt: Date, public venue: Venue) { super(id); }
  publish(): void { this.status = EventStatus.OnSale; }
  cancel(reason: string): EventCancelled { this.status = EventStatus.Cancelled; return new EventCancelled(this.id, reason); }
  protected tierFor(section: Section): PriceTier | undefined { return this.priceTiers.find(t => t.section === section); }
}

// booking/order.ts
/** @valueObject */
export class Seat { constructor(readonly row: number, readonly number: number) {} }
export enum OrderStatus { Pending, Confirmed, Cancelled }
export class LoyaltyCard { constructor(readonly number: string, public points: number) {} }
/** @aggregateRoot */
export class Customer extends Entity<string> {
  orders: Order[] = [];
  loyalty?: LoyaltyCard;
  constructor(id: string, public name: string, public email: string) { super(id); }
}
export class Ticket extends Entity<string> {
  holderName?: string;
  constructor(id: string, readonly event: Event, readonly seat: Seat) { super(id); }
  barcode(): string { return `${this.id}-${this.seat.row}-${this.seat.number}`; }
}
export class OrderLine { constructor(readonly ticket: Ticket, readonly price: Money) {} }
/** @aggregateRoot */
export class Order extends Entity<string> {
  private lines: OrderLine[] = [];
  status: OrderStatus = OrderStatus.Pending;
  paidWith?: PaymentMethod;
  private static readonly MAX_TICKETS = 10;
  constructor(id: string, readonly customer: Customer) { super(id); }
  addTicket(event: Event, seat: Seat, tier: PriceTier): Ticket { /* ... */ }
  total(): Money { /* ... */ }
  async confirm(payments: PaymentService, method: PaymentMethod): Promise<Receipt> { /* ... */ }
}
export class OrderRepository implements Repository<Order> {
  findById(id: string): Promise<Order | undefined> { /* ... */ }
  save(item: Order): Promise<void> { /* ... */ }
}

// payment/payment.ts
export abstract class PaymentMethod { abstract describe(): string; }
export class CardPayment extends PaymentMethod {
  constructor(private last4: string, private expiry: string) { super(); }
  describe(): string { return `Card ****${this.last4}`; }
}
export class WalletPayment extends PaymentMethod {
  constructor(public provider: string) { super(); }
  describe(): string { return `Wallet ${this.provider}`; }
}
export class Receipt { constructor(readonly id: string, readonly amount: Money, readonly paidAt: Date) {} }
export interface PaymentService { charge(amount: Money, method: PaymentMethod): Promise<Receipt>; }
export class GatewayPaymentService implements PaymentService {
  private static readonly MAX_RETRIES = 3;
  constructor(private endpoint: string) {}
  async charge(amount: Money, method: PaymentMethod): Promise<Receipt> { /* ... */ }
}
```

Draw it with these UML rules:

- Every class, abstract class, interface and enumeration with its attributes and operations, their types, parameters and visibility (public `+`, protected `#`, private `-`); static members underlined, abstract classes and operations in italics, generic type parameters shown on the class.
- Stereotypes: «interface», «enumeration» with its literals, and «aggregate root» or «value object» where the source marks them.
- Generalization (`extends`) and interface realization (`implements`), the latter also when the interface is generic.
- Composition for parts a class owns and keeps private (Venue to Section, Event to PriceTier, Order to OrderLine); aggregation for Customer to its orders; plain directed association for every other field whose type is a class of the model; and a dependency for a class used only as a parameter or return type.
- The multiplicity at each end of every association: an array is `0..*`, an optional field `0..1`, any other field `1`.
- The four folders as packages, drawn as visually distinct groups.

Deliver one self-contained HTML page named `class-diagram.html` in the current folder that I can open straight from disk in a browser, with the model embedded in it. Besides the diagram, it must let me switch the level of detail between all members, public members only, and class names only (for a domain overview); highlight a class and its direct relationships when I click it; include a legend of the notation; and have a switch for light and dark mode.
