import { useState } from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../assets/logoprimary.svg';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <a href="/#hero" className="flex items-center font-display text-text-primary text-xl hover:scale-105 transition-transform duration-300 origin-left">
        <img src={logoUrl} alt="HackKnight Logo" className="w-10 h-10" />
        <span className="leading-none pt-0.5 font-bold text-2xl">HackKnight</span>
      </a>

      {/* Desktop nav — hidden on mobile via CSS */}
      <ul className="navbar-desktop-links flex gap-25 items-center">
        <li><a href="/#sponsors" className="navbar-link">Sponsors</a></li>
        <li><a href="/#photos" className="navbar-link">Past Events</a></li>
        <li><a href="/#schedule" className="navbar-link">Schedule</a></li>
        <li><a href="/#team" className="navbar-link">Team</a></li>
        <li><a href="/#faq" className="navbar-link">FAQ</a></li>
      </ul>

      <Link to="/register" className="navbar-desktop-register btn-primary">Apply Now</Link>

      {/* Mobile hamburger — shown on mobile via CSS */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="navbar-mobile-toggle"
        aria-label="Toggle menu"
      >
        <span className={`block w-6 h-0.5 bg-text-primary rounded transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <span className={`block w-6 h-0.5 bg-text-primary rounded transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
        <span className={`block w-6 h-0.5 bg-text-primary rounded transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile slide-down menu */}
      <div className={`mobile-nav-menu ${menuOpen ? 'mobile-nav-menu-open' : ''}`}>
        <ul className="flex flex-col items-center gap-6 pt-6 pb-4">
          <li><a href="/#sponsors" className="navbar-link text-lg" onClick={() => setMenuOpen(false)}>Sponsors</a></li>
          <li><a href="/#photos" className="navbar-link text-lg" onClick={() => setMenuOpen(false)}>Past Events</a></li>
          <li><a href="/#schedule" className="navbar-link text-lg" onClick={() => setMenuOpen(false)}>Schedule</a></li>
          <li><a href="/#team" className="navbar-link text-lg" onClick={() => setMenuOpen(false)}>Team</a></li>
          <li><a href="/#faq" className="navbar-link text-lg" onClick={() => setMenuOpen(false)}>FAQ</a></li>
        </ul>
        <div className="flex justify-center pb-6">
          <Link to="/register" className="btn-primary" onClick={() => setMenuOpen(false)}>Apply Now</Link>
        </div>
      </div>
    </nav>
  );
}
