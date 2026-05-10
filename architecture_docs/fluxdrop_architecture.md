# FluxDrop Architecture & System Foundation

## 1. Executive Summary
**FluxDrop** is designed as a highly scalable, event-driven, production-grade quick-commerce platform. Drawing inspiration from industry leaders like Swiggy and Uber Eats, the system leverages a polyglot microservices architecture to ensure independent scalability, fault tolerance, and rapid deployment. This document outlines the Phase 1 architectural foundation, establishing the blueprint for the backend systems, data layers, messaging topology, and deployment strategy.

---

## 2. Complete System Architecture

```mermaid
architecture-beta
    group api(cloud)[API Layer]
    group services(cloud)[Microservices]
    group db(database)[Databases & Brokers]

    service mobile(server)[React Native App]
    
    service gateway(server)[API Gateway] in api
    service ws(server)[WebSocket Node] in api

    service auth(server)[Auth Service] in services
    service user(server)[User Service] in services
    service rest(server)[Restaurant Service] in services
    service order(server)[Order Service] in services
    service pay(server)[Payment Service] in services
    service del(server)[Delivery Service] in services
    service notif(server)[Notification Service] in services

    service rmq(database)[RabbitMQ] in db
    service redis(database)[Redis] in db
    service pg(database)[PostgreSQL] in db
    service mongo(database)[MongoDB] in db

    mobile:R -- L:gateway
    mobile:R -- L:ws

    gateway:B -- T:auth
    gateway:B -- T:user
    gateway:B -- T:rest
    gateway:B -- T:order
    gateway:B -- T:pay
    gateway:B -- T:del

    ws:B -- T:notif

    auth:B -- T:pg
    user:B -- T:pg
    order:B -- T:pg
    pay:B -- T:pg
    del:B -- T:pg
    
    rest:B -- T:mongo
    notif:B -- T:mongo
    
    rest:R -- L:redis
    del:R -- L:redis
    
    order:R -- L:rmq
    pay:R -- L:rmq
    del:R -- L:rmq
    notif:R -- L:rmq
    rest:R -- L:rmq
```

---

## 3. Microservices Breakdown & 4. Service Responsibilities

Using Clean Architecture principles within NestJS, each service encapsulates its own domain logic, database, and event handlers.

| Service | Database | Primary Responsibilities |
|---------|----------|--------------------------|
| **API Gateway** | None (Stateless) | Entry point for all HTTP requests. Handles request routing, rate limiting, token validation (JWT verification), and aggregates responses from downstream services. |
| **Auth Service** | PostgreSQL + Redis | Manages user identity, JWT generation/refresh, password hashing, and OAuth integrations. Redis is used for token blacklisting and rate-limiting brute force attacks. |
| **User Service** | PostgreSQL | Manages user profiles, addresses, preferences, and saved locations. Isolated from Auth to separate identity from domain data. |
| **Restaurant Service** | MongoDB + Redis | Manages restaurant profiles, catalog, categories, and menus. MongoDB is used for flexible, hierarchical menu structures. Redis caches high-traffic read queries (e.g., active menus). |
| **Order Service** | PostgreSQL | The core orchestrator. Manages the lifecycle of an order using the **Saga Pattern**. Handles cart validation, order creation, state transitions, and coordination between Payment, Restaurant, and Delivery services. |
| **Payment Service** | PostgreSQL | Integrates with 3rd-party gateways (Stripe/Razorpay). Manages transactions, refunds, and webhooks. |
| **Delivery Service** | PostgreSQL + Redis | Manages delivery partner state, order assignment algorithms, and real-time location tracking. Redis Geospatial queries (GEOSEARCH) are used to find nearby drivers rapidly. |
| **Notification Service** | MongoDB + Redis | Handles all outgoing communication (Push, SMS, Email, WebSockets). Maintains notification history in MongoDB. Manages Socket.IO connections via Redis Pub/Sub for horizontal scaling. |

---

## 5. Communication Flow

The platform utilizes a hybrid communication strategy to balance performance and reliability:

1. **Synchronous Communication (NestJS TCP / HTTP)**
   - Used for operations requiring immediate responses (e.g., API Gateway validating a token via Auth Service, fetching a restaurant menu).
   - **Protocol**: API Gateway communicates with microservices using NestJS native TCP transport for low-latency internal RPC calls.

2. **Asynchronous Communication (RabbitMQ)**
   - Used for state changes, side-effects, and distributed transactions (Sagas).
   - Ensures decoupling. For instance, `Order Service` does not wait for `Notification Service` to send an email; it simply emits an `order.created` event.

---

## 6. Event-Driven Architecture & Saga Pattern

**The Order Creation Saga:**
Creating an order spans multiple services. We use a **Choreography Saga** via RabbitMQ.

1. **User** submits order -> **API Gateway** -> **Order Service**.
2. **Order Service** creates order in `PENDING` state and publishes `order.created`.
3. **Payment Service** listens, processes payment, publishes `payment.succeeded` (or `payment.failed`).
4. **Order Service** listens, updates state to `PAID`, publishes `order.confirmed`.
5. **Restaurant Service** listens, alerts kitchen to prepare food, publishes `restaurant.accepted`.
6. **Delivery Service** listens, starts searching for drivers. Finds driver, publishes `delivery.assigned`.
7. **Notification Service** listens to all these events and pushes real-time WebSocket updates to the client.

If any step fails (e.g., `payment.failed`), compensating transactions are triggered (e.g., cancel order, release inventory).

---

## 7. RabbitMQ Event Structure

We use a Topic Exchange (`fluxdrop.topic`) to allow wildcard routing.

**Routing Key Convention:** `[domain].[entity].[action]`

