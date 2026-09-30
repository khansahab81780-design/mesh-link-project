import { useState, useCallback, useEffect } from 'react';
import { Cpu, Play, SkipForward, RotateCcw, Zap, Activity, Wifi, Target } from 'lucide-react';
import { useMeshStore } from '../store/meshStore';
import { SimulationTransport } from '../services/mesh/SimulationTransport';
import { buildAdjacencyList } from '../utils/routing';
import type { SimulatedDevice } from '../types/mesh';

interface SimStats {
  coverage: number;
  avgHops: number;
  maxHops: number;
  deliveryRate: number;
  failed: number;
  duplicates: number;
  relayed: number;
  delivered: number;
}

export default function Simulator() {
  const { simulatorConfig, setSimulatorConfig, addNotification } = useMeshStore();
  const [devices, setDevices] = useState<SimulatedDevice[]>([]);
  const [stats, setStats] = useState<SimStats>({
    coverage: 0, avgHops: 0, maxHops: 0, deliveryRate: 0,
    failed: 0, duplicates: 0, relayed: 0, delivered: 0
  });
  const [isRunning, setIsRunning] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [stressResults, setStressResults] = useState<string[]>([]);

  const DEVICE_COUNTS = [10, 25, 50, 100];
  const RANGE_OPTIONS = [5, 10, 20, 30];

  const generateNetwork = useCallback(() => {
    const d = SimulationTransport.generateSimulatedNetwork(
      simulatorConfig.deviceCount,
      simulatorConfig.bluetoothRange,
      simulatorConfig.areaSize
    );
    setDevices(d);
    refreshStats();
    addNotification('info', `Network generated: ${simulatorConfig.deviceCount} devices, ${simulatorConfig.bluetoothRange}m range`);
  }, [simulatorConfig]);

  const refreshStats = () => {
    const s = SimulationTransport.getNetworkStats();
    setStats(prev => ({
      ...prev,
      coverage: s.coveragePercent,
      avgHops: s.averageHops,
      relayed: s.messagesRelayed,
      delivered: s.messagesDelivered,
      failed: s.messagesFailed,
      duplicates: s.duplicateMessages,
      deliveryRate: s.messagesDelivered + s.messagesFailed > 0
        ? Math.round(s.messagesDelivered / (s.messagesDelivered + s.messagesFailed) * 100)
        : 0,
    }));
  };

  const sendTestMessage = useCallback(async () => {
    setTestInProgress(true);
    const devs = SimulationTransport.getAllSimulatedDevices();
    const selfId = SimulationTransport.getSelfId();
    const targets = devs.filter(d => d.id !== selfId && d.isActive);
    if (targets.length === 0) {
      addNotification('warning', 'No active targets. Generate a network first.');
      setTestInProgress(false);
      return;
    }
    const target = targets[Math.floor(Math.random() * targets.length)];
    await SimulationTransport.sendMeshMessage(target.id, 'Test message ' + Date.now(), 10, 60);
    setTimeout(() => {
      refreshStats();
      setTestInProgress(false);
      addNotification('success', `Test message sent to ${target.displayName}`);
    }, 3000);
  }, []);

  const disableRandom = useCallback(() => {
    const count = Math.max(1, Math.floor(SimulationTransport.getAllSimulatedDevices().length * 0.2));
    SimulationTransport.disableRandomNodes(count);
    refreshStats();
    addNotification('warning', `Disabled ${count} random nodes`);
  }, []);

  const resetAll = useCallback(() => {
    SimulationTransport.resetNetwork();
    setStressResults([]);
    setStats({ coverage: 0, avgHops: 0, maxHops: 0, deliveryRate: 0, failed: 0, duplicates: 0, relayed: 0, delivered: 0 });
    addNotification('info', 'Network reset');
  }, []);

  const runStressTest = useCallback(async () => {
    setIsRunning(true);
    setStressResults(['🔄 Starting stress test...']);
    const results: string[] = [];
    const messageCount = Math.min(simulatorConfig.deviceCount, 20);

    for (let i = 0; i < messageCount; i++) {
      const devs = SimulationTransport.getAllSimulatedDevices();
      const selfId = SimulationTransport.getSelfId();
      const targets = devs.filter(d => d.id !== selfId && d.isActive);
      if (targets.length === 0) break;
      const target = targets[Math.floor(Math.random() * targets.length)];
      try {
        await SimulationTransport.sendMeshMessage(target.id, `Stress test #${i + 1}`, 10, 60);
        results.push(`✅ Message ${i + 1}/${messageCount} → ${target.displayName}`);
      } catch {
        results.push(`❌ Message ${i + 1}/${messageCount} FAILED`);
      }
      setStressResults([...results]);
      await new Promise(r => setTimeout(r, 200));
    }

    await new Promise(r => setTimeout(r, 3000));
    const s = SimulationTransport.getNetworkStats();
    results.push('');
    results.push(`📊 Final Results:`);
    results.push(`   Delivered: ${s.messagesDelivered}`);
    results.push(`   Failed: ${s.messagesFailed}`);
    results.push(`   Relayed: ${s.messagesRelayed}`);
    results.push(`   Duplicates: ${s.duplicateMessages}`);
    results.push(`   Coverage: ${s.coveragePercent}%`);
    setStressResults([...results]);
    refreshStats();
    setIsRunning(false);
    addNotification('success', 'Stress test complete!');
  }, [simulatorConfig.deviceCount]);

  useEffect(() => {
    generateNetwork();
  }, []);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(refreshStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: 'Network Coverage', value: `${stats.coverage}%`, color: stats.coverage > 70 ? 'text-green-400' : stats.coverage > 40 ? 'text-orange-400' : 'text-red-400', icon: <Wifi size={16} /> },
    { label: 'Avg Hop Count', value: stats.avgHops.toFixed(1), color: 'text-cyan-400', icon: <Activity size={16} /> },
    { label: 'Delivery Rate', value: `${stats.deliveryRate}%`, color: stats.deliveryRate > 80 ? 'text-green-400' : 'text-orange-400', icon: <Target size={16} /> },
    { label: 'Msgs Relayed', value: stats.relayed, color: 'text-blue-400', icon: <Zap size={16} /> },
    { label: 'Delivered', value: stats.delivered, color: 'text-green-400', icon: <Cpu size={16} /> },
    { label: 'Failed', value: stats.failed, color: 'text-red-400', icon: <SkipForward size={16} /> },
    { label: 'Duplicates', value: stats.duplicates, color: 'text-yellow-400', icon: <RotateCcw size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pb-24 md:pb-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <Cpu className="text-purple-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mesh Simulator</h1>
            <p className="text-gray-400 text-sm">Test and visualize mesh network behavior</p>
          </div>
        </div>

        {/* Config Panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Network Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Count */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Number of Devices</label>
              <div className="flex gap-2">
                {DEVICE_COUNTS.map(count => (
                  <button
                    key={count}
                    onClick={() => setSimulatorConfig({ deviceCount: count })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      simulatorConfig.deviceCount === count
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Bluetooth Range */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">Bluetooth Range</label>
              <div className="flex gap-2">
                {RANGE_OPTIONS.map(range => (
                  <button
                    key={range}
                    onClick={() => setSimulatorConfig({ bluetoothRange: range })}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      simulatorConfig.bluetoothRange === range
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {range}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Area info */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Wifi size={12} />
            <span>Simulation area: 100m × 100m | Devices placed randomly</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateNetwork}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
            >
              <Activity size={16} />
              Generate Network
            </button>
            <button
              onClick={sendTestMessage}
              disabled={testInProgress || isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
            >
              <Play size={16} />
              {testInProgress ? 'Sending...' : 'Send Test Message'}
            </button>
            <button
              onClick={disableRandom}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
            >
              <SkipForward size={16} />
              Disable Random Nodes
            </button>
            <button
              onClick={resetAll}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              onClick={runStressTest}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-all disabled:opacity-50"
            >
              <Zap size={16} />
              {isRunning ? 'Running...' : 'Run Stress Test'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((card) => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                {card.icon}
                <span className="text-xs">{card.label}</span>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          ))}

          {/* Total devices */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 mb-2">
              <Cpu size={16} />
              <span className="text-xs">Active Devices</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {SimulationTransport.getAllSimulatedDevices().filter(d => d.isActive).length}
            </div>
          </div>
        </div>

        {/* Stress Test Results */}
        {stressResults.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
              <Zap size={14} />
              Stress Test Log
            </h2>
            <div className="font-mono text-xs text-gray-300 space-y-0.5 max-h-64 overflow-y-auto">
              {stressResults.map((line, i) => (
                <div key={i} className={line.startsWith('✅') ? 'text-green-400' : line.startsWith('❌') ? 'text-red-400' : line.startsWith('📊') ? 'text-cyan-400 font-bold mt-2' : line.startsWith('   ') ? 'text-gray-400 pl-2' : 'text-gray-300'}>
                  {line || '\u00A0'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info note */}
        <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4 text-xs text-blue-300">
          <strong>Simulation Mode:</strong> All network behavior is simulated in-browser. Device positions, Bluetooth ranges, and message routing are computed locally. This demonstrates the mesh algorithm concept. For real BLE mesh, the future native Android application is required.
        </div>
      </div>
    </div>
  );
}
