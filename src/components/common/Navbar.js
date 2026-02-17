import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isAdmin, isTeamMember } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          Sample Management
        </Link>

        <div className="navbar-menu">
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <>
                  <Link to="/dashboard" className="navbar-link">Dashboard</Link>
                  <Link to="/samples" className="navbar-link">Samples</Link>
                  <Link to="/parameters" className="navbar-link">Parameters</Link>
                  <Link to="/team" className="navbar-link">Team</Link>
                </>
              )}
              {isTeamMember && (
                <>
                  <Link to="/my-samples" className="navbar-link">My Samples</Link>
                  <Link to="/create-sample" className="navbar-link">New Sample</Link>
                  <Link to="/analyse" className="navbar-link">Analyse</Link>
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/public" className="navbar-link">Public Portal</Link>
              <Link to="/login" className="btn btn-primary">Login</Link>
            </>
          )}
        </div>

        {isAuthenticated && (
          <div className="navbar-profile">
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
