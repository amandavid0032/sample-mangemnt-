import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isTeamMember } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if on public page - hide menu items
  const isPublicPage = location.pathname === '/public';

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Sample Management
        </Link>

        {/* Hamburger button - only shows on mobile */}
        {!isPublicPage && (
          <button className="hamburger-btn" onClick={toggleMobileMenu} aria-label="Toggle menu">
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
          </button>
        )}

        {!isPublicPage && (
          <div className={`navbar-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/dashboard" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                    <Link to="/samples" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Samples</Link>
                    <Link to="/parameters" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Parameters</Link>
                    <Link to="/team" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Team</Link>
                  </>
                )}
                {isTeamMember && (
                  <>
                    <Link to="/my-samples" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>My Samples</Link>
                    <Link to="/create-sample" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>New Sample</Link>
                    <Link to="/analyse" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Analyse</Link>
                  </>
                )}

                {/* Mobile profile section - only visible in mobile menu */}
                <div className="mobile-profile-section">
                  <div className="mobile-profile-header">
                    <span className="navbar-avatar">{user?.name?.charAt(0).toUpperCase()}</span>
                    <div className="mobile-profile-info">
                      <span className="mobile-profile-name">{user?.name}</span>
                      <span className="mobile-profile-role">{user?.role}</span>
                    </div>
                  </div>
                  <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="mobile-logout-btn">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/public" className="navbar-link" onClick={() => setMobileMenuOpen(false)}>Public Portal</Link>
                <Link to="/login" className="btn btn-primary" onClick={() => setMobileMenuOpen(false)}>Login</Link>
              </>
            )}
          </div>
        )}

        {/* Overlay for mobile menu */}
        {mobileMenuOpen && <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

        {/* Desktop profile dropdown - hidden on mobile */}
        {!isPublicPage && isAuthenticated && (
          <div className="navbar-profile desktop-only">
            <button
              className="navbar-profile-btn"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="navbar-avatar">{user?.name?.charAt(0).toUpperCase()}</span>
              <span className="navbar-username">{user?.name}</span>
              <span className="navbar-dropdown-icon">▼</span>
            </button>

            {showDropdown && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-header">
                  <span className="navbar-dropdown-name">{user?.name}</span>
                  <span className="navbar-dropdown-role">{user?.role}</span>
                </div>
                <div className="navbar-dropdown-divider"></div>
                <button onClick={handleLogout} className="navbar-dropdown-item navbar-logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
