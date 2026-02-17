import React, { useEffect, useState, useCallback } from 'react';
import { parametersAPI } from '../services/api';
import { Loading, Modal, Pagination } from '../components/common';
import { usePagination } from '../hooks';
import './Parameters.css';

// IS 10500:2012 Water Quality Parameters - 12 Parameters as per documentation
const WATER_QUALITY_PRESETS = [
  // 1. Temperature - TEXT (free text input)
  { code: 'TEMPERATURE', name: 'Temperature', unit: '-', type: 'TEXT', testMethod: '-' },

  // 2. pH - RANGE (6.5 to 8.5)
  { code: 'PH', name: 'pH', unit: '-', type: 'RANGE', acceptableMin: 6.5, acceptableMax: 8.5, testMethod: 'IS 3025 Part 11' },

  // 3. Apparent Colour - ENUM (dropdown)
  { code: 'APPARENT_COLOUR', name: 'Apparent Colour', unit: '-', type: 'ENUM', enumValues: 'Clear, Yellowish, Brownish, Blackish', testMethod: '-' },

  // 4. True Colour - MAX (5 Hazen)
  { code: 'TRUE_COLOUR', name: 'True Colour', unit: 'Hazen', type: 'MAX', acceptableMax: 5, permissibleMax: 15, testMethod: 'IS 3025 (Part 4)' },

  // 5. Odour - ENUM (dropdown)
  { code: 'ODOUR', name: 'Odour', unit: '-', type: 'ENUM', enumValues: 'Unobjectionable, Earthy, Sewer smell', testMethod: 'IS 3025 (Part 5)' },

  // 6. Turbidity - MAX (1 NTU)
  { code: 'TURBIDITY', name: 'Turbidity', unit: 'NTU', type: 'MAX', acceptableMax: 1, permissibleMax: 5, testMethod: 'IS 3025 (Part 10)' },

  // 7. Total Dissolved Solids - MAX (500 mg/L)
  { code: 'TDS', name: 'Total Dissolved Solids', unit: 'mg/L', type: 'MAX', acceptableMax: 500, permissibleMax: 2000, testMethod: 'IS 3025 (Part 16)' },

  // 8. Aluminum - MAX (0.03 mg/L)
  { code: 'ALUMINUM', name: 'Aluminum (as Al)', unit: 'mg/L', type: 'MAX', acceptableMax: 0.03, permissibleMax: 0.2, testMethod: 'IS 3025 (Part 55)' },

  // 9. Ammonia - MAX (0.5 mg/L)
  { code: 'AMMONIA', name: 'Ammonia (as Total Ammonia-N)', unit: 'mg/L', type: 'MAX', acceptableMax: 0.5, permissibleMax: 0.5, testMethod: 'IS 3025 (Part 34)' },

  // 10. Chloride - MAX (250 mg/L)
  { code: 'CHLORIDE', name: 'Chloride (as Cl)', unit: 'mg/L', type: 'MAX', acceptableMax: 250, permissibleMax: 1000, testMethod: 'IS 3025 (Part 32)' },

  // 11. Free Residual Chlorine - MAX (0.2 mg/L)
  { code: 'FREE_CHLORINE', name: 'Free Residual Chlorine', unit: 'mg/L', type: 'MAX', acceptableMax: 0.2, permissibleMax: 1.0, testMethod: 'IS 3024 (Part 26)' },

  // 12. Total Hardness - MAX (200 mg/L)
  { code: 'HARDNESS', name: 'Total Hardness (as CaCO3)', unit: 'mg/L', type: 'MAX', acceptableMax: 200, permissibleMax: 600, testMethod: 'IS 3024 (Part 21)' }
];

