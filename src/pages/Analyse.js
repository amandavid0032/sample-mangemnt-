import React, { useEffect, useState, useCallback } from 'react';
import { samplesAPI, parametersAPI } from '../services/api';
import { Loading, Pagination, Modal } from '../components/common';
import { usePagination } from '../hooks';
import './Analyse.css';

const Analyse = () => {
  const [samples, setSamples] = useState([]);
  const [availableParameters, setAvailableParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const pagination = usePagination(1, 10);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [samplesRes, paramsRes] = await Promise.all([
        samplesAPI.getAll({
          page: pagination.page,
          limit: pagination.limit,
          lifecycleStatus: 'ACCEPTED'
        }),
        parametersAPI.getAll()
      ]);

      setSamples(samplesRes.data.data);
      pagination.updatePagination(samplesRes.data.pagination);
      setAvailableParameters(paramsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAnalyseModal = (sample) => {
    setSelectedSample(sample);
    // Initialize with all active parameters
    setParameters(
      availableParameters.map(param => ({
        parameterRef: param._id,
        parameterName: param.name,
        unit: param.unit,
        limitType: param.limitType || param.type,
        enumOptions: param.enumOptions || [],
        value: ''
      }))
    );
  };

  const updateParameter = (index, value) => {
    const updated = [...parameters];
    updated[index].value = value;
    setParameters(updated);
  };

  const handleAnalyse = async () => {
    // Filter only parameters with values
    const filledParameters = parameters
      .filter(p => p.value !== '' && p.value !== null)
      .map(p => ({
        parameterRef: p.parameterRef,
        value: p.limitType === 'TEXT' || p.limitType === 'ENUM' || p.limitType === 'text' || p.limitType === 'enum'
          ? p.value
          : parseFloat(p.value)
      }));

    if (filledParameters.length === 0) {
      alert('Please enter at least one parameter value');
      return;
    }

    try {
      setSubmitting(true);
      await samplesAPI.analyse(selectedSample._id, filledParameters);
      setSelectedSample(null);
      setParameters([]);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to analyse sample');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="analyse-page">
      <div className="analyse-header">
        <h1>Analyse Samples</h1>
        <p>Enter parameter values for accepted samples</p>
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
                  <th>Location</th>
                  <th>District</th>
                  <th>State</th>
                  <th>Collection Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {samples.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center' }}>
                      No accepted samples to analyse
                    </td>
                  </tr>
                ) : (
                  samples.map(sample => (
                    <tr key={sample._id}>
                      <td><strong>{sample.sampleId}</strong></td>
                      <td>{sample.locationName}</td>
                      <td>{sample.district}</td>
                      <td>{sample.state}</td>
                      <td>{new Date(sample.collectedAt || sample.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openAnalyseModal(sample)}
                        >
                          Analyse
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
      )}

      <Modal
        isOpen={!!selectedSample}
        onClose={() => { setSelectedSample(null); setParameters([]); }}
        title="Analyse Sample"
      >
        {selectedSample && (
          <div className="analyse-modal">
            <div className="sample-info">
              <p><strong>Sample ID:</strong> {selectedSample.sampleId}</p>
              <p><strong>Location:</strong> {selectedSample.locationName}</p>
              <p><strong>District:</strong> {selectedSample.district}, {selectedSample.state}</p>
            </div>

            <div className="parameters-form">
              <h4>Enter Parameter Values</h4>
              <p className="form-hint">Fill in the measured values. Status will be calculated automatically.</p>

              <div className="parameters-grid">
                {parameters.map((param, index) => (
                  <div key={param.parameterRef} className="parameter-input-group">
                    <label className="form-label">
                      {param.parameterName} ({param.unit})
                    </label>
                    {(param.limitType === 'ENUM' || param.limitType === 'enum') ? (
                      <select
                        value={param.value}
                        onChange={(e) => updateParameter(index, e.target.value)}
                        className="form-input"
                      >
                        <option value="">Select...</option>
                        {param.enumOptions?.map((opt, optIdx) => (
                          <option key={optIdx} value={opt.value}>{opt.value}</option>
                        ))}
                      </select>
                    ) : (param.limitType === 'TEXT' || param.limitType === 'text') ? (
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => updateParameter(index, e.target.value)}
                        className="form-input"
                        placeholder="Enter value"
                      />
                    ) : (
                      <input
                        type="number"
                        value={param.value}
                        onChange={(e) => updateParameter(index, e.target.value)}
                        className="form-input"
                        step="any"
                        placeholder="Enter value"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setSelectedSample(null); setParameters([]); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAnalyse}
                disabled={submitting}
              >
                {submitting ? 'Analysing...' : 'Submit Analysis'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Analyse;
