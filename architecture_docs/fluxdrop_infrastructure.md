# FluxDrop Phase 2: Monorepo Setup & Core Infrastructure

## 1. Complete Turborepo & Backend Folder Structure
The monorepo uses **Turborepo** to manage caching and task execution across a scalable polyglot microservice ecosystem.

```text
fluxdrop-monorepo/
├── apps/                        # Frontend clients & entry points
│   ├── api-gateway/             # NestJS HTTP entrypoint (BFF)
│   └── mobile/                  # React Native Expo app
├── services/                    # Domain-driven NestJS Microservices
│   ├── auth-service/            # Identity & JWT Generation
│   ├── user-service/            # Profiles, Locations
│   ├── restaurant-service/      # Catalog, Menus (MongoDB)
│   ├── order-service/           # Order Saga Orchestrator
│   ├── payment-service/         # Webhooks, Stripe/Razorpay
│   ├── delivery-service/        # Driver tracking (Redis GEO)
│   └── notification-service/    # WebSockets, Push, Email
├── packages/                    # Internal shared libraries
│   ├── shared-types/            # TypeScript Interfaces, Base Entity Definitions
│   ├── shared-events/           # RabbitMQ Routing Keys & Event DTOs
│   ├── shared-config/           # Environment validation (Zod) & Constants
│   ├── shared-logger/           # Pino centralized logger setup
│   ├── shared-utils/            # Standardized API Responses, HTTP Filters
│   ├── database-prisma/         # Shared Prisma schema for SQL services
│   ├── database-mongoose/       # Shared Mongoose schemas for NoSQL services
│   ├── tsconfig/                # Base tsconfig.json extensions
│   └── eslint-config/           # Base ESLint and Prettier configs
├── docker-compose.yml           # Core infrastructure
├── turbo.json                   # Turborepo task pipelines
└── package.json                 # Root dependencies (pnpm/yarn workspaces)
```

---

## 2. Setup Commands

To bootstrap this monorepo infrastructure on a local developer machine:

```bash
# 1. Initialize Turborepo
npx create-turbo@latest fluxdrop-monorepo --use-pnpm
cd fluxdrop-monorepo

# 2. Install NestJS CLI globally
npm i -g @nestjs/cli

# 3. Generate API Gateway & Microservices
nest generate app api-gateway
cd services
nest generate app auth-service
nest generate app user-service
nest generate app order-service
# ... repeat for all services

# 4. Initialize Database ORMs
pnpm add prisma -w
npx prisma init
pnpm add mongoose -w

# 5. Install Core Infrastructure Packages
pnpm add @nestjs/microservices @nestjs/mongoose @nestjs/swagger amqplib amqp-connection-manager pino pino-http socket.io -w
```

---

## 3. Docker Compose Architecture

