# FluxDrop Phase 7: Delivery Service, Rider Dispatch & Real-Time Tracking Architecture

## 1. Complete Delivery Service Architecture

The **Delivery Service** is a highly concurrent, real-time logistics engine. It bridges the gap between the static world of Orders and the physical world of moving Riders. It relies heavily on in-memory geospatial indexes (Redis) for rapid dispatch and horizontally scaled WebSockets (Socket.IO) for live telemetry streaming.

---

## 2. Rider Dispatch System Design & 5. Assignment Algorithm

**The Dispatch Flow:**
When the Order Service emits `order.confirmed`, the Delivery Service initiates the dispatch sequence.

1. **Candidate Selection**: Query Redis `GEOSEARCH` to find all `ONLINE` riders within a 3km radius of the restaurant coordinates.
2. **Filtering**: Filter out riders who are currently `IN_TRANSIT` with a full capacity (no batching possible) or have recently rejected this specific order.
3. **Scoring**: Rank remaining riders based on a heuristic score:
   - Proximity to restaurant (Straight-line distance / Estimated road distance).
   - Current direction of travel (Are they heading towards or away from the restaurant?).
   - Rider performance metrics (Batching compatibility).
4. **Broadcast Request**: The highest-scoring rider receives a highly ephemeral `rider.assignment_requested` event via Socket.IO (fallback to FCM push notification).
5. **Countdown**: A Redis TTL lock is set for 30 seconds.
6. **Resolution**: If the rider accepts, the state advances. If they reject or the TTL expires, the system automatically loops back to step 4 for the next candidate.

---

## 3. Real-Time Tracking & 4. Socket.IO Scaling Architecture

**Socket.IO Scaling:**
Node.js processes can only handle a finite number of active TCP connections. We use the **Redis Pub/Sub Adapter** (`@socket.io/redis-adapter`) to scale horizontally across multiple Kubernetes pods.

**Room Structure:**
*   `room:rider:{riderId}`: Private room for sending dispatch requests to a specific rider.
*   `room:order:{orderId}:tracking`: The room a customer joins when they open the live tracking screen.

**The Telemetry Loop:**
1. Rider App emits `location_update` (Lat, Lng, Heading, Speed) every 5 seconds to their connected Socket.IO node.
2. Node validates the JWT and updates the rider's coordinates in Redis (`GEOADD`).
3. Node asynchronously saves the raw telemetry to MongoDB for history.
4. Node broadcasts the location to `room:order:{orderId}:tracking`.
5. Customer App instantly receives the update and smoothly animates the car marker.

---

## 6. Geospatial Architecture & 9. Redis Real-Time Strategy

PostgreSQL is too slow for sub-second, highly volatile location updates of thousands of moving riders. 

**Redis Strategy:**
*   **Active Riders Geo-Set**: `GEOADD riders:online {lng} {lat} {riderId}`. Updated every 5 seconds.
*   **Rider Session State**: `HSET rider_state:{riderId} status "IN_TRANSIT" currentOrderId "123"`.
*   When a rider goes offline or closes the app, a Socket.IO disconnect handler removes them from the `riders:online` Geo-set to prevent ghost dispatching.

---

## 7. Prisma Schema Structure (PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [postgis]
}

enum RiderStatus {
  OFFLINE
  ONLINE_IDLE
  ASSIGNED
  ARRIVED_RESTAURANT
  IN_TRANSIT
}

enum DeliveryState {
  ASSIGNMENT_PENDING
  RIDER_ASSIGNED
  RIDER_ACCEPTED
  ARRIVED_RESTAURANT
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  DELIVERY_FAILED
  CANCELLED
}

