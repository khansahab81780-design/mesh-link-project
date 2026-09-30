import { MapPin, Radio, Bluetooth, BluetoothOff, Wifi, Activity, Zap } from 'lucide-react';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';
import { WebBluetoothTransportClass } from '../services/mesh/WebBluetoothTransport';
import { useMemo } from 'react';
import { buildAdjacencyList } from '../utils/routing';

export default function Devices() {
  const { peers, bluetoothStatus } = useMeshStore();
  const selfDevice = SimulationTransport.getDevice(SimulationTransport.getSelfId());
  const allDevices = SimulationTransport.getAllSimulatedDevices();
  const adjList = useMemo(() => buildAdjacencyList(allDevices), [allDevices.length]);

  const activeDevices = allDevices.filter(d => d.isActive);
  const inactiveDevices = allDevices.filter(d => !d.isActive && !d.isSelf);
  const btSupported = WebBluetoothTransportClass.isSupported();

  const SignalBars = ({ strength }: { strength: number }) => {
    const bars = [25, 50, 75, 100];
    return (
      <div className="flex items-end gap-0.5 h-4">
        {bars.map((threshold, i) => (
          <div
            key={i}
            style={{ height: `${(i + 1) * 25}%` }}
            className={`w-1.5 rounded-sm ${strength >= threshold ? 'bg-green-400' : 'bg-gray-700'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 md:pb-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Radio className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nearby Devices</h1>
            <p className="text-gray-400 text-sm">{activeDevices.length} active peers in simulation</p>
          </div>
        </div>

        {/* Bluetooth Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          btSupported
            ? 'bg-blue-950/40 border-blue-800/50'
            : 'bg-orange-950/40 border-orange-800/50'
        }`}>
          {btSupported ? (
            <Bluetooth className="text-blue-400 flex-shrink-0" size={20} />
          ) : (
            <BluetoothOff className="text-orange-400 flex-shrink-0" size={20} />
          )}
          <div>
            <div className={`text-sm font-semibold ${btSupported ? 'text-blue-300' : 'text-orange-300'}`}>
              {btSupported ? 'Web Bluetooth Available (Experimental)' : 'Web Bluetooth Not Supported'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {btSupported
                ? 'Chrome/Edge on desktop or Android. Cannot run in background. Use Simulation mode for full demo.'
                : 'Your browser does not support Web Bluetooth. Using Simulation Mode instead.'}
            </div>
          </div>
        </div>

        {/* Your Device */}
        {selfDevice && (
          <div className="bg-cyan-950/30 border border-cyan-700/40 rounded-xl p-4">
            <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin size={12} />
              Your Device
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-bold text-cyan-300">YOU</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{selfDevice.id}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Position: ({selfDevice.position.x.toFixed(0)}m, {selfDevice.position.y.toFixed(0)}m)
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">BT Range</div>
                <div className="text-lg font-bold text-cyan-400">{selfDevice.bluetoothRange}m</div>
                <div className="text-xs text-green-400 mt-1">● Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Active Peers */}
        <div>
          <h2 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wifi size={12} />
            Active Peers ({activeDevices.filter(d => !d.isSelf).length})
          </h2>
          <div className="space-y-2">
            {activeDevices
              .filter(d => !d.isSelf && !d.isYou)
              .sort((a, b) => a.hopsAway - b.hopsAway)
              .map(device => {
                const neighbors = adjList.get(device.id) || [];
                const isDirectNeighbor = (adjList.get(SimulationTransport.getSelfId()) || []).includes(device.id);
                return (
                  <div
                    key={device.id}
                    className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            isDirectNeighbor ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {device.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                            device.isConnected ? 'bg-green-400' : 'bg-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-white">{device.displayName}</div>
                          <div className="text-xs text-gray-500 font-mono">{device.id}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {isDirectNeighbor ? (
                              <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded">Direct</span>
                            ) : (
                              <span className="text-xs bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">{device.hopsAway > 0 ? `${device.hopsAway} hops` : 'Unreachable'}</span>
                            )}
                            <span className="text-xs text-gray-600">{neighbors.length} neighbors</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <SignalBars strength={device.signalStrength} />
                        <div className="text-xs text-gray-500">{device.bluetoothRange}m range</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Inactive/Disconnected Peers */}
        {inactiveDevices.length > 0 && (
          <div>
            <h2 className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity size={12} />
              Inactive Nodes ({inactiveDevices.length})
            </h2>
            <div className="space-y-2">
              {inactiveDevices.map(device => (
                <div key={device.id} className="bg-gray-950 border border-gray-800/50 rounded-xl p-3 opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-600">
                        {device.displayName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">{device.displayName}</div>
                        <div className="text-xs text-gray-700 font-mono">{device.id}</div>
                      </div>
                    </div>
                    <span className="text-xs text-red-500">Offline</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Future BLE note */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Future Native BLE Mode</span>
          </div>
          <p className="text-xs text-gray-500">
            The future native Android/iOS MeshLink app will show real nearby Bluetooth devices here,
            automatically discover MeshLink peers via BLE advertising, and relay messages in the background
            even when the screen is off.
          </p>
        </div>
      </div>
    </div>
  );
}
