import React from 'react';

const Pagination = ({ page, totalPages, onPageChange, hasNextPage, hasPrevPage }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;
    let start = Math.max(1, page - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="pagination">
      <button onClick={() => onPageChange(page - 1)} disabled={!hasPrevPage}>
        Previous
      </button>
      {getPageNumbers().map(pageNum => (
        <button
          key={pageNum}
          onClick={() => onPageChange(pageNum)}
          className={pageNum === page ? 'active' : ''}
        >
          {pageNum}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={!hasNextPage}>
        Next
      </button>
    </div>
  );
};

export default Pagination;
