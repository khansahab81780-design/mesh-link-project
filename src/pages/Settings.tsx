/**
 * Settings.tsx — MeshLink Settings Page
 *
 * Device identity, network configuration, transport mode,
 * danger zone actions, and about section.
 */

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Bluetooth,
  Radio,
  Clock,
  Sliders,
  Trash2,
  RotateCcw,
  Info,
  Zap,
  Save,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useMeshStore } from '../store/meshStore';
import { WebBluetoothTransportClass } from '../services/mesh/WebBluetoothTransport';
import type { TTLSetting, ExpirationSetting, BluetoothRangeSetting, TransportMode } from '../types/mesh';

// ── helpers ──────────────────────────────────────────────────────────────────

const BTCapability = WebBluetoothTransportClass.checkCapability();

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-cyan-400" />
      <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-white/10 rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-400 text-sm mb-2">{children}</p>;
}

function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  formatLabel,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  formatLabel?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            value === opt
              ? 'bg-cyan-500 text-gray-950'
              : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
          }`}
        >
          {formatLabel ? formatLabel(opt) : String(opt)}
        </button>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

const Settings: React.FC = () => {
  const {
    identity,
    settings,
    updateSettings,
    transportMode,
    setTransportMode,
    clearMessages,
    addNotification,
  } = useMeshStore();

  const [displayName, setDisplayName] = useState(settings.displayName || '');
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [deviceIdCopied, setDeviceIdCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setDisplayName(settings.displayName || '');
  }, [settings.displayName]);

  const saveDisplayName = () => {
    updateSettings({ displayName: displayName.trim() || identity?.deviceId || '' });
    setDisplayNameSaved(true);
    addNotification('success', 'Display name updated');
    setTimeout(() => setDisplayNameSaved(false), 2000);
  };

  const copyDeviceId = () => {
    if (identity?.deviceId) {
      navigator.clipboard.writeText(identity.deviceId).catch(() => {});
      setDeviceIdCopied(true);
      setTimeout(() => setDeviceIdCopied(false), 2000);
    }
  };

  const handleClearMessages = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    clearMessages();
    addNotification('info', 'All messages cleared');
    setConfirmClear(false);
  };

  const handleResetSettings = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    updateSettings({
      defaultTTL: 10,
      defaultExpiration: 60,
      defaultBluetoothRange: 10,
      messageDelay: 400,
      displayName: '',
    });
    addNotification('info', 'Settings reset to defaults');
    setConfirmReset(false);
  };

  const handleTransportChange = (mode: TransportMode) => {
    if (mode === 'web-bluetooth' && BTCapability !== 'full') {
      addNotification('error', 'Web Bluetooth is not supported in this browser');
      return;
    }
    setTransportMode(mode);
    addNotification('info', `Transport mode set to ${mode}`);
  };

  const expirationLabel = (v: ExpirationSetting) => {
    if (v === 10) return '10 min';
    if (v === 60) return '1 h';
    if (v === 360) return '6 h';
    return '24 h';
  };

  return (
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <SettingsIcon className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-bold text-gray-100">Settings</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">

        {/* ── Identity ── */}
        <Card>
          <SectionHeader icon={Cpu} title="Device Identity" />

          <div className="space-y-4">
            <div>
              <Label>Device ID (non-editable)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono truncate">
                  {identity?.deviceId ?? 'Not initialized'}
                </code>
                <button
                  onClick={copyDeviceId}
                  className="p-2 rounded-lg bg-gray-800 border border-white/10 text-gray-400 hover:text-cyan-400 transition-colors"
                  title="Copy Device ID"
                >
                  {deviceIdCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Display Name</Label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveDisplayName()}
                  placeholder={identity?.deviceId?.slice(0, 8) ?? 'Enter a name…'}
                  maxLength={32}
                  className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
                <button
                  onClick={saveDisplayName}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-semibold transition-colors"
                >
                  {displayNameSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {displayNameSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Network Defaults ── */}
        <Card>
          <SectionHeader icon={Radio} title="Network Defaults" />

          <div className="space-y-5">
            <div>
              <Label>Default TTL (hops)</Label>
              <SegmentedControl<TTLSetting>
                options={[5, 10, 20, 50]}
                value={settings.defaultTTL}
                onChange={(v) => updateSettings({ defaultTTL: v })}
              />
              <p className="text-xs text-gray-600 mt-2">
                Maximum number of hops before a message is dropped.
              </p>
            </div>

            <div>
              <Label>Default Expiration</Label>
              <SegmentedControl<ExpirationSetting>
                options={[10, 60, 360, 1440]}
                value={settings.defaultExpiration}
                onChange={(v) => updateSettings({ defaultExpiration: v })}
                formatLabel={expirationLabel}
              />
              <p className="text-xs text-gray-600 mt-2">
                Time before an undelivered message is considered expired.
              </p>
            </div>

            <div>
              <Label>Default Bluetooth Range</Label>
              <SegmentedControl<BluetoothRangeSetting>
                options={[5, 10, 20, 30]}
                value={settings.defaultBluetoothRange}
                onChange={(v) => updateSettings({ defaultBluetoothRange: v })}
                formatLabel={(v) => `${v} m`}
              />
              <p className="text-xs text-gray-600 mt-2">
                Assumed BLE range for simulation topology generation.
              </p>
            </div>
          </div>
        </Card>

        {/* ── Transport Mode ── */}
        <Card>
          <SectionHeader icon={Bluetooth} title="Transport Mode" />
          <div className="space-y-3">
            {(
              [
                {
                  mode: 'simulation' as TransportMode,
                  label: 'Simulation',
                  desc: 'In-browser simulated mesh. No real hardware required.',
                  icon: Zap,
                  available: true,
                  badge: undefined as string | undefined,
                  badgeClass: undefined as string | undefined,
                },
                {
                  mode: 'web-bluetooth' as TransportMode,
                  label: 'Web Bluetooth',
                  desc: 'Experimental. Chrome / Edge only. Requires user gesture for each connection.',
                  icon: Bluetooth,
                  available: BTCapability === 'full',
                  badge: BTCapability === 'full' ? 'Available' : 'Unsupported',
                  badgeClass:
                    BTCapability === 'full'
                      ? 'text-green-400 bg-green-500/15 border-green-500/30'
                      : 'text-red-400 bg-red-500/15 border-red-500/30',
                },
              ]
            ).map(({ mode, label, desc, icon: Icon, available, badge, badgeClass }) => (
              <button
                key={mode}
                onClick={() => handleTransportChange(mode as TransportMode)}
                disabled={!available}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-200 ${
                  transportMode === mode
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : available
                    ? 'border-white/10 bg-gray-800 hover:border-white/20'
                    : 'border-white/5 bg-gray-800/50 opacity-50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`mt-0.5 p-1.5 rounded-lg ${
                    transportMode === mode ? 'bg-cyan-500/20' : 'bg-gray-700'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${transportMode === mode ? 'text-cyan-400' : 'text-gray-400'}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={`font-semibold text-sm ${
                        transportMode === mode ? 'text-cyan-300' : 'text-gray-200'
                      }`}
                    >
                      {label}
                    </span>
                    {badge && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}
                      >
                        {badge}
                      </span>
                    )}
                    {transportMode === mode && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* ── Simulation Settings ── */}
        <Card>
          <SectionHeader icon={Sliders} title="Simulation Settings" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Message Delay (simulation)</Label>
              <span className="text-cyan-400 text-sm font-mono">{settings.messageDelay} ms</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={settings.messageDelay}
              onChange={(e) => updateSettings({ messageDelay: Number(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>100 ms (fast)</span>
              <span>2000 ms (slow)</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Simulated propagation delay per hop in the in-browser simulator.
            </p>
          </div>
        </Card>

        {/* ── Danger Zone ── */}
        <Card className="border-red-500/20">
          <SectionHeader icon={AlertTriangle} title="Danger Zone" />
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-gray-800 border border-white/5">
              <div>
                <p className="text-sm font-semibold text-gray-200">Clear All Messages</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Permanently deletes all stored messages from this device.
                </p>
              </div>
              <button
                onClick={handleClearMessages}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                  confirmClear
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {confirmClear ? 'Tap again to confirm' : 'Clear Messages'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-gray-800 border border-white/5">
              <div>
                <p className="text-sm font-semibold text-gray-200">Reset Settings</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Restore all settings to factory defaults.
                </p>
              </div>
              <button
                onClick={handleResetSettings}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                  confirmReset
                    ? 'bg-orange-500 text-white animate-pulse'
                    : 'bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                {confirmReset ? 'Tap again to confirm' : 'Reset Settings'}
              </button>
            </div>
          </div>
        </Card>

        {/* ── About ── */}
        <Card>
          <SectionHeader icon={Info} title="About MeshLink" />
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span>Version</span>
              <span className="text-gray-200 font-mono">0.1.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span>Transport</span>
              <span className="text-cyan-400 font-mono">{transportMode}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span>Web Bluetooth</span>
              <span
                className={
                  BTCapability === 'full' ? 'text-green-400' : 'text-red-400'
                }
              >
                {BTCapability === 'full' ? 'Supported' : BTCapability}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span>Secure Context</span>
              <span className={window.isSecureContext ? 'text-green-400' : 'text-red-400'}>
                {window.isSecureContext ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>Platform</span>
              <span className="text-gray-300 text-xs font-mono truncate max-w-[180px]">
                {navigator.userAgent.slice(0, 40)}…
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-600 leading-relaxed">
            MeshLink is an experimental peer-to-peer Bluetooth relay messenger. The simulation
            mode runs entirely in-browser. Full offline BLE mesh requires the MeshLink native app.
            Use responsibly.
          </p>
        </Card>

        {/* Bottom spacer for mobile nav */}
        <div className="h-4" />
      </div>
    </div>
  );
};

export default Settings;
