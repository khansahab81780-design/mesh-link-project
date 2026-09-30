import { Network, Bluetooth, Shield, Zap, AlertTriangle, Globe, Smartphone } from 'lucide-react';

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
    <div className="text-gray-400 text-sm leading-relaxed space-y-2">{children}</div>
  </div>
);

export default function About() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 md:pb-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-6 pb-4">
          <div className="inline-flex p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 mb-4">
            <Network className="text-cyan-400" size={36} />
          </div>
          <h1 className="text-3xl font-bold text-white">About MeshLink</h1>
          <p className="text-gray-400 mt-2">Understanding the technology behind decentralized communication</p>
        </div>

        <Section icon={<Network className="text-cyan-400" size={20} />} title="What is MeshLink?">
          <p>MeshLink is a proof-of-concept peer-to-peer communication platform designed for scenarios where normal Internet or cellular connectivity is unavailable — such as natural disasters, infrastructure outages, crowded venues, or remote areas.</p>
          <p>Instead of relying on centralized servers, MeshLink routes messages through nearby devices using Bluetooth Low Energy (BLE), forming a self-healing mesh network where each device acts as both a sender and a relay.</p>
        </Section>

        <Section icon={<Globe className="text-blue-400" size={20} />} title="Why can the Internet become unavailable?">
          <p><strong className="text-white">Network congestion:</strong> At large events (concerts, stadiums, disasters), cellular towers become overwhelmed when thousands of devices simultaneously connect.</p>
          <p><strong className="text-white">Infrastructure damage:</strong> Earthquakes, floods, or power outages can take down cell towers, fiber lines, and data centers simultaneously.</p>
          <p><strong className="text-white">Remote areas:</strong> Many parts of the world have limited or no cellular coverage, making Internet-dependent communication impossible.</p>
          <p>MeshLink is designed to operate in all of these conditions using only device-to-device Bluetooth communication.</p>
        </Section>

        <Section icon={<Bluetooth className="text-blue-400" size={20} />} title="How does Bluetooth relay work?">
          <p>In a traditional communication model, messages go: <strong className="text-white">Your device → Cell tower → Server → Recipient</strong>. This requires working Internet infrastructure.</p>
          <p>MeshLink's model: <strong className="text-white">Device A → Device B → Device C → Device D</strong> (all via Bluetooth). No server required.</p>
          <p>This is called <strong className="text-white">store-and-forward</strong> networking. Each intermediate device:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Receives the message</li>
            <li>Stores it temporarily</li>
            <li>Forwards it to all reachable neighbors</li>
            <li>Decrements the TTL (Time-To-Live) counter</li>
          </ul>
          <p>Messages can travel many hops as long as there is a continuous chain of devices within Bluetooth range.</p>
        </Section>

        <Section icon={<Zap className="text-yellow-400" size={20} />} title="What is store-and-forward communication?">
          <p>Store-and-forward is a communication technique where the transmitting device sends a message to an intermediate relay that stores it until it can forward it to the next hop.</p>
          <p>Each MeshLink message contains:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">messageId</strong> — Unique ID for deduplication</li>
            <li><strong className="text-white">TTL</strong> — Maximum number of hops allowed</li>
            <li><strong className="text-white">hopCount</strong> — How many hops so far</li>
            <li><strong className="text-white">route</strong> — Path taken through the network</li>
            <li><strong className="text-white">expiresAt</strong> — Timestamp after which message is discarded</li>
          </ul>
          <p>This prevents messages from circulating forever and ensures network resources are used efficiently.</p>
        </Section>

        <Section icon={<AlertTriangle className="text-orange-400" size={20} />} title="Browser Bluetooth limitations">
          <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg p-3 mb-3">
            <p className="text-orange-300 font-semibold text-sm">⚠️ This browser application is a simulation, not a full BLE mesh.</p>
          </div>
          <p>Web Bluetooth (the browser API) has these fundamental limitations:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Cannot run in the background — requires browser tab to remain open</li>
            <li>Cannot advertise BLE — other devices cannot discover you automatically</li>
            <li>Not supported in Firefox, Safari, most mobile browsers</li>
            <li>Requires user interaction to connect (security requirement)</li>
            <li>Limited to 1-2 direct connections at a time</li>
            <li>No support for BLE mesh protocols (e.g., Bluetooth Mesh)</li>
          </ul>
          <p className="text-gray-300">The current application runs a realistic <strong>in-browser simulation</strong> of how the mesh would behave on native hardware.</p>
        </Section>

        <Section icon={<Shield className="text-green-400" size={20} />} title="Security model">
          <p>MeshLink is designed with privacy and security as core principles:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Messages are encrypted using <strong className="text-white">AES-GCM 256-bit</strong> authenticated encryption</li>
            <li>Device identity uses <strong className="text-white">ECDSA P-256</strong> key pairs for signing</li>
            <li>Relay devices forward encrypted payloads <strong className="text-white">without reading message contents</strong></li>
            <li>No real names, phone numbers, or GPS coordinates required</li>
            <li>Anonymous device IDs (e.g., ML-7F3A9C) used for routing</li>
            <li>Private keys stored in IndexedDB, never transmitted</li>
          </ul>
        </Section>

        <Section icon={<Smartphone className="text-purple-400" size={20} />} title="Future native Android/iOS architecture">
          <p>The future native mobile application will provide what the browser cannot:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">BLE Advertising</strong> — Broadcast device presence to nearby peers</li>
            <li><strong className="text-white">BLE Scanning</strong> — Continuously discover nearby MeshLink devices</li>
            <li><strong className="text-white">Background operation</strong> — Relay messages even when app is minimized</li>
            <li><strong className="text-white">Bluetooth Mesh</strong> — Support for BT Mesh specification</li>
            <li><strong className="text-white">Multi-hop relay</strong> — Automatic store-and-forward across chains of devices</li>
          </ul>
          <p>The web frontend code (React components, routing logic, message format, crypto layer) is designed to be reusable in a React Native application with only the transport layer replaced by <code className="bg-gray-800 px-1 rounded text-cyan-300">NativeBLETransport</code>.</p>
        </Section>

        {/* Disclaimer */}
        <div className="text-center text-xs text-gray-600 pb-6">
          <p>MeshLink v1.0 — Browser Prototype</p>
          <p className="mt-1">The browser prototype demonstrates the concept. Full peer-to-peer background BLE mesh requires native mobile capabilities.</p>
        </div>
      </div>
    </div>
  );
}
