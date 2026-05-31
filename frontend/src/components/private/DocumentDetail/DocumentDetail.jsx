import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import './DocumentDetail.css';

// icons
import loadingIcon from "../../../assets/icons/loading.png";
import errorIcon   from "../../../assets/icons/warning.png";

// => Formats ISO date string to readable date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

// => Derives a display-friendly file type label from the document_key extension
const getFileType = (documentKey) => {
  if (!documentKey) return 'Unknown';
  const ext = documentKey.split('.').pop().toLowerCase();
  if (ext === 'pdf')             return 'PDF';
  if (['jpg', 'jpeg'].includes(ext)) return 'JPEG Image';
  if (ext === 'png')             return 'PNG Image';
  return ext.toUpperCase();
};

function DocumentDetail() {
  const { publicId } = useParams();
  const navigate     = useNavigate();

  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError,   setDetailError]   = useState(null);

  // => Separate state for the preview - file loading is independent from metadata loading
  const [previewUrl,     setPreviewUrl]     = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState(null);

  // => Fetch document metadata on mount using publicId from the URL
  useEffect(() => {
    if (!publicId) return;

    const fetchDetail = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/documents/detail/${publicId}`, {
          credentials: 'include', // => sends the httpOnly JWT cookie
        });
        if (res.status === 404) throw new Error('Document not found.');
        if (!res.ok) throw new Error('Failed to fetch document details.');
        const data = await res.json();
        setDetail(data.document);
      } catch (err) {
        setDetailError(err.message);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [publicId]);

  // => Once metadata is loaded, fetch the actual file through the proxy
  // => The document_key is encoded so slashes don't break the URL param
  useEffect(() => {
    if (!detail?.document_key) return;

    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const encodedKey = encodeURIComponent(detail.document_key);
        const res = await fetch(`/api/documents/${encodedKey}`, {
          credentials: 'include', // => sends the httpOnly JWT cookie
        });
        if (!res.ok) throw new Error('Failed to load file preview.');

        // => Convert the streamed response to a blob URL for inline preview
        // => This keeps the actual R2 key out of the browser's address bar
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (err) {
        setPreviewError(err.message);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();

    // => Clean up the blob URL when the component unmounts or detail changes
    // => Prevents memory leaks from orphaned object URLs
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [detail]);

  const handleBack = () => {
    navigate('/dashboard/documents');
  };

  // => Determines whether to render an <img> or <iframe> based on file extension
  const isPdf = detail?.document_key?.toLowerCase().endsWith('.pdf');

  return (
    <div className="doc-detail-page">
      <button className="doc-back" onClick={handleBack}>
        ← Back to Documents
      </button>

      {detailLoading && (
        <div className="doc-detail-empty">
          <img src={loadingIcon} alt="" className="doc-detail-empty-icon" />
          <p>Loading document details...</p>
        </div>
      )}

      {detailError && (
        <div className="doc-detail-empty">
          <img src={errorIcon} alt="" className="doc-detail-empty-icon" />
          <p>{detailError}</p>
        </div>
      )}

      {!detailLoading && !detailError && detail && (
        <div className="doc-detail">

          {/* => Metadata header */}
          <div className="doc-detail-header">
            <div>
              <h2 className="doc-detail-title">{detail.document_type}</h2>
              {detail.course_name && (
                <p className="doc-detail-sub">
                  {detail.course_name}
                  {detail.sector ? ` · ${detail.sector}` : ''}
                </p>
              )}
            </div>
            <span className={`doc-detail-badge source--${detail.source}`}>
              {detail.source === 'enrollment' ? 'Enrollment Doc' : 'Profile Doc'}
            </span>
          </div>

          {/* => Metadata grid */}
          <div className="doc-detail-grid">

            <div className="doc-detail-card">
              <p className="doc-detail-label">File Type</p>
              <p className="doc-detail-value">{getFileType(detail.document_key)}</p>
            </div>

            <div className="doc-detail-card">
              <p className="doc-detail-label">Uploaded</p>
              <p className="doc-detail-value">{formatDate(detail.uploaded_at)}</p>
            </div>

            {/* => Only shown for enrollment documents */}
            {detail.source === 'enrollment' && (
              <>
                <div className="doc-detail-card">
                  <p className="doc-detail-label">Enrollment Status</p>
                  <p className="doc-detail-value">{detail.enrollment_status ?? '-'}</p>
                </div>

                <div className="doc-detail-card">
                  <p className="doc-detail-label">Enrollment Submitted</p>
                  <p className="doc-detail-value">{formatDate(detail.enrollment_submitted_at)}</p>
                </div>
              </>
            )}

          </div>

          {/* => File preview section */}
          <div className="doc-preview-section">
            <p className="doc-preview-label">Preview</p>

            {previewLoading && (
              <div className="doc-preview-loading">
                <img src={loadingIcon} alt="" className="doc-detail-empty-icon" />
                <p>Loading preview...</p>
              </div>
            )}

            {previewError && !previewLoading && (
              <div className="doc-preview-error">
                <img src={errorIcon} alt="" className="doc-detail-empty-icon" />
                <p>{previewError}</p>
              </div>
            )}

            {previewUrl && !previewLoading && (
              isPdf ? (
                // => PDFs rendered in an iframe - browser's native PDF viewer handles it
                <iframe
                  src={previewUrl}
                  className="doc-preview-iframe"
                  title={detail.document_type}
                />
              ) : (
                // => Images rendered with a standard img tag
                <img
                  src={previewUrl}
                  alt={detail.document_type}
                  className="doc-preview-img"
                />
              )
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default DocumentDetail;
