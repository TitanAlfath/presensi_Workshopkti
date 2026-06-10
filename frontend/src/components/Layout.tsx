import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Calendar, MapPin } from 'lucide-react';
import logoDiesnat from '../assets/LOGO DIESNAT25.png';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const location = useLocation();

  useEffect(() => {
    const root = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  const StripeBorder = () => (
    <div className="striped-bar shadow-sm">
      {Array.from({ length: 48 }).map((_, idx) => {
        const colors = ['bg-[#1d3d75]', 'bg-[#e28743]', 'bg-[#c23b2b]', 'bg-[#76b5c5]'];
        const colorClass = colors[idx % colors.length];
        return <div key={idx} className={colorClass} />;
      })}
    </div>
  );

  return (
    <div className="min-h-screen kti-bg flex flex-col transition-colors duration-300">
      {/* Top Stripe Border */}
      <StripeBorder />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-dark-800 transition-all duration-300">
        <div className="max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src={logoDiesnat} 
              className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300" 
              alt="Logo Dies Natalis Fastikom 25" 
            />
            <div>
              <span className="font-extrabold text-lg tracking-tight text-[#1d3d75] dark:text-white">
                PRESIFIY
              </span>
              <span className="text-[10px] block font-semibold text-[#c23b2b] tracking-wider -mt-1 uppercase">
                DIES NATALIS 25
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link 
              to="/admin/login" 
              className="text-sm font-bold text-[#1d3d75] dark:text-dark-300 hover:text-[#c23b2b] transition-colors"
            >
              Portal Admin
            </Link>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-600 dark:text-dark-300 hover:bg-gray-100 dark:hover:bg-dark-800 transition-all border border-transparent hover:border-gray-200 dark:hover:border-dark-700"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 kti-content">
        <div className="max-w-4xl w-full mx-auto animate-fade-in">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 bg-white/60 dark:bg-dark-900/60 backdrop-blur-sm border-t border-gray-200 dark:border-dark-800 text-center text-xs text-gray-500 dark:text-dark-400 kti-content">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-gray-600 dark:text-dark-400 font-medium mb-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c23b2b]"></span>
            Instagram: @bemfastikomunsiq
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e28743]"></span>
            TikTok: bem.fastikomunsiq
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1d3d75]"></span>
            Email: bem.fastikomunsiq@gmail.com
          </span>
        </div>
        <p>© {new Date().getFullYear()} Presify Digital Event Attendance. All rights reserved.</p>
        <p className="mt-1 font-bold text-[#1d3d75] dark:text-white">BEM FASTIKOM UNSIQ COLLABORATION</p>
      </footer>

      {/* Bottom Stripe Border */}
      <StripeBorder />
    </div>
  );
};

export default Layout;
