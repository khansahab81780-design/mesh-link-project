import React from 'react';
import type { Peer } from '../types/mesh';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface NetworkGraphProps {
  devices?: Peer[];
  adjacencyList?: Map<string, string[]>;
  demoRoute?: string[];
  demoActiveHop?: number;
  onDeviceClick?: (deviceId: string) => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const VIEWBOX = 100;            // SVG viewBox width/height
const NODE_R = 3.2;             // base node radius in SVG units
const YOU_R = 4.2;              // self-node radius
const LABEL_OFFSET = 5.5;       // label y offset from node center
const FONT_SIZE = 2.6;          // label font size

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function isOnDemoRoute(
  aId: string,
  bId: string,
  demoRoute: string[],
  demoActiveHop: number,
): { onRoute: boolean; isActive: boolean } {
  for (let i = 0; i < demoRoute.length - 1; i++) {
    const match =
      (demoRoute[i] === aId && demoRoute[i + 1] === bId) ||
      (demoRoute[i] === bId && demoRoute[i + 1] === aId);
    if (match) {
      return { onRoute: true, isActive: i === demoActiveHop };
    }
  }
  return { onRoute: false, isActive: false };
}

// ─────────────────────────────────────────────────────────────
// AnimatedDataPacket — moves along an SVG line
// ─────────────────────────────────────────────────────────────

interface AnimatedPacketProps {
  x1: number; y1: number;
  x2: number; y2: number;
  duration?: number; // ms
  color?: string;
}

function AnimatedPacket({ x1, y1, x2, y2, duration = 800, color = '#f59e0b' }: AnimatedPacketProps) {
  return (
    <circle r={1} fill={color} opacity={0.9}>
      <animateMotion
        dur={`${duration}ms`}
        repeatCount="indefinite"
        path={`M ${x1} ${y1} L ${x2} ${y2}`}
      />
    </circle>
  );
}

// ─────────────────────────────────────────────────────────────
// PulseRing — animated ring around a node
// ─────────────────────────────────────────────────────────────

function PulseRing({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={0.5}
      opacity={0}
    >
      <animate attributeName="r" from={r} to={r + 4} dur="1.4s" repeatCount="indefinite" />
      <animate attributeName="opacity" from={0.6} to={0} dur="1.4s" repeatCount="indefinite" />
    </circle>
  );
}

// ─────────────────────────────────────────────────────────────
// NetworkGraph
// ─────────────────────────────────────────────────────────────

export function NetworkGraph({
  devices: propDevices,
  adjacencyList: propAdjacencyList,
  demoRoute = [],
  demoActiveHop = -1,
  onDeviceClick,
  className = '',
}: NetworkGraphProps) {
  const storePeers = useMeshStore((s) => s.peers);
  const effectiveDevices = propDevices ?? storePeers;
  const effectiveAdjacency = propAdjacencyList ?? SimulationTransport.getAdjacencyList();

  // Build a Set of rendered edges to avoid duplicates
  const renderedEdges = new Set<string>();

  // ── Edge rendering ──────────────────────────────────────────

  const edges: React.ReactNode[] = [];

  effectiveDevices.forEach((device) => {
    const neighbors = effectiveAdjacency.get(device.id) ?? [];
    neighbors.forEach((neighborId) => {
      const edgeKey =
        device.id < neighborId
          ? `${device.id}__${neighborId}`
          : `${neighborId}__${device.id}`;

      if (renderedEdges.has(edgeKey)) return;
      renderedEdges.add(edgeKey);

      const neighbor = effectiveDevices.find((d) => d.id === neighborId);
      if (!neighbor) return;

      const { onRoute, isActive } = isOnDemoRoute(
        device.id,
        neighbor.id,
        demoRoute,
        demoActiveHop,
      );

      const x1 = device.position.x;
      const y1 = device.position.y;
      const x2 = neighbor.position.x;
      const y2 = neighbor.position.y;

      const strokeColor = isActive
        ? '#f59e0b'     // active relay hop: amber
        : onRoute
        ? '#f97316'     // on route but not active hop: orange
        : device.isConnected && neighbor.isConnected
        ? '#06b6d4'     // connected: cyan
        : '#374151';    // disconnected: gray-700

      const strokeOpacity = isActive ? 0.9 : onRoute ? 0.7 : device.isConnected && neighbor.isConnected ? 0.35 : 0.15;
      const strokeWidth = isActive ? 0.7 : onRoute ? 0.5 : 0.4;
      const dash = isActive ? undefined : onRoute ? '1 1' : undefined;

      edges.push(
        <g key={edgeKey}>
          <line
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            strokeDasharray={dash}
            strokeLinecap="round"
          />

          {/* Data-flow packet on active hop */}
          {isActive && (
            <>
              <AnimatedPacket x1={x1} y1={y1} x2={x2} y2={y2} duration={600} color="#f59e0b" />
              <AnimatedPacket x1={x2} y1={y2} x2={x1} y2={y1} duration={600} color="#f59e0b" />
            </>
          )}
        </g>,
      );
    });
  });

  // ── Node rendering ──────────────────────────────────────────

  const nodes = effectiveDevices.map((device) => {
    const isSelf = device.isSelf || device.isYou;
    const isOnRoute = demoRoute.includes(device.id);
    const isActiveNode =
      demoActiveHop >= 0 && demoRoute[demoActiveHop] === device.id;

    const cx = device.position.x;
    const cy = device.position.y;
    const r = isSelf ? YOU_R : NODE_R;

    // Color
    let fill: string;
    let stroke: string;
    let strokeW: number;

    if (isSelf) {
      fill = '#06b6d4';     // cyan-500
      stroke = '#22d3ee';   // cyan-400
      strokeW = 0.8;
    } else if (isActiveNode) {
      fill = '#f59e0b';     // amber
      stroke = '#fcd34d';
      strokeW = 0.8;
    } else if (isOnRoute) {
      fill = '#f97316';     // orange
      stroke = '#fb923c';
      strokeW = 0.6;
    } else if (device.isConnected) {
      fill = '#10b981';     // green-500
      stroke = '#34d399';
      strokeW = 0.4;
    } else {
      fill = '#374151';     // gray-700
      stroke = '#4b5563';
      strokeW = 0.3;
    }

    // Truncated label
    const label = isSelf ? 'YOU' : device.displayName.slice(0, 8);

    return (
      <g
        key={device.id}
        className="cursor-pointer"
        onClick={() => onDeviceClick?.(device.id)}
        aria-label={device.displayName}
        role="button"
      >
        {/* Pulse ring for connected nodes */}
        {device.isConnected && !isSelf && (
          <PulseRing cx={cx} cy={cy} r={r + 0.5} color={isOnRoute ? '#f97316' : '#10b981'} />
        )}

        {/* Stronger pulse for self */}
        {isSelf && (
          <PulseRing cx={cx} cy={cy} r={r + 1} color="#06b6d4" />
        )}

        {/* Node circle */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
          className="transition-all duration-300"
        />

        {/* Label */}
        <text
          x={cx}
          y={cy + r + LABEL_OFFSET}
          textAnchor="middle"
          fontSize={FONT_SIZE}
          fill={isSelf ? '#22d3ee' : isActiveNode ? '#fcd34d' : isOnRoute ? '#fb923c' : device.isConnected ? '#9ca3af' : '#4b5563'}
          fontWeight={isSelf ? 'bold' : 'normal'}
          className="pointer-events-none select-none"
        >
          {label}
        </text>
      </g>
    );
  });

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className={`relative w-full ${className}`}>
      {/* Legend */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 pointer-events-none">
        {[
          { color: '#06b6d4', label: 'You' },
          { color: '#10b981', label: 'Connected' },
          { color: '#374151', label: 'Offline' },
          ...(demoRoute.length > 0
            ? [{ color: '#f59e0b', label: 'Active relay' }]
            : []),
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ display: 'block' }}
        aria-label="Mesh network topology graph"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#1f2937"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />

        {/* Edges below nodes */}
        <g>{edges}</g>

        {/* Nodes above edges */}
        <g>{nodes}</g>
      </svg>

      {/* Empty state overlay */}
      {effectiveDevices.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-600 text-sm">No devices in simulation</p>
        </div>
      )}
    </div>
  );
}

export default NetworkGraph;
