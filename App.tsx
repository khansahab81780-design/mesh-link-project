import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Network, Cpu, Settings, Home, Radio, Info } from 'lucide-react';
import { useMeshStore, initializeMeshStore } from './store/meshStore';
import { useOffline } from './hooks/useOffline';
import { NotificationContainer as Notification } from './components/Notification';

// Pages
import HomePage from './pages/Home';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import NetworkPage from './pages/Network';
import Simulator from './pages/Simulator';
import Devices from './pages/Devices';
import SettingsPage from './pages/Settings';
import About from './pages/About';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/chat', icon: MessageSquare, label: 'Messages' },
  { to: '/network', icon: Network, label: 'Network' },
  { to: '/simulator', icon: Cpu, label: 'Simulator' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function BottomNav() {
  const location = useLocation();
  if (location.pathname === '/') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-md border-t border-gray-800 md:hidden">
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                isActive ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function SideNav() {
  const location = useLocation();
  if (location.pathname === '/') return null;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-950 border-r border-gray-800 fixed top-0 left-0 h-full z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 border-b border-gray-800">
        <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
          <Network className="text-cyan-400" size={22} />
        </div>
        <div>
          <div className="font-bold text-white text-lg">MeshLink</div>
          <div className="text-xs text-gray-500">Simulation Mode</div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-1">
        {[
          { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/chat', icon: MessageSquare, label: 'Messages' },
          { to: '/network', icon: Network, label: 'Network' },
          { to: '/simulator', icon: Cpu, label: 'Simulator' },
          { to: '/devices', icon: Radio, label: 'Devices' },
        ].map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom links */}
      <div className="p-4 border-t border-gray-800 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-400 hover:bg-gray-900 hover:text-white'
            }`
          }
        >
          <Info size={18} />
          How It Works
        </NavLink>
      </div>
    </aside>
  );
}

function OfflineBanner() {
  const { isOffline } = useOffline();
  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-orange-600 text-white text-xs text-center py-1.5 font-medium">
      ⚡ Internet unavailable — MeshLink running in offline mode. Local mesh communication active.
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { isOffline } = useOffline();

  return (
    <div className="min-h-screen bg-gray-950">
      <OfflineBanner />
      <SideNav />
      <main className={`${!isHome ? 'md:ml-64' : ''} ${isOffline ? 'pt-7' : ''} min-h-screen`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>
      <BottomNav />
      <Notification />
    </div>
  );
}

export default function App() {
  const setIdentity = useMeshStore(s => s.setIdentity);

  useEffect(() => {
    const identity = initializeMeshStore();
    setIdentity(identity);
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
