import React from 'react';

const StatusBadge = ({ status, type = 'sample' }) => {
  const safeStatus = status || 'N/A';

  const getClassName = () => {
    return `badge badge-${safeStatus.toLowerCase().replace(/\s+/g, '-')}`;
  };

  return <span className={getClassName()}>{safeStatus}</span>;
};

export default StatusBadge;