const Parameters = () => {
  const [parameters, setParameters] = useState([]);
  const [allParameterCodes, setAllParameterCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingParam, setEditingParam] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const pagination = usePagination(1, 10);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: '',
    type: 'MAX',
    acceptableMin: '',
    acceptableMax: '',
    permissibleMin: '',
    permissibleMax: '',
    enumValues: '',
    testMethod: ''
  });

  const fetchParameters = useCallback(async () => {
    try {
      setLoading(true);
      const [paginatedResponse, allResponse] = await Promise.all([
        parametersAPI.getAll(true, pagination.page, pagination.limit),
        parametersAPI.getAllForDropdown()
      ]);
      setParameters(paginatedResponse.data.data);
      // Get all existing codes to filter presets
      setAllParameterCodes(allResponse.data.data.map(p => p.code));
      if (paginatedResponse.data.pagination) {
        pagination.updatePagination(paginatedResponse.data.pagination);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load parameters');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      unit: '',
      type: 'MAX',
      acceptableMin: '',
      acceptableMax: '',
      permissibleMin: '',
      permissibleMax: '',
      enumValues: '',
      testMethod: ''
    });
    setEditingParam(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (param) => {
    setEditingParam(param);
    setFormData({
      code: param.code || '',
      name: param.name || '',
      unit: param.unit || '',
      type: param.type || 'MAX',
      acceptableMin: param.acceptableLimit?.min ?? '',
      acceptableMax: param.acceptableLimit?.max ?? '',
      permissibleMin: param.permissibleLimit?.min ?? '',
      permissibleMax: param.permissibleLimit?.max ?? '',
      enumValues: param.enumValues?.join(', ') || '',
      testMethod: param.testMethod || ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle preset selection
  const handlePresetSelect = (e) => {
    const presetCode = e.target.value;
    if (!presetCode) return;

    const preset = WATER_QUALITY_PRESETS.find(p => p.code === presetCode);
    if (preset) {
      setFormData({
        code: preset.code,
        name: preset.name,
        unit: preset.unit,
        type: preset.type,
        acceptableMin: preset.acceptableMin ?? '',
        acceptableMax: preset.acceptableMax ?? '',
        permissibleMin: preset.permissibleMin ?? '',
        permissibleMax: preset.permissibleMax ?? '',
        enumValues: preset.enumValues || '',
        testMethod: preset.testMethod || ''
      });
    }
  };

  // Count available presets (12 total parameters)
  const availablePresetsCount = WATER_QUALITY_PRESETS.filter(p => !allParameterCodes.includes(p.code)).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        unit: formData.unit,
        type: formData.type,
        testMethod: formData.testMethod || ''
      };

      // Set limits based on type
      if (formData.type === 'RANGE') {
        data.acceptableLimit = {
          min: formData.acceptableMin !== '' ? parseFloat(formData.acceptableMin) : null,
          max: formData.acceptableMax !== '' ? parseFloat(formData.acceptableMax) : null
        };
        if (formData.permissibleMin !== '' || formData.permissibleMax !== '') {
          data.permissibleLimit = {
            min: formData.permissibleMin !== '' ? parseFloat(formData.permissibleMin) : null,
            max: formData.permissibleMax !== '' ? parseFloat(formData.permissibleMax) : null
          };
        }
      } else if (formData.type === 'MAX') {
        data.acceptableLimit = {
          min: null,
          max: formData.acceptableMax !== '' ? parseFloat(formData.acceptableMax) : null
        };
        if (formData.permissibleMax !== '') {
          data.permissibleLimit = {
            min: null,
            max: parseFloat(formData.permissibleMax)
          };
        }
      } else if (formData.type === 'ENUM') {
        // Parse comma-separated enum values
        data.enumValues = formData.enumValues
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0);
      }

      if (editingParam) {
        await parametersAPI.update(editingParam._id, data);
      } else {
        await parametersAPI.create(data);
      }

      setShowModal(false);
      resetForm();
      fetchParameters();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save parameter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await parametersAPI.toggle(id);
      fetchParameters();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle parameter');
    }
  };

  const getStandardDisplay = (param) => {
    switch (param.type) {
      case 'RANGE':
        const accMin = param.acceptableLimit?.min;
        const accMax = param.acceptableLimit?.max;
        if (accMin !== null && accMax !== null) {
          return `${accMin} - ${accMax}`;
        }
        return 'N/A';
      case 'MAX':
        const acceptable = param.acceptableLimit?.max;
        const permissible = param.permissibleLimit?.max;
        if (permissible !== null && permissible !== undefined) {
          return `Acceptable: ≤${acceptable}, Permissible: ≤${permissible}`;
        }
        return acceptable !== null ? `≤ ${acceptable}` : 'N/A';
      case 'ENUM':
        return param.enumValues?.join(', ') || 'N/A';
      case 'TEXT':
        return 'Text input';
      default:
        return 'N/A';
    }
  };

  // Calculate serial number based on pagination
  const getSerialNumber = (index) => {
    return (pagination.page - 1) * pagination.limit + index + 1;
  };

  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="parameters-page">
      <div className="parameters-header">
        <div>
          <h1>Parameter Master</h1>
          <p>Manage water quality parameters (IS 10500:2012 Standards)</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          Add Parameter
        </button>
      </div>

      {loading ? (
        <Loading message="Loading parameters..." />
      ) : (
        <>
          <div className="table-container card">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Parameter</th>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Standard Limit</th>
                  <th>Test Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parameters.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center' }}>No parameters found</td>
                  </tr>
                ) : (
                  parameters.map((param, index) => (
                    <tr key={param._id} className={!param.isActive ? 'inactive-row' : ''}>
                      <td className="serial-number">{getSerialNumber(index)}</td>
                      <td><code className="param-code">{param.code}</code></td>
                      <td><strong>{param.name}</strong></td>
                      <td>{param.unit}</td>
                      <td>
                        <span className={`type-badge type-${param.type?.toLowerCase()}`}>
                          {param.type || 'N/A'}
                        </span>
                      </td>
                      <td className="limit-cell">{getStandardDisplay(param)}</td>
                      <td className="test-method-cell">{param.testMethod || 'N/A'}</td>
                      <td>
                        <span className={`status-indicator ${param.isActive ? 'active' : 'inactive'}`}>
                          {param.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openEditModal(param)}
                          >
                            Edit
                          </button>
                          <button
                            className={`btn btn-sm ${param.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggle(param._id)}
                          >
                            {param.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={pagination.goToPage}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
            />
          )}

          <div className="pagination-info">
            Showing {parameters.length} of {pagination.totalItems || parameters.length} parameters
          </div>
        </>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingParam ? 'Edit Parameter' : 'Add Parameter'}
      >
        <form onSubmit={handleSubmit}>
          {/* Preset Selector */}
          {!editingParam && (
            <div className="preset-selector">
              <label className="form-label">
                Select Parameter
                <span className="preset-count">({availablePresetsCount} remaining)</span>
              </label>
              {availablePresetsCount === 0 ? (
                <div className="all-presets-added">
                  All 12 standard parameters have been added!
                </div>
              ) : (
                <select
                  className="form-input preset-dropdown"
                  onChange={handlePresetSelect}
                  defaultValue=""
                >
                  <option value="">-- Select a parameter --</option>
                  {WATER_QUALITY_PRESETS.filter(p => !allParameterCodes.includes(p.code)).map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <small className="form-help">Only shows parameters not yet added to the database</small>
            </div>
          )}

          <div className="form-divider"></div>

          <div className="form-row-modal">
            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                name="code"
                className="form-input"
                value={formData.code}
                onChange={handleChange}
                required
                placeholder="e.g., PH, TDS, CHLORIDE"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Parameter Name *</label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., pH, Total Dissolved Solids"
              />
            </div>
          </div>

          <div className="form-row-modal">
            <div className="form-group">
              <label className="form-label">Unit *</label>
              <input
                type="text"
                name="unit"
                className="form-input"
                value={formData.unit}
                onChange={handleChange}
                required
                placeholder="e.g., mg/L, NTU, -"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                name="type"
                className="form-input"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="MAX">Maximum Limit</option>
                <option value="RANGE">Range (Min-Max)</option>
                <option value="ENUM">Options (Enum)</option>
                <option value="TEXT">Text Input</option>
              </select>
            </div>
          </div>

          {formData.type === 'RANGE' && (
            <>
              <div className="form-row-modal">
                <div className="form-group">
                  <label className="form-label">Acceptable Min *</label>
                  <input
                    type="number"
                    name="acceptableMin"
                    className="form-input"
                    value={formData.acceptableMin}
                    onChange={handleChange}
                    required
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Acceptable Max *</label>
                  <input
                    type="number"
                    name="acceptableMax"
                    className="form-input"
                    value={formData.acceptableMax}
                    onChange={handleChange}
                    required
                    step="any"
                  />
                </div>
              </div>
              <div className="form-row-modal">
                <div className="form-group">
                  <label className="form-label">Permissible Min (Optional)</label>
                  <input
                    type="number"
                    name="permissibleMin"
                    className="form-input"
                    value={formData.permissibleMin}
                    onChange={handleChange}
                    step="any"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Permissible Max (Optional)</label>
                  <input
                    type="number"
                    name="permissibleMax"
                    className="form-input"
                    value={formData.permissibleMax}
                    onChange={handleChange}
                    step="any"
                  />
                </div>
              </div>
            </>
          )}

          {formData.type === 'MAX' && (
            <div className="form-row-modal">
              <div className="form-group">
                <label className="form-label">Acceptable Limit * (≤ value = ACCEPTABLE)</label>
                <input
                  type="number"
                  name="acceptableMax"
                  className="form-input"
                  value={formData.acceptableMax}
                  onChange={handleChange}
                  required
                  step="any"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Permissible Limit (≤ value = PERMISSIBLE)</label>
                <input
                  type="number"
                  name="permissibleMax"
                  className="form-input"
                  value={formData.permissibleMax}
                  onChange={handleChange}
                  step="any"
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {formData.type === 'ENUM' && formData.enumValues && (
            <div className="form-group">
              <label className="form-label">Select {formData.name} *</label>
              <select className="form-input enum-value-dropdown">
                <option value="">-- Select {formData.name} --</option>
                {formData.enumValues.split(',').map((val, idx) => {
                  const trimmedVal = val.trim();
                  return <option key={idx} value={trimmedVal}>{trimmedVal}</option>;
                })}
              </select>
              <small className="form-help">Dropdown preview - select a value</small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Test Method (IS Standard)</label>
            <input
              type="text"
              name="testMethod"
              className="form-input"
              value={formData.testMethod}
              onChange={handleChange}
              placeholder="e.g., IS 3025 Part 11 (1983)"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : (editingParam ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Parameters;
