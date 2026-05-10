# FluxDrop Phase 9: Mobile Applications & Real-Time User Experience Architecture

## 1. Complete Mobile Architecture

The FluxDrop mobile ecosystem consists of two distinct React Native applications built on top of **Expo**. We utilize a **Feature-Driven Architecture** (rather than separating by file type like `/components` and `/screens`), which scales infinitely better for large engineering teams.

---

## 2. Customer App & 3. Rider App Folder Structure

Both applications reside in the `apps/` directory of our Turborepo and share configurations (`eslint`, `tsconfig`) and types from the `packages/` directory.

```text
apps/mobile-customer/ (or mobile-rider)
├── src/
│   ├── app/                      # Expo Router (File-based routing)
│   │   ├── (auth)/               # Authentication stack
│   │   ├── (tabs)/               # Bottom tab navigator
│   │   └── _layout.tsx           # Global Providers
│   ├── features/                 # Feature-Driven Modules
│   │   ├── catalog/              # Restaurant & Menu feature
│   │   ├── checkout/             # Cart & Payment feature
│   │   └── tracking/             # Live tracking & WebSockets
│   ├── core/                     # Core App Infrastructure
│   │   ├── api/                  # Axios interceptors & base client
│   │   ├── socket/               # Socket.IO connection manager
│   │   └── storage/              # SecureStore wrappers
│   ├── shared/                   # Global Reusables
│   │   ├── ui/                   # Design System (Buttons, Cards)
│   │   ├── hooks/                # Global hooks (useLocation)
│   │   └── utils/                # Formatters, constants
│   └── store/                    # Zustand global slices (Cart, Auth)
├── app.json                      # Expo config
└── package.json
```

---

## 4. State Management Strategy

We strictly separate server state from client state to prevent stale data and complex reducers.

1.  **Server State (TanStack React Query)**: Handles all asynchronous API calls (`restaurants`, `orderHistory`). React Query provides out-of-the-box caching, deduping, pagination (infinite scroll), and background refetching.
2.  **Client State (Zustand)**: Handles synchronous UI state that doesn't live on the server.
    *   **Customer App**: `useCartStore` (Items, Totals), `useAuthStore` (Tokens, User Profile).
    *   **Rider App**: `useDutyStore` (Online/Offline toggle state), `useLocationStore` (Current GPS coordinates).

---

## 5. Socket.IO Mobile Architecture

Sockets must survive mobile backgrounding and network drops.

1.  **Connection Manager**: A Singleton class initializes Socket.IO with `{ transports: ['websocket'], autoConnect: false }`.
2.  **Authentication**: The socket connects *only* after a successful login, passing the JWT in the `auth` payload.
3.  **Custom Hooks**: 
    ```typescript
    const { isConnected, lastMessage } = useSocketSubscription('order.state_changed', orderId);
    ```
4.  **Reconnect Strategy**: If the app comes to the foreground from the background, the `AppState` listener explicitly calls `socket.connect()` to recover any dropped TCP connections.

---

## 6. API Layer & 7. Authentication Flow

**Authentication Flow with Transparent Token Rotation:**
1.  Tokens (Access + Refresh) are stored in `expo-secure-store` (encrypted via iOS Keychain / Android Keystore).
2.  Axios request is sent with the Access Token.
3.  If the API returns `401 Unauthorized`, an **Axios Interceptor** catches the error.
4.  The interceptor pauses all outgoing requests, calls the `/auth/refresh` endpoint using the Refresh Token, updates the SecureStore, and then replays the original paused requests transparently. The user never notices.
5.  If the refresh token fails (e.g., token revoked due to reuse detection), the interceptor forces a logout and clears Zustand state.

---

## 8. Offline-First Architecture

Mobile networks are unreliable. We design for zero-bar connectivity.

