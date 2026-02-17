import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { samplesAPI } from '../services/api';
import './CreateSample.css';

const CreateSample = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    locationName: '',
    district: '',
    state: '',
    latitude: '',
    longitude: '',
    collectedAt: new Date().toISOString().split('T')[0]
  });
  const [sampleImage, setSampleImage] = useState(null);
  const [locationImage, setLocationImage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'sample') {
      setSampleImage(file);
    } else {
      setLocationImage(file);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
        },
        (error) => {
          alert('Unable to get current location: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = new FormData();
      data.append('locationName', formData.locationName);
      data.append('district', formData.district);
      data.append('state', formData.state);
      data.append('collectedAt', formData.collectedAt);
      data.append('gps', JSON.stringify({
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude)
      }));

      if (sampleImage) {
        data.append('sampleImage', sampleImage);
      }
      if (locationImage) {
        data.append('locationImage', locationImage);
      }

      await samplesAPI.create(data);
      navigate('/my-samples');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create sample');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-sample-page">
      <div className="create-sample-header">
        <h1>Create New Sample</h1>
        <p>Submit a new environmental sample for analysis</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="create-sample-form card">
        <div className="form-group">
          <label className="form-label">Location Name *</label>
          <input
            type="text"
            name="locationName"
            className="form-input"
            value={formData.locationName}
            onChange={handleChange}
            required
            placeholder="e.g., River Ganges - Site A"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">District *</label>
            <input
              type="text"
              name="district"
              className="form-input"
              value={formData.district}
              onChange={handleChange}
              required
              placeholder="e.g., Varanasi"
            />
          </div>

          <div className="form-group">
            <label className="form-label">State *</label>
            <input
              type="text"
              name="state"
              className="form-input"
              value={formData.state}
              onChange={handleChange}
              required
              placeholder="e.g., Uttar Pradesh"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Collection Date *</label>
          <input
            type="date"
            name="collectedAt"
            className="form-input"
            value={formData.collectedAt}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude *</label>
            <input
              type="number"
              name="latitude"
              className="form-input"
              value={formData.latitude}
              onChange={handleChange}
              required
              step="any"
              min="-90"
              max="90"
              placeholder="e.g., 25.3176"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Longitude *</label>
            <input
              type="number"
              name="longitude"
              className="form-input"
              value={formData.longitude}
              onChange={handleChange}
              required
              step="any"
              min="-180"
              max="180"
              placeholder="e.g., 82.9739"
            />
          </div>

          <button type="button" className="btn btn-secondary get-location-btn" onClick={getCurrentLocation}>
            Get Current Location
          </button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Sample Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => handleFileChange(e, 'sample')}
              className="form-input file-input"
            />
            {sampleImage && <span className="file-name">{sampleImage.name}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Location Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => handleFileChange(e, 'location')}
              className="form-input file-input"
            />
            {locationImage && <span className="file-name">{locationImage.name}</span>}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Sample'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSample;