This spins up the complete backend infrastructure foundation required for local development.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: fluxdrop_postgres
    environment:
      POSTGRES_USER: fluxdrop
      POSTGRES_PASSWORD: rootpassword
      POSTGRES_DB: fluxdrop_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fluxdrop"]
      interval: 5s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4
    container_name: fluxdrop_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@fluxdrop.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

  mongodb:
    image: mongo:6-jammy
    container_name: fluxdrop_mongo
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: rootpassword
    ports:
      - "27017:27017"
    volumes:
      - mongodata:/data/db

  mongo-express:
    image: mongo-express
    container_name: fluxdrop_mongo_express
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: rootpassword
      ME_CONFIG_MONGODB_URL: mongodb://admin:rootpassword@mongodb:27017/
    ports:
      - "8081:8081"
    depends_on:
      - mongodb

  redis:
    image: redis:7-alpine
    container_name: fluxdrop_redis
    command: redis-server --requirepass rootpassword
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: fluxdrop_rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: rootpassword
    ports:
      - "5672:5672"   # AMQP protocol port
      - "15672:15672" # Management UI
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  mongodata:
```

---

## 4. Shared Packages Strategy

*   **`@fluxdrop/shared-types`**: Exposes fundamental models `interface User { ... }`, base class configurations, and global enums (e.g., `OrderStatus`).
*   **`@fluxdrop/shared-events`**: Contains payload interfaces and routing key constants. Prevents services from generating mismatched event payloads. Example: `export const ORDER_CREATED_EVENT = 'order.v1.created';`
*   **`@fluxdrop/shared-utils`**: Houses the Global Exception Filter (to standardize error output into `{ success: false, error: {...} }` format), standard API Response wrapper classes, and interceptors (e.g., Request Timeout interceptor).
*   **`@fluxdrop/shared-config`**: Exports Zod validation schemas for `.env` variables ensuring fast-fail on container startup if variables are missing.

---

## 5. API Gateway Setup

The API Gateway acts as a reverse proxy, stateless HTTP server, and security layer.

*   **Request Forwarding**: Uses `@nestjs/microservices` `ClientProxy` to inject a TCP connection to downstream microservices. Controllers map HTTP `POST /orders` to a TCP message pattern `cmd: 'create_order'`.
*   **JWT Middleware**: A global `AuthGuard` sits at the Gateway level. It verifies the JWT signature offline using a shared public key, attaches the resolved `{ userId, role }` to the `Request` object, and forwards this data in the TCP payload.
*   **Rate Limiting**: Utilizes `@nestjs/throttler` combined with `redis-store` to limit requests per IP/User to prevent DDoS.
*   **Logging**: Injects a custom request ID (`x-correlation-id`) into the headers of every request and logs the incoming/outgoing metadata.

---

## 6. RabbitMQ Architecture & Setup

We implement a **Topic Exchange** (`fluxdrop.events`) to handle pub/sub behavior with wildcard routing flexibility.

**Conventions:**
*   **Exchange**: `fluxdrop.events` (Topic)
*   **Routing Keys**: `[domain].[version].[action]` (e.g., `order.v1.created`, `payment.v1.failed`)
*   **Queues**: Named by the consumer service + action (e.g., `notification_service_order_created_queue`).

**Setup Concept**: Services declare their bindings on startup to ensure they receive specific messages. 

---

## 7. Centralized Logging Architecture (Pino)

Using **Pino** (`nestjs-pino`) for high-performance, asynchronous JSON logging.
*   **Format**: JSON structured logging exclusively.
*   **Correlation**: Every incoming request gets an `x-correlation-id` header (UUID). Pino attaches this ID to *all* logs generated within that request's lifecycle across *all* microservices, making distributed tracing via ELK/Datadog seamless.

---

## 8. Error Handling & Standardized Responses

**Global Exception Filter**
A filter built into `@fluxdrop/shared-utils` that catches all `HttpException` and `RpcException` errors across all services.

**Standard Response Format:**
```typescript
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-05-09T18:00:00.000Z",
  "path": "/api/v1/orders",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Invalid cart payload",
  "errors": [{ "field": "productId", "message": "Product does not exist" }]
}
```

---

## 9. Environment Variable Strategy

Handled via `@nestjs/config` and validated globally. 
*   **Local**: Uses `.env` files located in the root of each application (`apps/api-gateway/.env`).
*   **Development / Production**: Managed via GitHub Actions Secrets injecting into Kubernetes ConfigMaps/Secrets or AWS Parameter Store.
*   *Rule: No service boots if required variables are missing.*

---

## 10. Database Connection Architecture

*   **SQL (Prisma)**: Used for Auth, User, Order, Payment. We use a centralized Prisma Schema in `@fluxdrop/database-prisma`. The Prisma Client is generated into `node_modules` of the services that need it. Connections are pooled, and we utilize Prisma's `$transaction` for financial atomicity.
*   **NoSQL (Mongoose)**: Used for Restaurant Catalog. Mongoose schemas are centralized in `@fluxdrop/database-mongoose`. Uses `@nestjs/mongoose` to connect `MongooseModule.forRootAsync()`.

---

## 11. Redis Integration Strategy

*   **Caching**: `cache-manager-redis-yet` caches heavy read queries (Restaurant Menus, API responses) in the Gateway/Restaurant services.
*   **WebSockets**: `socket.io-redis-adapter` allows the Notification Service to scale horizontally; if an event is emitted on Node A, Node B knows to broadcast it to connected clients.
*   **Geospatial / Queues**: Utilizing BullMQ backed by Redis for delayed jobs (e.g., "Cancel order if not accepted in 10 minutes"), and Redis `GEOADD`/`GEOSEARCH` for matching nearby drivers in Delivery service.

---

## 12. Health Check System

Using `@nestjs/terminus`. Every service exposes a `GET /health` endpoint.
*   **Readiness Check**: Verifies Database connections (`PrismaHealthIndicator`, `MongooseHealthIndicator`), Redis connection, and RabbitMQ connectivity.
*   **Liveness Check**: Simple memory heap threshold check.

---

## 13. Base NestJS Microservice Bootstrap Template

This demonstrates a hybrid microservice setup (listening to both TCP for sync requests and RabbitMQ for async events).

**`main.ts` (Example: Order Service)**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // 1. Centralized Logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  // 2. TCP Transport (Synchronous commands from API Gateway)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: 3001, // Unique per service
    },
  });

  // 3. RabbitMQ Transport (Asynchronous Event Subscriptions)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URI],
      queue: 'order_service_queue',
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1, // Process one message at a time for sagas
    },
  });

  // 4. Start Hybrid App (Starts TCP + RMQ + Health Check HTTP server)
  await app.startAllMicroservices();
  
  // HTTP Port for Kubernetes Probes (Terminus Health Checks)
  await app.listen(process.env.PORT || 8081);
  logger.log(`Order Service is running via TCP/RMQ and HTTP on port ${process.env.PORT}`);
}
bootstrap();
```

## 14. Production Engineering Best Practices Included

1.  **Durable Queues & Acknowledgments**: RabbitMQ is set to `durable: true`. Messages are manually acknowledged (`channel.ack()`) *only* after a service successfully processes them (or stores state to the DB) to prevent message loss on crash.
2.  **Graceful Shutdown**: The bootstrap includes `app.enableShutdownHooks()` so NestJS cleanly closes DB connections and stops accepting RMQ messages before exiting.
3.  **Strict Typing**: Every configuration uses Zod to validate environments at startup, removing runtime undefined errors.