model Rider {
  id              String         @id @default(uuid())
  userId          String         @unique // Reference to Auth/User service
  status          RiderStatus    @default(OFFLINE)
  vehicleType     String         // "BIKE", "SCOOTER"
  capacity        Int            @default(1)
  
  assignments     DeliveryAssignment[]
  sessions        RiderSession[]
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model DeliveryOrder {
  id              String         @id // Matches the core OrderID
  restaurantId    String
  customerLat     Float
  customerLng     Float
  restaurantLat   Float
  restaurantLng   Float
  status          DeliveryState  @default(ASSIGNMENT_PENDING)
  
  assignments     DeliveryAssignment[]
  statusHistory   DeliveryStatusHistory[]
}

model DeliveryAssignment {
  id              String         @id @default(uuid())
  deliveryOrderId String
  deliveryOrder   DeliveryOrder  @relation(fields: [deliveryOrderId], references: [id])
  riderId         String
  rider           Rider          @relation(fields: [riderId], references: [id])
  
  status          String         // "REQUESTED", "ACCEPTED", "REJECTED"
  assignedAt      DateTime       @default(now())
  respondedAt     DateTime?
}

model DeliveryStatusHistory {
  id              String         @id @default(uuid())
  deliveryOrderId String
  deliveryOrder   DeliveryOrder  @relation(fields: [deliveryOrderId], references: [id])
  status          DeliveryState
  createdAt       DateTime       @default(now())
}
```

---

## 8. MongoDB Tracking Collections

Used for High-Velocity Telemetry, debugging bad routes, and resolving customer dispute claims ("Rider never arrived").

```javascript
// LocationTelemetry Collection
{
  _id: ObjectId("..."),
  riderId: "uuid-123",
  orderId: "uuid-456",
  location: {
    type: "Point",
    coordinates: [77.5946, 12.9716] // Lng, Lat
  },
  heading: 145.2,
  speedKmh: 42.5,
  timestamp: ISODate("2026-05-09T18:00:00Z"),
  batteryLevel: 85
}
// Indexed on { orderId: 1, timestamp: -1 }
// Geospatial Index on { location: "2dsphere" }
```

---

## 10. ETA Calculation Architecture

ETA is a combination of static preparation time and dynamic travel time.

1. **Initial ETA (Checkout)**: `Restaurant.prepTime` + (Straight-line distance * Routing Multiplier / Average Speed).
2. **Dynamic Recalculation**: Once `IN_TRANSIT`, the Delivery Service queries a Map Provider (Google Maps / OSRM / Mapbox Directions API) for live traffic estimates.
3. **Caching**: We cache the Map Provider route polyline and ETA in Redis `eta:{orderId}` for 60 seconds to prevent massive API billing costs from calling Google Maps every 5 seconds. We extrapolate the ETA client-side based on distance traveled along the polyline.

---

## 11. Delivery Lifecycle State Machine

1. `ASSIGNMENT_PENDING`: Waiting for algorithm to find rider.
2. `RIDER_ASSIGNED`: Request sent, 30s timer ticking.
3. `RIDER_ACCEPTED`: Rider accepts. Emits `rider.assigned` to Order Saga.
4. `ARRIVED_RESTAURANT`: Geo-fenced trigger (rider is within 100m of restaurant).
5. `PICKED_UP`: Rider swipes to confirm pickup. Emits `delivery.started`.
6. `IN_TRANSIT`: Moving to customer. Live tracking active.
7. `DELIVERED`: Geo-fenced trigger + Rider swipe + optional OTP verification. Emits `delivery.completed`.

---

## 12. Failure Recovery & Reassignment Flow

*   **Rider Inactivity**: Background worker checks Redis. If a rider hasn't emitted a location update in 5 minutes, they are marked `OFFLINE`, and their active `REQUESTED` assignments are failed.
*   **Reassignment**: If a rider accepts but gets a flat tire (manual reassignment via Support), the current `DeliveryOrder` state is rewound to `ASSIGNMENT_PENDING`, the old rider is marked `ONLINE_IDLE`, and the dispatch algorithm re-triggers immediately.
*   **Delivery Timeout**: If `ASSIGNMENT_PENDING` lasts > 15 minutes, a `delivery.failed` event is sent to the Order Saga, triggering compensation (Cancel Order, Refund User, Stop Kitchen).

---

## 13. Event-Driven Logistics Communication (RabbitMQ)

*   **Consumes**: `order.confirmed` (Starts Dispatch), `order.cancelled` (Aborts Dispatch/Tells rider to return food).
*   **Produces**: 
    *   `rider.assigned`: Tells Order Service to update UI status.
    *   `delivery.started`: Triggers Notification Service (Customer SMS: "Rider is on the way!").
    *   `delivery.completed`: Closes the Order Saga, unlocks payment funds.

---

## 14. API Route Structure

**Customer APIs:**
*   `GET /api/v1/deliveries/:orderId/tracking` (Returns current ETA, Rider details, Socket room auth token)

**Rider APIs (Mostly handled via WebSocket, fallback REST):**
*   `POST /api/v1/rider/status` (Go Online/Offline)
*   `POST /api/v1/rider/assignments/:id/accept`
*   `POST /api/v1/rider/deliveries/:id/state` (Update state to Picked Up / Delivered)

**Admin APIs:**
*   `GET /api/v1/admin/logistics/active-riders` (Returns GeoJSON of all online riders for admin map view)
*   `POST /api/v1/admin/deliveries/:id/reassign`

---

## 15. Production-Grade Logistics Engineering Practices

1.  **Geo-Fencing Strictness**: The `DELIVERED` and `PICKED_UP` state changes are strictly validated server-side. The system checks if the Rider's last known Redis location is within a ~150-meter radius of the destination. If not, the state change is rejected to prevent riders from fraudulently completing orders early.
2.  **Socket.IO Reconnection Buffer**: Mobile internet drops frequently (e.g., Rider enters an elevator). When the socket disconnects, we do *not* instantly fail the delivery. We give a 60-second grace period. When they reconnect, the Socket.IO client sends the buffered location payloads (timestamped) to ensure MongoDB gets a contiguous path history.
3.  **Delivery OTPs**: For high-value orders or bad neighborhoods, the system generates a 4-digit PIN in Redis. The delivery cannot transition to `DELIVERED` unless the Rider API payload includes the PIN verbally given by the customer.