**Standard Event Payload (CloudEvents inspired):**
```typescript
interface BaseEvent<T> {
  eventId: string;          // UUID v4
  timestamp: string;        // ISO 8601
  sourceService: string;    // e.g., 'order-service'
  correlationId: string;    // For tracing requests across services
  payload: T;
}
```

**Key Events:**
- `order.checkout.initiated`
- `payment.transaction.succeeded`
- `payment.transaction.failed`
- `restaurant.order.accepted`
- `delivery.driver.assigned`
- `delivery.status.updated`

---

## 8. Monorepo Strategy & Folder Structure

Using **Turborepo** for high-performance builds, caching, and dependency management.

```text
fluxdrop-monorepo/
├── apps/
│   ├── api-gateway/       # NestJS App
│   ├── auth-service/      # NestJS App
│   ├── order-service/     # NestJS App
│   └── mobile/            # React Native (Expo) App
├── packages/
│   ├── eslint-config/     # Shared linting rules
│   ├── ts-config/         # Shared TypeScript base configs
│   ├── shared-dto/        # Class-validator DTOs shared across gateway & services
│   ├── shared-events/     # RabbitMQ routing keys, Event Interfaces
│   ├── shared-database/   # TypeORM/Mongoose base configurations
│   └── shared-logger/     # Winston/Pino centralized logging setup
├── docker-compose.yml     # Local infrastructure setup
├── turbo.json             # Turborepo pipeline configuration
└── package.json           # Root workspace dependencies
```

**Why this structure?** `shared-dto` ensures the API Gateway and Microservices use the exact same validation schemas without duplicating code. `shared-events` prevents typo-related bugs in RabbitMQ routing keys.

---

## 9. Database & Redis Strategy

- **PostgreSQL**: Used as the primary operational database. High relational integrity for financial data (Orders, Payments).
- **MongoDB**: Used for highly hierarchical data (Menus with nested categories, add-ons, variants) and unstructured data (Notification logs).
- **Redis Strategy**:
  1. **Caching**: Restaurant menus, API Gateway rate limiting.
  2. **Pub/Sub**: Socket.IO adapters for horizontally scaling the Notification Service.
  3. **Geospatial**: Storing delivery driver coordinates via `GEOADD` and searching via `GEOSEARCH` to find drivers within a radius in sub-millisecond times.

---

## 10. API Gateway & WebSocket Architecture

**API Gateway Structure:**
- Built with NestJS HTTP.
- Exposes RESTful endpoints to the React Native app.
- Acts as a reverse proxy/BFF (Backend for Frontend).
- Strips external headers, injects `X-User-Id` after verifying the JWT, and forwards to TCP microservices.

**WebSocket Architecture:**
- The `Notification Service` exposes a Socket.IO server.
- The Mobile App connects directly to this WS endpoint (bypassing the HTTP API Gateway for persistent connections) authenticated via a short-lived WS ticket.
- Redis Adapter enables scaling multiple instances of the Notification Service.

---

## 11. Initial Authentication Flow

1. Client sends `POST /api/v1/auth/login` to **API Gateway**.
2. Gateway routes to **Auth Service** (TCP).
3. Auth Service verifies password against Postgres.
4. Auth Service generates `AccessToken` (15m, JWT) and `RefreshToken` (7d, stored in HTTP-only cookie & Postgres).
5. Subsequent requests include `Authorization: Bearer <Token>`.
6. API Gateway's Global Guard validates the token signature offline (using public key) or via fast TCP call to Auth Service, attaches `userId` to the request, and forwards to internal services.

---

## 12. Docker Architecture & Environment Variables

**Local Development (`docker-compose.yml`):**
We containerize only the infrastructure for local development to keep hot-reloading fast, while services run on the host machine via Turborepo.

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
  mongodb:
    image: mongo:6
  redis:
    image: redis:7-alpine
  rabbitmq:
    image: rabbitmq:3-management-alpine # Includes Management UI
```

**Environment Variable Strategy:**
- Each app has its own `.env` validated on startup using `@nestjs/config` and `joi` or `zod`.
- Strict schema validation ensures a service refuses to start if `RABBITMQ_URI` or `DATABASE_URL` is missing.

---

## 13. Tech Decisions with Justification

1. **NestJS over Express**: Provides out-of-the-box microservice transports (TCP, Redis, RabbitMQ), robust Dependency Injection, and enforcing a strictly typed, modular architecture essential for enterprise scale.
2. **RabbitMQ over Kafka**: Quick-commerce workflows (Sagas) require complex routing (topic exchanges, delayed queues for "order timeout") which RabbitMQ handles natively. Kafka is better for massive event streaming/log aggregation, which is overkill for Phase 1.
3. **Turborepo over Nx**: Turborepo provides a simpler mental model for Node/React Native ecosystems while still offering blazing fast build caching compared to Lerna.
4. **Postgres + Mongo Polyglot**: Forcing a complex menu with deeply nested variants (Size, Toppings, Crust) into SQL results in complex joins and slow reads. MongoDB solves catalog complexity natively, while Postgres ensures ACID compliance for money/orders.

---

## 14. Production-Grade Engineering Practices Included

1. **Correlation IDs**: Every incoming request gets an `x-correlation-id` header propagated through all microservices and RabbitMQ events for unified logging (ELK stack ready).
2. **Graceful Shutdown**: Intercepting `SIGTERM` signals to close database connections and finish processing RabbitMQ messages before container termination.
3. **Circuit Breakers**: Implemented at the API Gateway using `@nestjs/axios` or custom interceptors to prevent cascading failures if a microservice goes down.
4. **Idempotency**: All consumers of RabbitMQ events are designed to be idempotent (using Redis to track processed event IDs) to handle duplicate message deliveries safely.