*   **Caching**: We use `@tanstack/react-query-persist-client` with `AsyncStorage`. The restaurant catalog feed is cached locally. If the app opens offline, it instantly paints the UI using the cache while showing a subtle "Offline" banner.
*   **Optimistic Updates**: When a user adds an item to the cart, the UI updates instantly *before* the server responds. If the network call fails, React Query automatically rolls back the UI.
*   **Retry Queues**: For the Rider App, if a delivery status update (`POST /delivery/picked-up`) fails due to network drop, it is saved in a local SQLite/AsyncStorage queue and re-attempted automatically when `NetInfo.isConnected` becomes true.

---

## 9. Real-Time Tracking Implementation (Customer)

1.  The `TrackingScreen` queries React Query for the `Order` data.
2.  It mounts `<MapView>` and sets the destination marker.
3.  It invokes `useSocketSubscription` to join the tracking room.
4.  As socket events arrive with `[lat, lng]`, the Rider marker uses `AnimatedRegion` from `react-native-maps` to smoothly interpolate (slide) across the screen rather than jump discontinuously.

---

## 10. Push Notification Architecture (FCM + Expo)

1.  **FCM via Expo Push**: We use `expo-notifications`.
2.  **Foreground Handling**: If a notification arrives while the app is open (e.g., "Rider Assigned"), it is suppressed from the OS notification tray and routed to a Zustand toast dispatcher to show an in-app banner.
3.  **Deep Linking**: Expo Router handles deep linking. A notification payload `{ route: '/order/123/track' }` will wake the app and instantly push the tracking screen onto the navigation stack.

---

## 11. Maps & Geolocation Architecture (Rider)

The Rider App requires robust, continuous background tracking.

1.  **Background Location**: We use `expo-location` and `expo-task-manager`.
2.  **Task Registration**: When the rider goes "Online", we register a background task `RIDER_LOCATION_TRACKING`.
3.  **Telemetry Batching**: To preserve rider battery life, we don't fire an HTTP request every second. The OS wakes the task every 10 meters. We push the coordinates to an array. Every 5 seconds, a batch HTTP POST/Socket payload is fired to the backend.
4.  **Permissions**: Strict handling of `FOREGROUND_SERVICE` (Android) and `Always Allow` (iOS) location permissions with educational UI prompts prior to requesting.

---

## 12. Performance Optimization Strategy

1.  **List Virtualization**: Using `@shopify/flash-list` instead of standard `FlatList` for the restaurant catalog to maintain 60 FPS scrolling while recycling views.
2.  **Image Optimization**: Using `expo-image` (which supports WebP, disk caching, and blurhash placeholders) instead of standard React Native `<Image>`.
3.  **Re-render Minimization**: Using Zustand selectors `useCartStore(state => state.totalCount)` to ensure a component only re-renders if the exact primitive it watches changes, not when the whole store updates.

---

## 13. Error Handling & Retry Flow

1.  **Global Error Boundary**: Wraps the entire `_layout.tsx`. If a JS exception occurs, it catches the crash and displays a branded "Something went wrong" screen with a "Reload App" button.
2.  **Network Boundaries**: Every screen uses React Query's `isError` state to render skeleton loaders or error states gracefully.

---

## 14. Testing Strategy

1.  **Unit Testing**: Jest + React Native Testing Library for all UI components and Zustand store logic.
2.  **API Mocking**: Mock Service Worker (MSW) intercepts network requests during tests to return deterministic JSON responses.
3.  **E2E Testing**: **Maestro** (replacing Detox) for mobile UI automation. It runs through the full golden path: Login -> Search -> Add to Cart -> Checkout.

---

## 15. Production-Grade Mobile CI/CD (EAS)

We utilize **Expo Application Services (EAS)** for our DevOps pipeline.

*   **Environments**: `development`, `preview` (Staging), and `production`.
*   **EAS Build**: GitHub Actions triggers EAS to compile the `.ipa` (iOS) and `.aab` (Android) binaries in the cloud.
*   **EAS Update (Over-The-Air)**: For critical bug fixes (e.g., a crash on the checkout screen), we push an OTA update via `eas update`. The React Native JS bundle downloads silently in the background, fixing the app without requiring users to wait for Apple/Google App Store review processes.
