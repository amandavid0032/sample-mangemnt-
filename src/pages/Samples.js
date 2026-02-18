import React, { useEffect, useState, useCallback } from 'react';
import { samplesAPI, parametersAPI } from '../services/api';
import { Loading, Pagination, StatusBadge, Modal } from '../components/common';
import { usePagination } from '../hooks';
import './Samples.css';

const Samples = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const pagination = usePagination(1, 10);

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitTargetSample, setSubmitTargetSample] = useState(null);
  const [availableParameters, setAvailableParameters] = useState([]);
  const [parameterValues, setParameterValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };
      if (statusFilter) params.lifecycleStatus = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await samplesAPI.getAll(params);
      setSamples(response.data.data);
      pagination.updatePagination(response.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load samples');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  // Open Submit modal (for entering lab values)
  const openSubmitModal = async (sample) => {
    try {
      setSubmitTargetSample(sample);
      // Fetch all active parameters
      const response = await parametersAPI.getAllForDropdown();
      const params = response.data.data.filter(p => p.isActive);
      setAvailableParameters(params);
      // Initialize values
      const initialValues = {};
      params.forEach(p => {
        initialValues[p._id] = '';
      });
      setParameterValues(initialValues);
      setSelectedSample(null);
      setShowSubmitModal(true);
    } catch (err) {
      alert('Failed to load parameters');
    }
  };

  // Handle parameter value change
  const handleParamValueChange = (paramId, value) => {
    setParameterValues(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  // Submit lab values (auto-calculates status and auto-publishes)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build parameters array
    const parameters = Object.entries(parameterValues)
      .filter(([_, value]) => value !== '' && value !== null)
      .map(([paramId, value]) => ({
        parameterRef: paramId,
        value: value
      }));

    if (parameters.length === 0) {
      alert('Please enter at least one parameter value');
      return;
    }

    try {
      setSubmitting(true);
      await samplesAPI.submit(submitTargetSample._id, parameters);
      setShowSubmitModal(false);
      setSubmitTargetSample(null);
      setParameterValues({});
      fetchSamples();
      alert('Sample submitted and published successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit sample');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    pagination.reset();
    fetchSamples();
  };

  const getActionButton = (sample) => {
    if (sample.lifecycleStatus === 'TESTING') {
      return (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => openSubmitModal(sample)}
        >
          Submit
        </button>
      );
    }
    return null;
  };

  // Get coordinates from sample
  const getCoordinates = (sample) => {
    if (sample.location?.coordinates) {
      return {
        longitude: sample.location.coordinates[0],
        latitude: sample.location.coordinates[1]
      };
    }
    return null;
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="samples-page">
      <div className="samples-header">
        <h1>Sample Management</h1>
        <p>View and manage all samples</p>
      </div>

      <div className="samples-filters">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by address or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div className="status-tabs">
          <button
            className={`tab ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => { setStatusFilter(''); pagination.reset(); }}
          >
            All
          </button>
          {['TESTING', 'PUBLISHED'].map(status => (
            <button
              key={status}
              className={`tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => { setStatusFilter(status); pagination.reset(); }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Loading message="Loading samples..." />
      ) : (
        <>
          <div className="table-container card">
            <table className="table">
              <thead>
                <tr>
                  <th>Sample ID</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Overall</th>
                  <th>Submitted By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>No samples found</td>
                  </tr>
                ) : (
                  samples.map(sample => (
                    <tr key={sample._id}>
                      <td><strong>{sample.sampleId}</strong></td>
                      <td className="address-cell">{sample.address || 'N/A'}</td>
                      <td><StatusBadge status={sample.lifecycleStatus} /></td>
                      <td>
                        {sample.overallStatus ? (
                          <StatusBadge status={sample.overallStatus} type="condition" />
                        ) : '-'}
                      </td>
                      <td>{sample.submittedBy?.name || '-'}</td>
                      <td>{new Date(sample.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedSample(sample)}
                          >
                            View
                          </button>
                          {getActionButton(sample)}
                        </div>
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
      )}

      {/* View Sample Modal */}
      <Modal
        isOpen={!!selectedSample}
        onClose={() => setSelectedSample(null)}
        title={`Sample ${selectedSample?.sampleId || ''}`}
        size="large"
      >
        {selectedSample && (
          <div className="sample-modal-content">
            {/* Header with status badges */}
            <div className="sample-modal-header">
              <div className="status-badges">
                <StatusBadge status={selectedSample.lifecycleStatus} />
                {selectedSample.overallStatus && (
                  <StatusBadge status={selectedSample.overallStatus} type="condition" />
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="info-cards">
              <div className="info-card">
                <div className="info-card-icon">📍</div>
                <div className="info-card-content">
                  <span className="info-card-label">Location</span>
                  <span className="info-card-value">{selectedSample.address || 'N/A'}</span>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon">👤</div>
                <div className="info-card-content">
                  <span className="info-card-label">Collected By</span>
                  <span className="info-card-value">{selectedSample.collectedBy?.name || 'N/A'}</span>
                </div>
              </div>
              <div className="info-card">
                <div className="info-card-icon">📅</div>
                <div className="info-card-content">
                  <span className="info-card-label">Collection Date</span>
                  <span className="info-card-value">
                    {selectedSample.collectedAt
                      ? new Date(selectedSample.collectedAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
              {selectedSample.submittedBy && (
                <div className="info-card">
                  <div className="info-card-icon">🔬</div>
                  <div className="info-card-content">
                    <span className="info-card-label">Submitted By</span>
                    <span className="info-card-value">{selectedSample.submittedBy?.name || 'N/A'}</span>
                  </div>
                </div>
              )}
              {selectedSample.submittedAt && (
                <div className="info-card">
                  <div className="info-card-icon">✅</div>
                  <div className="info-card-content">
                    <span className="info-card-label">Submitted At</span>
                    <span className="info-card-value">
                      {new Date(selectedSample.submittedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              <div className="info-card">
                <div className="info-card-icon">🌐</div>
                <div className="info-card-content">
                  <span className="info-card-label">Coordinates</span>
                  <span className="info-card-value">
                    {getCoordinates(selectedSample)
                      ? `${getCoordinates(selectedSample).latitude.toFixed(4)}, ${getCoordinates(selectedSample).longitude.toFixed(4)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Map */}
            {getCoordinates(selectedSample) && (
              <div className="map-section">
                <iframe
                  title="Sample Location Map"
                  width="100%"
                  height="180"
                  frameBorder="0"
                  style={{ border: 0, borderRadius: '8px' }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${getCoordinates(selectedSample).longitude - 0.01},${getCoordinates(selectedSample).latitude - 0.01},${getCoordinates(selectedSample).longitude + 0.01},${getCoordinates(selectedSample).latitude + 0.01}&layer=mapnik&marker=${getCoordinates(selectedSample).latitude},${getCoordinates(selectedSample).longitude}`}
                  allowFullScreen
                />
              </div>
            )}

            {/* Images */}
            {(selectedSample.images?.sampleImageUrl || selectedSample.images?.locationImageUrl) && (
              <div className="images-section">
                <h4>Images</h4>
                <div className="images-grid">
                  {selectedSample.images?.sampleImageUrl && (
                    <div className="image-item">
                      <img src={selectedSample.images.sampleImageUrl} alt="Sample" />
                      <span>Sample</span>
                    </div>
                  )}
                  {selectedSample.images?.locationImageUrl && (
                    <div className="image-item">
                      <img src={selectedSample.images.locationImageUrl} alt="Location" />
                      <span>Location</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Parameters */}
            {selectedSample.parameters?.length > 0 && (
              <div className="parameters-section">
                <h4>Lab Analysis Results ({selectedSample.parameters.length} parameters)</h4>
                <div className="parameters-table-wrapper">
                  <table className="table parameters-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Value</th>
                        <th>Unit</th>
                        <th>Limit</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSample.parameters.map((param, idx) => (
                        <tr key={idx} className={`param-row-${param.status?.toLowerCase()}`}>
                          <td>
                            <div className="param-name">
                              <code>{param.code}</code>
                              <span>{param.name}</span>
                            </div>
                          </td>
                          <td className="param-value">{param.value}</td>
                          <td>{param.unit}</td>
                          <td className="param-limit">
                            {param.type === 'RANGE'
                              ? `${param.acceptableLimit?.min} - ${param.acceptableLimit?.max}`
                              : param.type === 'MAX'
                                ? `≤ ${param.acceptableLimit?.max}${param.permissibleLimit?.max ? ` / ≤ ${param.permissibleLimit.max}` : ''}`
                                : '-'}
                          </td>
                          <td><StatusBadge status={param.status} type="condition" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="modal-action-buttons">
              {selectedSample.lifecycleStatus === 'TESTING' && (
                <button
                  className="btn btn-primary"
                  onClick={() => openSubmitModal(selectedSample)}
                >
                  Submit Lab Values
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedSample(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit Sample Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => {
          setShowSubmitModal(false);
          setSubmitTargetSample(null);
          setParameterValues({});
        }}
        title={`Submit Lab Values - ${submitTargetSample?.sampleId || ''}`}
        size="large"
      >
        {submitTargetSample && (
          <form onSubmit={handleSubmit} className="submit-form">
            <div className="submit-sample-info">
              <h4>Sample Information</h4>
              <p><strong>Location:</strong> {submitTargetSample.address} | <strong>Collected:</strong> {new Date(submitTargetSample.collectedAt).toLocaleDateString()}</p>
            </div>

            {availableParameters.length === 0 ? (
              <div className="no-parameters-message">
                <p>No active parameters found. Please add parameters first.</p>
              </div>
            ) : (
              <>
                <div className="parameters-input-grid">
                  {availableParameters.map(param => (
                    <div
                      key={param._id}
                      className={`parameter-input-card ${parameterValues[param._id] ? 'has-value' : ''}`}
                    >
                      <div className="parameter-header">
                        <span className="parameter-code">{param.code}</span>
                        <div className="parameter-info">
                          <div className="parameter-name">{param.name}</div>
                          <div className="parameter-unit">Unit: {param.unit}</div>
                        </div>
                      </div>

                      {(param.type === 'RANGE' || param.type === 'MAX') && (
                        <div className="parameter-limits">
                          {param.type === 'RANGE' && (
                            <div className="limit-row">
                              <span className="limit-label">Acceptable Range:</span>
                              <span className="limit-value acceptable">
                                {param.acceptableLimit?.min} - {param.acceptableLimit?.max}
                              </span>
                            </div>
                          )}
                          {param.type === 'MAX' && (
                            <>
                              <div className="limit-row">
                                <span className="limit-label">Acceptable:</span>
                                <span className="limit-value acceptable">≤ {param.acceptableLimit?.max}</span>
                              </div>
                              {param.permissibleLimit?.max && (
                                <div className="limit-row">
                                  <span className="limit-label">Permissible:</span>
                                  <span className="limit-value permissible">≤ {param.permissibleLimit.max}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {param.type === 'ENUM' ? (
                        <select
                          className="form-select"
                          value={parameterValues[param._id] || ''}
                          onChange={(e) => handleParamValueChange(param._id, e.target.value)}
                        >
                          <option value="">-- Select Value --</option>
                          {param.enumValues?.map((val, idx) => (
                            <option key={idx} value={val}>{val}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={param.type === 'TEXT' ? 'text' : 'number'}
                          className="form-input"
                          placeholder={`Enter value (${param.unit})`}
                          value={parameterValues[param._id] || ''}
                          onChange={(e) => handleParamValueChange(param._id, e.target.value)}
                          step="any"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="submit-form-footer">
                  <div className="submit-stats">
                    <strong>{Object.values(parameterValues).filter(v => v !== '').length}</strong> of {availableParameters.length} parameters filled
                  </div>
                  <div className="submit-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowSubmitModal(false);
                        setSubmitTargetSample(null);
                        setParameterValues({});
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit & Publish'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Samples;
