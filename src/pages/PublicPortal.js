import React, { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { publicAPI } from '../services/api';
import { Loading, Pagination, StatusBadge, Modal } from '../components/common';
import { usePagination } from '../hooks';
import './PublicPortal.css';

const PublicPortal = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: ''
  });
  const [stats, setStats] = useState(null);
  const [mapData, setMapData] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const pagination = usePagination(1, 10);


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const [samplesRes, statsRes] = await Promise.all([
        publicAPI.getSamples(params),
        publicAPI.getStats()
      ]);

      setSamples(samplesRes.data.data);
      pagination.updatePagination(samplesRes.data.pagination);
      setStats(statsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load samples');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMapData = useCallback(async () => {
    try {
      const response = await publicAPI.getMapData();
      setMapData(response.data.data);
    } catch (err) {
      console.error('Failed to load map data');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (view === 'map') {
      fetchMapData();
    }
  }, [view, fetchMapData]);

  useEffect(() => {
    if (view !== 'map' || !mapContainer.current || mapData.length === 0) return;

    const mapboxToken = process.env.REACT_APP_MAPBOX_TOKEN;
    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    if (map.current) {
      map.current.remove();
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [78.9629, 20.5937],
      zoom: 4
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    mapData.forEach(sample => {
      const color = getMarkerColor(sample.overallStatus);
      const coords = sample.coordinates;

      if (!coords) return;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="map-popup">
          <h4>${sample.sampleId}</h4>
          <p><strong>Address:</strong> ${sample.address || 'N/A'}</p>
          <p><strong>Status:</strong> ${sample.overallStatus}</p>
        </div>
      `);

      new mapboxgl.Marker({ color })
        .setLngLat([coords.longitude, coords.latitude])
        .setPopup(popup)
        .addTo(map.current);
    });

    if (mapData.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      mapData.forEach(sample => {
        if (sample.coordinates) {
          bounds.extend([sample.coordinates.longitude, sample.coordinates.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [view, mapData]);

  const getMarkerColor = (status) => {
    switch (status) {
      case 'ACCEPTABLE': return '#22c55e';
      case 'PERMISSIBLE': return '#eab308';
      case 'NOT_ACCEPTABLE': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    pagination.reset();
  };

  const clearFilters = () => {
    setFilters({
      fromDate: '',
      toDate: ''
    });
    pagination.reset();
  };

  const handleViewSample = (sample) => {
    setSelectedSample(sample);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSample(null);
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="public-portal">
      <div className="portal-header">
        <h1>Public Water Quality Data</h1>
        <p>View published environmental sample data</p>
      </div>

      {stats && (
        <div className="portal-stats">
          <div className="portal-stat">
            <span className="stat-value">{stats.totalPublished}</span>
            <span className="stat-label">Published Samples</span>
          </div>
          <div className="portal-stat good">
            <span className="stat-value">{stats.byStatus?.ACCEPTABLE || 0}</span>
            <span className="stat-label">Acceptable</span>
          </div>
          <div className="portal-stat moderate">
            <span className="stat-value">{stats.byStatus?.PERMISSIBLE || 0}</span>
            <span className="stat-label">Permissible</span>
          </div>
          <div className="portal-stat poor">
            <span className="stat-value">{stats.byStatus?.NOT_ACCEPTABLE || 0}</span>
            <span className="stat-label">Not Acceptable</span>
          </div>
        </div>
      )}

      <div className="portal-controls card">
        <form onSubmit={handleSearch} className="filter-form">
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleFilterChange}
            className="form-input"
            placeholder="From Date"
          />

          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            onChange={handleFilterChange}
            className="form-input"
            placeholder="To Date"
          />

          <button type="submit" className="btn btn-primary">Filter</button>
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear</button>
        </form>

        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'table' ? 'active' : ''}`}
            onClick={() => setView('table')}
          >
            Table View
          </button>
          <button
            className={`toggle-btn ${view === 'map' ? 'active' : ''}`}
            onClick={() => setView('map')}
          >
            Map View
          </button>
        </div>
      </div>

      {loading ? (
        <Loading message="Loading samples..." />
      ) : view === 'table' ? (
        <>
          <div className="table-container card">
            <table className="table">
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Collection Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>
                      No published samples found
                    </td>
                  </tr>
                ) : (
                  samples.map(sample => (
                    <tr key={sample._id}>
                      <td><strong>{sample.sampleId}</strong></td>
                      <td>{sample.address || 'N/A'}</td>
                      <td>
                        <StatusBadge status={sample.overallStatus} type="condition" />
                      </td>
                      <td>{new Date(sample.collectedAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleViewSample(sample)}
                        >
                          View
                        </button>
                      </td>
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
      ) : (
        <div className="map-container card">
          <div className="map-legend">
            <div className="legend-item">
              <span className="legend-color good"></span>
              <span>Acceptable</span>
            </div>
            <div className="legend-item">
              <span className="legend-color moderate"></span>
              <span>Permissible</span>
            </div>
            <div className="legend-item">
              <span className="legend-color poor"></span>
              <span>Not Acceptable</span>
            </div>
          </div>
          <div ref={mapContainer} className="map-view"></div>
          {!process.env.REACT_APP_MAPBOX_TOKEN && (
            <div className="map-placeholder">
              <p>Map view requires a Mapbox token.</p>
              <p>Add REACT_APP_MAPBOX_TOKEN to your .env file.</p>
            </div>
          )}
        </div>
      )}

      {/* Sample Details Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={`Sample Details - ${selectedSample?.sampleId || ''}`}
        size="large"
      >
        {selectedSample && (
          <div className="sample-detail-modal">
            <div className="detail-section">
              <h3>Basic Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Sample ID</label>
                  <span>{selectedSample.sampleId}</span>
                </div>
                <div className="detail-item">
                  <label>Address</label>
                  <span>{selectedSample.address || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Collection Date</label>
                  <span>{new Date(selectedSample.collectedAt).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Published Date</label>
                  <span>{selectedSample.publishedAt ? new Date(selectedSample.publishedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Overall Status</label>
                  <StatusBadge status={selectedSample.overallStatus} type="condition" />
                </div>
                <div className="detail-item">
                  <label>Standard Version</label>
                  <span>{selectedSample.standardVersion || 'IS10500-2012'}</span>
                </div>
              </div>
            </div>

            {selectedSample.parameters && selectedSample.parameters.length > 0 && (
              <div className="detail-section">
                <h3>Parameter Analysis Results</h3>
                <div className="parameters-table-container">
                  <table className="table parameters-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Acceptable Limit</th>
                        <th>Permissible Limit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSample.parameters.map((param, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{param.name}</strong>
                            <br />
                            <small className="text-muted">{param.code}</small>
                          </td>
                          <td><strong>{param.value}</strong></td>
                          <td>{param.unit}</td>
                          <td>
                            {param.type === 'RANGE'
                              ? `${param.acceptableLimit?.min || '-'} - ${param.acceptableLimit?.max || '-'}`
                              : param.acceptableLimit?.max !== null
                                ? `Max: ${param.acceptableLimit?.max}`
                                : '-'
                            }
                          </td>
                          <td>
                            {param.permissibleLimit?.max !== null
                              ? `Max: ${param.permissibleLimit?.max}`
                              : '-'
                            }
                          </td>
                          <td>
                            <StatusBadge status={param.status} type="condition" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedSample.images && (selectedSample.images.sampleImageUrl || selectedSample.images.locationImageUrl) && (
              <div className="detail-section">
                <h3>Images</h3>
                <div className="images-grid">
                  {selectedSample.images.sampleImageUrl && (
                    <div className="image-item">
                      <label>Sample Image</label>
                      <img
                        src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedSample.images.sampleImageUrl}`}
                        alt="Sample"
                      />
                    </div>
                  )}
                  {selectedSample.images.locationImageUrl && (
                    <div className="image-item">
                      <label>Location Image</label>
                      <img
                        src={`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedSample.images.locationImageUrl}`}
                        alt="Location"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicPortal;
