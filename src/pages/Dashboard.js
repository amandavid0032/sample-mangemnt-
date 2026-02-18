import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { samplesAPI } from '../services/api';
import { Loading } from '../components/common';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await samplesAPI.getStats();
        setStats(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loading message="Loading dashboard..." />;
  if (error) return <div className="alert alert-error">{error}</div>;

  // Calculate testing count (field tested + lab tested but not published)
  const testingCount = (stats.byStatus?.fieldTestedOnly || 0) + (stats.byStatus?.labTested || 0);
  const publishedCount = stats.byStatus?.published || 0;

  const lifecycleData = {
    labels: ['Testing', 'Published'],
    datasets: [
      {
        data: [testingCount, publishedCount],
        backgroundColor: ['#F59E0B', '#22C55E'],
        borderWidth: 0
      }
    ]
  };

  const overallData = {
    labels: ['Acceptable', 'Permissible', 'Not Acceptable'],
    datasets: [
      {
        label: 'Sample Quality',
        data: [
          stats.byOverallStatus?.ACCEPTABLE || 0,
          stats.byOverallStatus?.PERMISSIBLE || 0,
          stats.byOverallStatus?.NOT_ACCEPTABLE || 0
        ],
        backgroundColor: ['#22C55E', '#F59E0B', '#EF4444']
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Sample Management System Overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Samples</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>

        <div className="stat-card stat-testing">
          <div className="stat-content">
            <h3>Testing</h3>
            <p className="stat-number">{testingCount}</p>
          </div>
        </div>

        <div className="stat-card stat-published">
          <div className="stat-content">
            <h3>Published</h3>
            <p className="stat-number">{publishedCount}</p>
          </div>
        </div>

        <div className="stat-card stat-archived">
          <div className="stat-content">
            <h3>Archived</h3>
            <p className="stat-number">{stats.archived || 0}</p>
          </div>
        </div>
      </div>


      <div className="charts-grid">
        <div className="chart-card">
          <h3>Lifecycle Status Distribution</h3>
          <div className="chart-container">
            <Doughnut data={lifecycleData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Overall Quality Distribution</h3>
          <div className="chart-container">
            <Bar data={overallData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/samples" className="action-card">
            <span className="action-icon">Samples</span>
            <span>Manage Samples</span>
          </Link>
          <Link to="/parameters" className="action-card">
            <span className="action-icon">Params</span>
            <span>Parameter Master</span>
          </Link>
          <Link to="/team" className="action-card">
            <span className="action-icon">Team</span>
            <span>Manage Users</span>
          </Link>
          <Link to="/public" className="action-card">
            <span className="action-icon">Public</span>
            <span>Public Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
