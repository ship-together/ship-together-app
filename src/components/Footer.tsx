import { Link } from 'react-router-dom';
import { APP_LOGO_URL } from '../types/domain';

export function Footer() {
  return (
    <footer className="border-t border-[#292923] bg-[#090909] mt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-base font-bold text-white hover:text-[#F59E0B] transition-colors"
          >
            <span className="w-7 h-7 rounded-full overflow-hidden border border-[#292923] bg-white shrink-0 flex items-center justify-center">
              <img
                src={APP_LOGO_URL}
                alt="Ship Together logo"
                className="w-full h-full object-cover scale-[1.26]"
              />
            </span>
            <span>Ship Together</span>
          </Link>
          <p className="text-sm text-[#A3A3A3] mt-1">
            Connect. Hang Out. Build &amp; Ship Together.
          </p>
          <p className="text-xs text-[#A3A3A3] mt-2">
            Developed by <span className="text-[#F59E0B] font-medium">Fathia</span>
          </p>
        </div>

        <nav
          aria-label="Footer navigation"
          className="flex flex-wrap items-center gap-6 text-sm text-[#A3A3A3]"
        >
          <Link to="/community" className="hover:text-white transition-colors">
            Community
          </Link>
          <Link to="/projects" className="hover:text-white transition-colors">
            Projects
          </Link>
          <Link to="/collaborate" className="hover:text-white transition-colors">
            Collaborate
          </Link>
          <Link to="/profile" className="hover:text-white transition-colors">
            Profile
          </Link>
        </nav>
      </div>
    </footer>
  );
}
