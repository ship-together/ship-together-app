import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_LOGO_URL } from '../types/domain';
import { SafeImage } from './SafeImage';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Community', to: '/community' },
  { label: 'Projects', to: '/projects' },
  { label: 'Collaborate', to: '/collaborate' },
  { label: 'Profile', to: '/profile' },
];

export function Navbar() {
  const { user, profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090909]/95 backdrop-blur-md border-b border-[#292923]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand logo + wordmark */}
        <Link
          to="/"
          className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-[#F59E0B] transition-colors"
        >
          <span className="w-8 h-8 rounded-full overflow-hidden border border-[#292923] bg-white shrink-0 flex items-center justify-center">
            <img
              src={APP_LOGO_URL}
              alt="Ship Together logo"
              className="w-full h-full object-cover scale-[1.26]"
            />
          </span>
          <span>Ship Together</span>
        </Link>

        {/* Zone 2: 5 concise single-line text links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-white border-[#F59E0B]'
                    : 'text-[#A3A3A3] border-transparent hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Single primary auth action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <SafeImage
                  src={profile?.avatarUrl}
                  alt={profile?.displayName || 'Profile'}
                  fallbackLabel={profile?.displayName || user.email || 'User'}
                  variant="avatar"
                  className="w-7 h-7 rounded-full object-cover border border-[#292923]"
                />
                <span className="max-w-[120px] truncate">
                  {profile?.username ? `@${profile.username}` : 'Account'}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-[#A3A3A3] hover:text-white hover:border-[#A3A3A3]/40 transition-colors whitespace-nowrap shrink-0"
              >
                Log Out
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap shrink-0"
            >
              Sign Up / Log In
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#171714] transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#292923] bg-[#090909] px-4 py-4 space-y-2">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#171714] text-[#F59E0B]'
                      : 'text-[#A3A3A3] hover:text-white hover:bg-[#171714]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="pt-3 border-t border-[#292923]">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2.5 rounded-lg border border-[#292923] text-sm font-medium text-white hover:bg-[#171714] transition-colors"
              >
                Log Out
              </button>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="block text-center w-full px-4 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors"
              >
                Sign Up / Log In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
