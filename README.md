# MeshLink

> **"Communicate when the Internet can't."**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/tests-16%20passed-brightgreen.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-offline%20ready-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

MeshLink is a peer-to-peer, store-and-forward communication platform designed for scenarios where cellular and internet infrastructure fails—natural disasters, extreme network congestion, remote areas, protests, or power grid blackouts. 

---

## Technical Reality & Platform Boundaries

A standard browser website cannot reliably maintain a background BLE mesh network due to browser sandbox restrictions, mobile OS background process limits, and the lack of BLE peripheral/advertising mode in web APIs.

MeshLink solves this by maintaining three honest, transparent operational modes:

| Mode | Capability | Status | Target Environment |
|---|---|---|---|
| **Browser Simulation Mode** | Full visual mesh routing, store-and-forward, packet loss, stress testing, 5m–30m range modeling | **Production Ready** | All modern browsers (desktop & mobile) |
| **Web Bluetooth Mode** | Point-to-point BLE GATT connection via Chrome/Edge Web Bluetooth API | **Experimental** | Secure context (HTTPS / localhost), Chromium browsers |
| **Native BLE Mesh Mode** | Background advertising, peripheral mode, continuous neighbor discovery, hardware sleep relaying | **Roadmap** | Android (Kotlin / BLE Mesh SDK) & iOS (CoreBluetooth) |

---

## Key Features

- **Store-and-Forward Routing**: Multi-hop packet propagation with dynamic Breadth-First-Search (BFS) path finding, hop count increment, and Time-To-Live (TTL) decrements.
- **Zero-Loop Deduplication**: Persistent `processedMessageIds` cache in IndexedDB and memory ensuring packets are never re-broadcast in infinite loops.
- **Cryptographic Security**: End-to-end encryption using authenticated AES-GCM-256 and ECDSA P-256 digital signatures via Web Crypto API. Relay nodes forward ciphertexts without being able to inspect message contents.
- **Full Offline PWA**: Cached application shell, IndexedDB local storage (`idb`), Service Worker offline interception, and queued transmissions.
- **Interactive Mesh Simulator**: Real-time SVG topology visualization with animated data packets, device drag/repositioning, distance-based connection math, network partition simulation, and 100-node stress testing.
- **Emergency Broadcast Mode**: Zero-hop target emergency beacons ("Need medical assistance at Gate 2") propagating across all reachable cluster nodes.
- **Ephemeral Anonymous Identity**: Cryptographically generated persistent anonymous IDs (`ML-XXXXXX`) with optional user display names. No phone numbers, emails, or personal data required.

---

## Store-and-Forward Protocol

Every packet is packaged with strict routing metadata:

```json
{
  "messageId": "MSG-LX83F2-9A4B1C",
  "senderId": "ML-7F3A9C",
  "destinationId": "ML-B2E841",
  "timestamp": 1774900000000,
  "ttl": 10,
  "hopCount": 2,
  "payload": "{\"iv\":\"...\",\"ciphertext\":\"...\"}",
  "route": ["ML-7F3A9C", "ML-1A90E3", "ML-B2E841"],
  "status": "delivered",
  "expiresAt": 1774903600000,
  "isBroadcast": false
}
```

### Relaying Rules:
1. **Deduplication**: If `messageId` exists in `processedMessageIds`, silently drop.
2. **TTL Check**: If `ttl <= 0` or `Date.now() > expiresAt`, discard.
3. **Hop Count**: Increment `hopCount`, decrement `ttl`, append current node ID to `route`.
4. **Relay**: Forward payload to eligible neighboring peers within current Bluetooth transmission range (5m, 10m, 20m, 30m).

---

## Application Structure & Routes

- `/` — **Welcome Screen**: Hero branding, operational disclaimers, and entry points.
- `/dashboard` — **Command Center**: Real-time connectivity badges (Internet, Bluetooth, Mesh, Peers, Battery), interactive mini-graph, recent messages, and one-click animated demo route.
- `/chat` — **Direct & Broadcast Messaging**: Unicast peer messaging, emergency broadcast channel, configurable TTL (5/10/20/50), hop route inspection, and delivery statuses.
- `/network` — **Topology & Diagnostics**: Full-screen live graph, cluster partition simulation, reachability percentages, and adjacency matrix.
- `/simulator` — **Mesh Laboratory**: Dynamic node generation (10/25/50/100 nodes), range adjustments, failure simulations, and 100-packet stress testing.
- `/devices` — **Peer Discovery**: Detected devices, RSSI signal indicators, hop distances, and BLE connection requests.
- `/settings` — **Node Configuration**: Anonymous ID management, default TTL, expiration intervals, transmission delays, and data wipe.
- `/about` — **Architecture & Whitepaper**: In-depth explanations of the BLE mesh protocol, Web Bluetooth limitations, cryptographic protections, and native migration plan.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/meshlink.git
cd meshlink

# Install dependencies
npm install

# Run Vitest test suite
npm test

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Technology Stack

- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 (with `@tailwindcss/vite`)
- **State Management**: Zustand with persistent storage
- **Offline Storage**: IndexedDB (via `idb`) + Cache API + Service Worker
- **Cryptography**: Web Crypto API (SubtleCrypto: AES-GCM-256 + ECDSA P-256)
- **Icons**: Lucide React
- **Testing**: Vitest

---

## Deployment

The application is pre-configured for deployment on **Vercel**, **Netlify**, or **Cloudflare Pages**:

```bash
npm run build
```
Output directory: `dist/` (configured with `vercel.json` SPA rewrites).

---

## License

MIT License. Designed and engineered for resilient communication.
