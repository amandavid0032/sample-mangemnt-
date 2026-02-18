import React, { useEffect, useState, useCallback } from 'react';
import { samplesAPI, parametersAPI } from '../services/api';
import { Loading, Pagination, StatusBadge, Modal } from '../components/common';
import { usePagination } from '../hooks';
import './Samples.css';

/**
 * Samples Page - Admin Dashboard
 *
 * testInfo-based Workflow:
 * - fieldTested=true, labTested=false: Waiting for LAB test
 * - labTested=true, published=false: LAB done, ready to publish
 * - published=true: Sample is public
 */
const Samples = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'field_only', 'lab_done', 'published'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState(null);
  const pagination = usePagination(1, 10);

  // LAB test modal state
  const [showLabModal, setShowLabModal] = useState(false);
  const [labTargetSample, setLabTargetSample] = useState(null);
  const [labParameters, setLabParameters] = useState([]);
  const [selectedLabParams, setSelectedLabParams] = useState({}); // {paramId: true/false}
  const [labModalStep, setLabModalStep] = useState('select'); // 'select' or 'fill'
  const [parameterValues, setParameterValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchSamples = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Map statusFilter to testInfo query params
      if (statusFilter === 'field_only') {
        params.fieldTested = 'true';
        params.labTested = 'false';
      } else if (statusFilter === 'lab_done') {
        params.labTested = 'true';
        params.published = 'false';
      } else if (statusFilter === 'published') {
        params.published = 'true';
      }
      // 'all' doesn't add any filter

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

  // Open LAB test modal (for FIELD_TESTED samples)
  const openLabTestModal = async (sample) => {
    try {
      setLabTargetSample(sample);
      // Fetch only LAB parameters
      const response = await parametersAPI.getAll(false, 1, 100);
      const labParams = response.data.data.filter(p => p.isActive && p.testLocation === 'LAB');
      setLabParameters(labParams);
      // Initialize selection (all unchecked)
      const initialSelection = {};
      labParams.forEach(p => {
        initialSelection[p._id] = false;
      });
      setSelectedLabParams(initialSelection);
      setParameterValues({});
      setLabModalStep('select'); // Start with selection step
      setSelectedSample(null);
      setShowLabModal(true);
    } catch (err) {
      alert('Failed to load LAB parameters');
    }
  };

  // Toggle parameter selection
  const toggleParamSelection = (paramId) => {
    setSelectedLabParams(prev => ({
      ...prev,
      [paramId]: !prev[paramId]
    }));
  };

  // Select all parameters
  const selectAllParams = () => {
    const allSelected = {};
    labParameters.forEach(p => {
      allSelected[p._id] = true;
    });
    setSelectedLabParams(allSelected);
  };

  // Deselect all parameters
  const deselectAllParams = () => {
    const noneSelected = {};
    labParameters.forEach(p => {
      noneSelected[p._id] = false;
    });
    setSelectedLabParams(noneSelected);
  };

  // Proceed to fill values step
  const proceedToFillValues = () => {
    const selectedCount = Object.values(selectedLabParams).filter(Boolean).length;
    if (selectedCount === 0) {
      alert('Please select at least one LAB parameter');
      return;
    }
    // Initialize values for selected params only
    const initialValues = {};
    labParameters.forEach(p => {
      if (selectedLabParams[p._id]) {
        initialValues[p._id] = '';
      }
    });
    setParameterValues(initialValues);
    setLabModalStep('fill');
  };

  // Go back to selection step
  const backToSelection = () => {
    setLabModalStep('select');
  };

  // Handle parameter value change
  const handleParamValueChange = (paramId, value) => {
    setParameterValues(prev => ({
      ...prev,
      [paramId]: value
    }));
  };

  // Submit LAB test values
  const handleLabTestSubmit = async (e) => {
    e.preventDefault();

    // Build parameters array (only selected params with values)
    const selectedParamIds = Object.keys(selectedLabParams).filter(id => selectedLabParams[id]);
    const parameters = selectedParamIds
      .filter(paramId => parameterValues[paramId] !== '' && parameterValues[paramId] !== undefined)
      .map(paramId => ({
        parameterRef: paramId,
        value: isNaN(parameterValues[paramId]) ? parameterValues[paramId] : parseFloat(parameterValues[paramId])
      }));

    if (parameters.length === 0) {
      alert('Please enter values for selected LAB parameters');
      return;
    }

    // Check if all selected parameters are filled
    if (parameters.length < selectedParamIds.length) {
      const missing = selectedParamIds.length - parameters.length;
      if (!window.confirm(`${missing} selected parameter(s) are not filled. Continue anyway?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);
      await samplesAPI.submitLabTest(labTargetSample._id, parameters);
      setShowLabModal(false);
      setLabTargetSample(null);
      setParameterValues({});
      setSelectedLabParams({});
      setLabModalStep('select');
      fetchSamples();
      alert('LAB test submitted successfully! Sample is now ready for publishing.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit LAB test');
    } finally {
      setSubmitting(false);
    }
  };

  // Publish sample (LAB_TESTED → PUBLISHED)
  const handlePublish = async (sample) => {
    if (!window.confirm(`Publish sample ${sample.sampleId}? This will make it visible to the public.`)) {
      return;
    }
    try {
      await samplesAPI.publish(sample._id);
      fetchSamples();
      setSelectedSample(null);
      alert('Sample published successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish sample');
    }
  };

  // Archive sample
  const handleArchive = async (sample) => {
    if (!window.confirm(`Archive sample ${sample.sampleId}?`)) {
      return;
    }
    try {
      await samplesAPI.archive(sample._id);
      fetchSamples();
      setSelectedSample(null);
      alert('Sample archived successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive sample');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    pagination.reset();
    fetchSamples();
  };

  // Get action buttons based on testInfo status (with fallback for old samples)
  const getActionButtons = (sample) => {
    const buttons = [];
    const testInfo = sample.testInfo || {};

    // Determine status using same logic as getDisplayStatus
    const hasFieldParams = sample.parameters?.some(p => p.testLocation === 'FIELD');
    const hasLabParams = sample.parameters?.some(p => p.testLocation === 'LAB');

    const isFieldTested = testInfo.fieldTested || hasFieldParams;
    const isLabTested = testInfo.labTested || hasLabParams;
    const isPublished = testInfo.published;

    // Field tested but not lab tested - can submit LAB test
    if (isFieldTested && !isLabTested) {
      buttons.push(
        <button
          key="lab-test"
          className="btn btn-primary btn-sm"
          onClick={() => openLabTestModal(sample)}
        >
          LAB Test
        </button>
      );
    }

    // Lab tested but not published - can publish
    if (isLabTested && !isPublished) {
      buttons.push(
        <button
          key="publish"
          className="btn btn-success btn-sm"
          onClick={() => handlePublish(sample)}
        >
          Publish
        </button>
      );
    }

    // Published - can archive
    if (isPublished) {
      buttons.push(
        <button
          key="archive"
          className="btn btn-warning btn-sm"
          onClick={() => handleArchive(sample)}
        >
          Archive
        </button>
      );
    }

    return buttons;
  };

  // Get display status from testInfo (with fallback for old samples)
  const getDisplayStatus = (sample) => {
    const testInfo = sample.testInfo || {};

    // Check testInfo flags first
    if (testInfo.published) return 'PUBLISHED';
    if (testInfo.labTested) return 'LAB_TESTED';
    if (testInfo.fieldTested) return 'FIELD_TESTED';

    // Fallback: If sample has parameters, it was field tested (old samples)
    if (sample.parameters && sample.parameters.length > 0) {
      // Check if any LAB parameters exist
      const hasLabParams = sample.parameters.some(p => p.testLocation === 'LAB');
      if (hasLabParams) return 'LAB_TESTED';
      return 'FIELD_TESTED';
    }

    return 'COLLECTED';
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

  // Status filter options for tabs
  const statusOptions = [
    { key: 'all', label: 'All' },
    { key: 'published', label: 'Published' }
  ];

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="samples-page">
      <div className="samples-header">
        <h1>Sample Management</h1>
        <p>View and manage all water quality samples</p>
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
          {statusOptions.map(option => (
            <button
              key={option.key}
              className={`tab ${statusFilter === option.key ? 'active' : ''}`}
              onClick={() => { setStatusFilter(option.key); pagination.reset(); }}
            >
              {option.label}
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
                  <th>Title</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Overall</th>
                  <th>Collected By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center' }}>No samples found</td>
                  </tr>
                ) : (
                  samples.map(sample => (
                    <tr key={sample._id}>
                      <td className="sample-id-cell">{sample.sampleId}</td>
                      <td className="title-cell" title={sample.title}>{sample.title || '-'}</td>
                      <td className="address-cell" title={sample.address}>{sample.address || 'N/A'}</td>
                      <td><StatusBadge status={getDisplayStatus(sample)} /></td>
                      <td>
                        {sample.overallStatus ? (
                          <StatusBadge status={sample.overallStatus} type="condition" />
                        ) : <span className="text-muted">-</span>}
                      </td>
                      <td className="collector-cell">{sample.collectedBy?.name || '-'}</td>
                      <td className="date-cell">{new Date(sample.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedSample(sample)}
                          >
                            View
                          </button>
                          {getActionButtons(sample)}
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
                <StatusBadge status={getDisplayStatus(selectedSample)} />
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
              {selectedSample.testInfo?.fieldTested && (
                <div className="info-card">
                  <div className="info-card-icon">🔬</div>
                  <div className="info-card-content">
                    <span className="info-card-label">Field Tested</span>
                    <span className="info-card-value">
                      {selectedSample.testInfo.fieldTestedAt
                        ? new Date(selectedSample.testInfo.fieldTestedAt).toLocaleDateString()
                        : 'Yes'}
                    </span>
                  </div>
                </div>
              )}
              {selectedSample.testInfo?.labTestedBy && (
                <div className="info-card">
                  <div className="info-card-icon">🧪</div>
                  <div className="info-card-content">
                    <span className="info-card-label">Lab Tested By</span>
                    <span className="info-card-value">{selectedSample.testInfo.labTestedBy?.name || 'N/A'}</span>
                  </div>
                </div>
              )}
              {selectedSample.testInfo?.published && (
                <div className="info-card">
                  <div className="info-card-icon">✅</div>
                  <div className="info-card-content">
                    <span className="info-card-label">Published</span>
                    <span className="info-card-value">
                      {selectedSample.testInfo.publishedAt
                        ? new Date(selectedSample.testInfo.publishedAt).toLocaleDateString()
                        : 'Yes'}
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

            {/* Parameters - Show FIELD and LAB separately */}
            {selectedSample.parameters?.length > 0 && (
              <div className="parameters-section">
                <h4>Test Results ({selectedSample.parameters.length} parameters)</h4>

                {/* FIELD Parameters - Simple table without Limit/Status */}
                {selectedSample.parameters.filter(p => p.testLocation === 'FIELD').length > 0 && (
                  <>
                    <h5 className="param-section-title">FIELD Test Values</h5>
                    <div className="parameters-table-wrapper">
                      <table className="table parameters-table">
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Value</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSample.parameters
                            .filter(p => p.testLocation === 'FIELD')
                            .map((param, idx) => (
                              <tr key={idx}>
                                <td>
                                  <div className="param-name">
                                    {param.code && <code>{param.code}</code>}
                                    <span>{param.name || 'Parameter'}</span>
                                  </div>
                                </td>
                                <td className="param-value">{param.value}</td>
                                <td>{param.unit || '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                    {!selectedSample.testInfo?.labTested && (
                      <p className="field-note">Status will be calculated after LAB test</p>
                    )}
                  </>
                )}

                {/* LAB Parameters - Full table with Limit/Status */}
                {selectedSample.parameters.filter(p => p.testLocation === 'LAB').length > 0 && (
                  <>
                    <h5 className="param-section-title">LAB Test Results</h5>
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
                          {selectedSample.parameters
                            .filter(p => p.testLocation === 'LAB')
                            .map((param, idx) => (
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
                  </>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="modal-action-buttons">
              {getDisplayStatus(selectedSample) === 'FIELD_TESTED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => openLabTestModal(selectedSample)}
                >
                  Submit LAB Test
                </button>
              )}
              {getDisplayStatus(selectedSample) === 'LAB_TESTED' && (
                <button
                  className="btn btn-success"
                  onClick={() => handlePublish(selectedSample)}
                >
                  Publish
                </button>
              )}
              {getDisplayStatus(selectedSample) === 'PUBLISHED' && (
                <button
                  className="btn btn-warning"
                  onClick={() => handleArchive(selectedSample)}
                >
                  Archive
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedSample(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Submit LAB Test Modal - Two Steps */}
      <Modal
        isOpen={showLabModal}
        onClose={() => {
          setShowLabModal(false);
          setLabTargetSample(null);
          setParameterValues({});
          setSelectedLabParams({});
          setLabModalStep('select');
        }}
        title={`Submit LAB Test - ${labTargetSample?.sampleId || ''}`}
        size="large"
      >
        {labTargetSample && (
          <div className="submit-form">
            <div className="submit-sample-info">
              <h4>Sample Information</h4>
              <p>
                <strong>Title:</strong> {labTargetSample.title || 'N/A'} |
                <strong> Location:</strong> {labTargetSample.address} |
                <strong> Collected:</strong> {new Date(labTargetSample.collectedAt).toLocaleDateString()}
              </p>
            </div>

            {labParameters.length === 0 ? (
              <div className="no-parameters-message">
                <p>No active LAB parameters found. Please add LAB parameters first.</p>
              </div>
            ) : labModalStep === 'select' ? (
              /* STEP 1: Select Parameters */
              <>
                <div className="step-header">
                  <h4>Step 1: Select LAB Parameters to Test</h4>
                  <div className="select-actions">
                    <button type="button" className="btn btn-sm btn-secondary" onClick={selectAllParams}>
                      Select All
                    </button>
                    <button type="button" className="btn btn-sm btn-secondary" onClick={deselectAllParams}>
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="parameters-checkbox-grid">
                  {labParameters.map(param => (
                    <label
                      key={param._id}
                      className={`parameter-checkbox-card ${selectedLabParams[param._id] ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabParams[param._id] || false}
                        onChange={() => toggleParamSelection(param._id)}
                      />
                      <div className="parameter-checkbox-content">
                        <div className="parameter-header">
                          <span className="parameter-code">{param.code}</span>
                          <span className="parameter-location-badge lab">LAB</span>
                        </div>
                        <div className="parameter-name">{param.name}</div>
                        <div className="parameter-unit">Unit: {param.unit}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="submit-form-footer">
                  <div className="submit-stats">
                    <strong>{Object.values(selectedLabParams).filter(Boolean).length}</strong> of {labParameters.length} parameters selected
                  </div>
                  <div className="submit-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowLabModal(false);
                        setLabTargetSample(null);
                        setSelectedLabParams({});
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={proceedToFillValues}
                    >
                      Next: Enter Values
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* STEP 2: Fill Values */
              <form onSubmit={handleLabTestSubmit}>
                <div className="step-header">
                  <h4>Step 2: Enter Values for Selected Parameters</h4>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={backToSelection}>
                    Back to Selection
                  </button>
                </div>

                <div className="parameters-input-grid">
                  {labParameters
                    .filter(param => selectedLabParams[param._id])
                    .map(param => (
                      <div
                        key={param._id}
                        className={`parameter-input-card ${parameterValues[param._id] ? 'has-value' : ''}`}
                      >
                        <div className="parameter-header">
                          <span className="parameter-code">{param.code}</span>
                          <span className="parameter-location-badge lab">LAB</span>
                          <div className="parameter-info">
                            <div className="parameter-name">{param.name}</div>
                            <div className="parameter-unit">Unit: {param.unit}</div>
                          </div>
                        </div>

                        {param.type === 'ENUM' ? (
                          <select
                            className="form-select"
                            value={parameterValues[param._id] || ''}
                            onChange={(e) => handleParamValueChange(param._id, e.target.value)}
                            required
                          >
                            <option value="">-- Select Value --</option>
                            {param.enumEvaluation && Object.keys(
                              param.enumEvaluation instanceof Map
                                ? Object.fromEntries(param.enumEvaluation)
                                : param.enumEvaluation
                            ).map((val, idx) => (
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
                            required
                          />
                        )}
                      </div>
                    ))}
                </div>

                <div className="submit-form-footer">
                  <div className="submit-stats">
                    <strong>{Object.values(parameterValues).filter(v => v !== '').length}</strong> of {Object.values(selectedLabParams).filter(Boolean).length} selected parameters filled
                  </div>
                  <div className="submit-form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={backToSelection}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit LAB Test'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Samples;
