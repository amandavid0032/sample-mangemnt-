import React from 'react';

const Loading = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>{message}</p>
    </div>
  );
};

export default Loading;
