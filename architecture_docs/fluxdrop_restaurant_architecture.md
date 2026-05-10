# FluxDrop Phase 4: Restaurant Service & Catalog Management Architecture

## 1. Restaurant Service Architecture Overview

The Restaurant Service functions as the central catalog and search engine of the FluxDrop platform. It uses a **Polyglot Persistence Model**:
*   **PostgreSQL + PostGIS**: Source of truth for relational menu structures, restaurant profiles, and complex delivery zone polygons.
*   **MongoDB**: Stores denormalized search metadata, menu interaction analytics, and operational audit logs.
*   **Redis**: Powers the high-velocity `Nearby Restaurants` feed and caches heavily requested menus to protect the primary databases.

---

## 2. Database Schema Strategy & 3. Prisma Schema (PostgreSQL)

The relational schema must handle complex hierarchical relationships (Items -> Variants -> Add-on Groups -> Add-ons) while ensuring atomic pricing updates.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis] // Required for Geo-spatial queries
}

enum RestaurantStatus {
  DRAFT
  PENDING_VERIFICATION
  VERIFIED
  SUSPENDED
}

model Restaurant {
  id                String             @id @default(uuid())
  ownerId           String             // References User Service
  name              String
  description       String?
  status            RestaurantStatus   @default(DRAFT)
  isOpen            Boolean            @default(false)
  isAcceptingOrders Boolean            @default(true)
  preparationTime   Int                // Avg prep time in mins
  rating            Float              @default(0.0)
  totalRatings      Int                @default(0)
  
  // PostGIS Spatial Data
  location          Unsupported("geometry(Point, 4326)") 
  
  businessHours     RestaurantHours[]
  deliveryZones     DeliveryZone[]
  categories        MenuCategory[]
  items             MenuItem[]
  
  @@index([status, isOpen])
}

model DeliveryZone {
  id           String    @id @default(uuid())
  restaurantId String
  restaurant   Restaurant @relation(fields: [restaurantId], references: [id])
  polygon      Unsupported("geometry(Polygon, 4326)") // PostGIS Boundary
  deliveryFee  Decimal   @db.Decimal(10, 2)
  minOrderVal  Decimal   @db.Decimal(10, 2)
}

model MenuCategory {
  id           String     @id @default(uuid())
  restaurantId String
  name         String
  sortOrder    Int
  items        MenuItem[]
}

model MenuItem {
  id             String       @id @default(uuid())
  restaurantId   String
  categoryId     String
  name           String
  description    String?
  basePrice      Decimal      @db.Decimal(10, 2)
  isAvailable    Boolean      @default(true)
  isVeg          Boolean
  inventoryCount Int?         // For limited daily items
  variants       ItemVariant[]
  addOnGroups    AddOnGroup[]
}

model ItemVariant {
  id         String   @id @default(uuid())
  itemId     String
  name       String   // e.g., "Regular", "Large"
  price      Decimal  @db.Decimal(10, 2)
}

model AddOnGroup {
  id            String   @id @default(uuid())
  itemId        String
  name          String   // e.g., "Extra Toppings"
  isRequired    Boolean  @default(false)
  minSelections Int      @default(0)
  maxSelections Int      @default(1)
  addOns        AddOn[]
}

