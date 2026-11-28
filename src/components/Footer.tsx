import { Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../types/domain';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#09090B] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-base font-bold text-[#FAFAFA] hover:text-[#A1A1AA] transition-colors"
          >
            <span className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-white shrink-0 flex items-center justify-center">
              <img
                src={APP_LOGO_URL}
                alt="Ship Together logo"
                className="w-full h-full object-cover scale-[1.26]"
              />
            </span>
            <span>Ship Together</span>
          </Link>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1.5">
            Public build logs, code-first showcases, and small-team matching.
          </p>
          <p className="text-xs text-[#A1A1AA]/80 mt-2 font-mono">
            Developed by <span className="text-[#FAFAFA] font-medium">Fathia</span>
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-6 text-sm text-[#A1A1AA]"
        >
          <Link to="/community" className="hover:text-[#FAFAFA] transition-colors">
            Community
          </Link>
          <Link to="/projects" className="hover:text-[#FAFAFA] transition-colors">
            Projects
          </Link>
          <Link to="/collaborate" className="hover:text-[#FAFAFA] transition-colors">
            Collaborate
          </Link>
          <Link to="/profile" className="hover:text-[#FAFAFA] transition-colors">
            Profile
          </Link>
        </nav>
      </div>
    </footer>
  );
}
