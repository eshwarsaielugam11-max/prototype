import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Mic, UploadCloud, History, ArrowRight } from 'lucide-react';

interface NavLinkItem {
  name: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const navLinks: NavLinkItem[] = [
  { name: 'Record', path: '/record', icon: Mic },
  { name: 'Upload', path: '/upload', icon: UploadCloud },
  { name: 'History', path: '/history', icon: History },
];

export const NavBar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    // Monitor scroll to transition from transparent-over-hero to solid bg-panel
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navBackground = !isHome || isScrolled
    ? 'bg-bg-panel/95 backdrop-blur-md border-b border-bg-panel-border shadow-panel'
    : 'bg-transparent border-b border-transparent';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${navBackground}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Wordmark (Text only, editorial Fraunces & Inter hybrid) */}
          <Link
            to="/"
            className="flex items-baseline gap-2.5 group rounded-sm py-1 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none"
            aria-label="Vocalis - Parkinson's Voice Screening Home"
          >
            <span className="font-display font-medium text-lg sm:text-xl text-ink tracking-tight group-hover:text-signal-gold transition-colors">
              Vocalis
            </span>
            <span className="text-xs text-ink-muted font-body hidden sm:inline-block font-normal">
              Acoustic Biomarker Screening
            </span>
          </Link>

          {/* Navigation Links & Action */}
          <nav className="flex items-center gap-2 sm:gap-6" aria-label="Main Navigation">
            <div className="flex items-center gap-1 sm:gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded text-sm font-body transition-colors focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:outline-none flex items-center gap-1.5 ${
                        isActive
                          ? 'text-signal-gold font-medium bg-bg-panel-elevated border border-bg-panel-border'
                          : 'text-ink-muted hover:text-ink hover:bg-bg-panel/60'
                      }`
                    }
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Filled Signal-Gold Action Button */}
            <Link
              to="/record"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-signal-gold hover:bg-signal-gold-hover text-bg-void font-body text-xs sm:text-sm font-semibold shadow-glow-gold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-signal-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void focus-visible:outline-none"
            >
              <span>Start Screening</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
