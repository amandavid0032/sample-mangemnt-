import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { samplesAPI } from '../services/api';
import { Loading, Pagination, StatusBadge } from '../components/common';
import { usePagination } from '../hooks';
import './Samples.css';

const MySamples = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pagination = usePagination(1, 10);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const response = await samplesAPI.getAll({
        page: pagination.page,
        limit: pagination.limit
      });
      setSamples(response.data.data);
      pagination.updatePagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load samples');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="samples-page">
      <div className="samples-header">
        <div>
          <h1>My Samples</h1>
          <p>View your submitted samples</p>
        </div>
        <Link to="/create-sample" className="btn btn-primary">
          Create New Sample
        </Link>
      </div>

      {loading ? (
        <Loading message="Loading your samples..." />
      ) : (
        <>
          <div className="table-container card">
            <table className="table">
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Location</th>
                  <th>District</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      No samples found. <Link to="/create-sample">Create your first sample</Link>
                    </td>
                  </tr>
                ) : (
                  samples.map(sample => (
                    <tr key={sample._id}>
                      <td><strong>{sample.sampleId}</strong></td>
                      <td>{sample.locationName}</td>
                      <td>{sample.district}</td>
                      <td>{sample.state}</td>
                      <td><StatusBadge status={sample.lifecycleStatus} /></td>
                      <td>{new Date(sample.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={pagination.goToPage}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
          />
        </>
      )}
    </div>
  );
};

export default MySamples;
