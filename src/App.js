import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar, Loading } from './components/common';
import { PrivateRoute } from './routes';
import {
  Login,
  Dashboard,
  Samples,
  Team,
  Parameters,
  CreateSample,
  MySamples,
  Analyse,
  PublicPortal
} from './pages';

function App() {
  const { loading, isAuthenticated, user } = useAuth();

  if (loading) {
    return <Loading message="Loading application..." />;
  }

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/public';
    switch (user?.role) {
      case 'ADMIN':
        return '/dashboard';
      case 'TEAM_MEMBER':
        return '/mobile';
      default:
        return '/public';
    }
  };

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <Login />
          } />
          <Route path="/public" element={<PublicPortal />} />

          {/* Admin Routes */}
          <Route path="/dashboard" element={
            <PrivateRoute roles={['ADMIN']}>
              <Dashboard />
            </PrivateRoute>
          } />
          <Route path="/samples" element={
            <PrivateRoute roles={['ADMIN']}>
              <Samples />
            </PrivateRoute>
          } />
          <Route path="/parameters" element={
            <PrivateRoute roles={['ADMIN']}>
              <Parameters />
            </PrivateRoute>
          } />
          <Route path="/team" element={
            <PrivateRoute roles={['ADMIN']}>
              <Team />
            </PrivateRoute>
          } />

          {/* Team Member Routes */}
          <Route path="/mobile" element={
            <PrivateRoute roles={['TEAM_MEMBER']}>
              <MySamples />
            </PrivateRoute>
          } />
          <Route path="/my-samples" element={
            <PrivateRoute roles={['TEAM_MEMBER']}>
              <MySamples />
            </PrivateRoute>
          } />
          <Route path="/create-sample" element={
            <PrivateRoute roles={['TEAM_MEMBER', 'ADMIN']}>
              <CreateSample />
            </PrivateRoute>
          } />
          <Route path="/analyse" element={
            <PrivateRoute roles={['TEAM_MEMBER', 'ADMIN']}>
              <Analyse />
            </PrivateRoute>
          } />

          {/* Default Route */}
          <Route path="/" element={<Navigate to={getDefaultRoute()} />} />
          <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