model AddOn {
  id       String     @id @default(uuid())
  groupId  String
  name     String
  price    Decimal    @db.Decimal(10, 2)
}
```

---

## 4. MongoDB Strategy (Analytics & Search Metadata)

MongoDB serves as an OLAP-lite datastore, absorbing high-velocity, schema-less data.

*   **`SearchMetadata` Collection**: When a menu is updated in PostgreSQL, an event triggers a denormalization process that flattens the restaurant profile and top items into a MongoDB document. This allows for rapid, flexible text search without complex SQL JOINs.
*   **`RestaurantAnalytics` Collection**: Stores daily operational metrics (profile views, cart drop-offs, item clicks) used for the Restaurant Owner Dashboard.

---

## 5. Geo-Location Architecture

**Problem**: We must only show customers restaurants that actually deliver to their exact coordinates. Radius alone is insufficient because of physical boundaries (rivers, highways).

**Solution**:
1.  **First Pass (Redis GEO)**: We query Redis `GEOSEARCH` to instantly find all restaurants within a 15km bounding box of the customer's coordinates.
2.  **Second Pass (PostGIS `ST_Contains`)**: We pass those IDs to PostgreSQL and execute a spatial query (`ST_Contains(polygon, customer_point)`) against the `DeliveryZone` table to ensure the customer is inside the custom delivery polygon drawn by the restaurant.

---

## 6. Redis Caching Strategy

The cache layer is critical for survival during peak dinner rushes.

*   **`feed:nearby:{geohash}`**: Caches the array of restaurant IDs available in a specific neighborhood grid. TTL: 5 minutes.
*   **`menu:{restaurantId}`**: Fully assembled JSON string of the restaurant's entire menu hierarchy. TTL: 24 hours.
*   **Cache Invalidation**: On receiving `menu.updated` or `restaurant.closed` from RabbitMQ, the service instantly deletes `menu:{restaurantId}` and broadcasts a websocket event for active clients to refresh.

---

## 7. Event-Driven Communication Flow (RabbitMQ)

The Restaurant Service is highly chatty, producing events that orchestrate the rest of the ecosystem.

*   `restaurant.onboarded`: Triggers Admin notification for verification.
*   `restaurant.verified`: User Service updates owner's role to `RESTAURANT_OWNER`.
*   `restaurant.opened` / `restaurant.closed`: Triggers Redis cache invalidation and Socket.IO alerts to users viewing that restaurant.
*   `menu.item.sold_out`: Dispatched by the Order Service when inventory hits 0. Restaurant Service consumes this and toggles `isAvailable = false`.

---

## 8. Search Architecture

1.  **Text Indexing**: We use PostgreSQL `pg_trgm` (Trigram) indexes on `Restaurant.name` and `MenuItem.name` for fast fuzzy matching ("piza" -> "pizza").
2.  **Trending Calculation**: A cron job analyzes Order Service data nightly and updates a `trendingScore` column in PostgreSQL to rank search results organically.

---

## 9. Restaurant Onboarding Flow

1.  **Draft**: Owner fills out profile, uploads FSSAI/Food License docs.
2.  **Pending Verification**: Owner submits. Profile is locked.
3.  **Admin Review**: Admin reviews docs via Admin API.
4.  **Verified**: Profile unlocks. Owner can draw delivery polygons and build menus.
5.  **Active**: Owner toggles `isOpen = true`. System validates if a minimum of 1 item exists and a delivery zone is defined before publishing to the customer feed.

---

## 10. API Route Structure

**Customer APIs (High Traffic, Heavy Caching):**
*   `GET /api/v1/restaurants/nearby?lat=x&lng=y`
*   `GET /api/v1/restaurants/:id/menu`
*   `GET /api/v1/search?query=burger&lat=x&lng=y`

**Restaurant Owner APIs (Authenticated, RBAC):**
*   `PATCH /api/v1/owner/restaurants/status` (Toggle open/close, Panic button)
*   `POST /api/v1/owner/menus/categories`
*   `PUT /api/v1/owner/menus/items/:id` (Update price/availability)

**Admin APIs:**
*   `POST /api/v1/admin/restaurants/:id/verify`

---

## 11. Scalable Pagination Strategy

Offset pagination (`LIMIT 10 OFFSET 100`) degrades exponentially as databases grow. We strictly implement **Cursor-Based Pagination** for all customer feeds.

*   **Query**: `GET /restaurants/nearby?cursor=base64(last_id_and_score)`
*   **SQL**: `WHERE trendingScore < last_score OR (trendingScore = last_score AND id < last_id) ORDER BY trendingScore DESC, id DESC LIMIT 10`

---

## 12. File Upload Architecture (Images)

Restaurants require heavy image assets. They are NEVER stored in the database or processed synchronously.

1.  Client requests upload: `GET /owner/upload-url?filename=pizza.jpg`
2.  Service generates an **AWS S3 Pre-signed URL** and returns it.
3.  Client uploads directly to S3 (bypassing our NestJS servers to save bandwidth).
4.  S3 triggers an AWS Lambda function to generate `small`, `medium`, and `webp` optimized variants.
5.  Images are served globally via **CloudFront CDN**.

---

## 13. Validation Strategy

Using NestJS `ValidationPipe` with `class-validator`:
*   **GeoJSON Validation**: Custom decorators ensure coordinates are strictly `[-180 to 180, -90 to 90]`.
*   **Menu Constraints**: Enforce `minSelections <= maxSelections` in AddOnGroups.
*   **Price Integrity**: Custom transform interceptors ensure all incoming prices are truncated to 2 decimal places to prevent floating-point anomalies.

---

## 14. Production-Grade Performance Optimizations

1.  **Spatial Indexing**: `CREATE INDEX rest_loc_idx ON "Restaurant" USING GIST(location);` guarantees sub-10ms spatial lookups.
2.  **Cache Stampede Protection**: When a highly popular menu cache expires, 1000 users might request it simultaneously. We implement **Promise Deduping** in NestJS—if 10 requests ask for the same missing cache, only 1 database query fires, and the result is shared among all 10 incoming connections.
3.  **Read Replicas**: For customer APIs, Prisma is configured to route `findMany` queries to PostgreSQL Read Replicas, leaving the Primary DB dedicated exclusively to Owner writes and Order operations.
