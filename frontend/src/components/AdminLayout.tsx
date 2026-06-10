import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Award,
  BarChart3,
  Download,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  Calendar,
  QrCode,
  Bell
} from 'lucide-react';
import logoDiesnat from '../assets/LOGO DIESNAT25.png';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface Event {
  id: string;
  name: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEventId, setActiveEventId] = useState<string>('');

  useEffect(() => {
    const root = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch all events for the selector
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRes = await apiClient.get('/event/list');
        setEvents(eventsRes.data);
        
        const activeRes = await apiClient.get('/event/active');
        if (activeRes.data) {
          setActiveEventId(activeRes.data.id);
        }
      } catch (err) {
        console.error('Error fetching events list in layout', err);
      }
    };
    fetchEvents();
  }, [location.pathname]); // refetch on navigation changes to keep in sync

  const handleActiveEventChange = async (eventId: string) => {
    try {
      setActiveEventId(eventId);
      await apiClient.post('/event/set-active', { id: eventId });
      // Trigger a soft reload/refresh of the page content
      window.location.reload();
    } catch (err) {
      console.error('Failed to change active event', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Data Peserta', path: '/admin/participants', icon: Users },
    { name: 'Presensi', path: '/admin/attendance', icon: UserCheck },
    { name: 'Kiosk & Live Board', path: '/admin/kiosk', icon: QrCode },
    { name: 'Scan QR Kamera', path: '/admin/scan', icon: QrCode },
    { name: 'Statistik', path: '/admin/stats', icon: BarChart3 },
    { name: 'Export Data', path: '/admin/export', icon: Download },
    { name: 'Pengaturan Event', path: '/admin/settings', icon: Settings },
  ];

  const activeItem = navItems.find((item) => {
    if (item.path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(item.path);
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex transition-colors duration-300">
      {/* Sidebar for Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 glass-panel border-r border-gray-200 dark:border-dark-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:flex lg:flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-dark-800">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={logoDiesnat} 
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-300" 
              alt="Logo Dies Natalis Fastikom 25" 
            />
            <div>
              <span className="font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-indigo-500 dark:from-brand-400 dark:to-indigo-300 bg-clip-text text-transparent">
                PRESIFIY ADMIN
              </span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 dark:text-dark-400">
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-base shadow-inner">
              {user?.name.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="overflow-hidden">
              <h4 className="font-semibold text-sm truncate dark:text-white">{user?.name}</h4>
              <p className="text-[11px] text-gray-500 dark:text-dark-400 font-medium capitalize mt-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-800 inline-block">
                {user?.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                    : 'text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-800">
          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
          >
            <span className="flex items-center gap-3">
              <LogOut size={18} />
              <span>Keluar</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-800"
            >
              <Menu size={20} />
            </button>

            {/* Event Switcher */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <Calendar size={16} className="text-gray-400" />
              <span className="font-medium text-gray-500 dark:text-dark-400">Event Aktif:</span>
              <div className="relative">
                <select
                  value={activeEventId}
                  onChange={(e) => handleActiveEventChange(e.target.value)}
                  className="appearance-none bg-gray-100 dark:bg-dark-800 text-gray-800 dark:text-dark-200 py-1.5 pl-3 pr-8 rounded-lg font-medium text-xs border border-transparent hover:border-gray-300 dark:hover:border-dark-700 cursor-pointer focus:outline-none transition-colors"
                >
                  {events.length === 0 ? (
                    <option value="">Belum Ada Event</option>
                  ) : (
                    events.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.name.length > 30 ? evt.name.substring(0, 30) + '...' : evt.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Link to Scan */}
            <Link
              to="/admin/scan"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors"
            >
              <QrCode size={14} />
              <span>Scan Check-in</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-800 transition-all"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification placeholder */}
            <button className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-800 relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand-500"></span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Page Header title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 dark:border-dark-800 pb-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {activeItem ? activeItem.name : 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-dark-400 mt-1">
                  Kelola sistem presensi kegiatan digital event secara realtime.
                </p>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
