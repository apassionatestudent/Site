import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BackButton from '../BackButton/BackButton.jsx';
import RateLimitNotice from '../../../components/RateLimitNotice.jsx';

import './DocumentDetail.css';
import axiosStudent from '../../../utils/axiosStudent.js';
import LoadingState from '../LoadingState/loadingState.jsx';

// icons
// => loadingIcon/errorIcon still used inside the preview section below
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
  const [rateLimitInfo, setRateLimitInfo] = useState(null); // => seconds remaining, null if not rate limited

  // => Separate state for the preview - file loading is independent from metadata loading
  const [previewUrl,     setPreviewUrl]     = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState(null);

  // => Wrapped in useCallback so RateLimitNotice can call this exact same
  // => function again once its countdown finishes, same pattern as Enrollment.jsx
  const fetchDetail = useCallback(async () => {
    if (!publicId) return;
    setDetailLoading(true);
    setDetailError(null);
    setRateLimitInfo(null);
    try {
      // => axiosStudent attaches the httpOnly JWT cookie and CSRF token
      // => automatically, and its 401 interceptor handles expired sessions
      const response = await axiosStudent.get(`/documents/detail/${publicId}`);
      setDetail(response.data.document);
    } catch (err) {
      if (err.response?.status === 429) {
        // => Backend sends { error, message, retryAfter } in the JSON body
        const retryAfter = err.response.data?.retryAfter || 60;
        setRateLimitInfo(retryAfter);
      } else if (err.response?.status === 404) {
        setDetailError('Document not found.');
      } else {
        setDetailError('Failed to fetch document details.');
      }
    } finally {
      setDetailLoading(false);
    }
  }, [publicId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // => Once metadata is loaded, fetch the actual file through the proxy
  // => The document_key is encoded so slashes don't break the URL param
  useEffect(() => {
    if (!detail?.document_key) return;

    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const encodedKey = encodeURIComponent(detail.document_key);
        // => responseType: 'blob' tells axios to keep the response binary
        // => instead of trying to parse it as JSON, same result as res.blob() before
        const response = await axiosStudent.get(`/documents/${encodedKey}`, {
          responseType: 'blob',
        });

        // => Convert the streamed response to a blob URL for inline preview
        // => This keeps the actual R2 key out of the browser's address bar
        const url = URL.createObjectURL(response.data);
        setPreviewUrl(url);
      } catch (err) {
        setPreviewError('Failed to load file preview.');
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
      {/*  Back button  */}
      <BackButton destination="Documents" onClick={() => navigate('/dashboard/documents')} />


      {rateLimitInfo && (
        <div className="doc-detail-empty">
          <img src={errorIcon} alt="" className="doc-detail-empty-icon" />
          <RateLimitNotice retryAfter={rateLimitInfo} onRetry={fetchDetail} />
        </div>
      )}

      {/* => shared spinner, keeps loading UI consistent across dashboard pages */}
      {!rateLimitInfo && detailLoading && <LoadingState message="Loading document details..." />}

      {!rateLimitInfo && detailError && (
        <div className="doc-detail-empty">
          <img src={errorIcon} alt="" className="doc-detail-empty-icon" />
          <p>{detailError}</p>
        </div>
      )}

      {!rateLimitInfo && !detailLoading && !detailError && detail && (
        <div className="doc-detail">

          {/* => Metadata header */}
          <div className="doc-detail-header">
            <div>
              <h2 className="doc-detail-title">{detail.document_type}</h2>
              {detail.enrollment_type === 'SHS' ? (
                detail.track && (
                  <p className="doc-detail-sub">
                    {detail.track}
                    {detail.cluster ? ` – ${detail.cluster}` : ''}
                  </p>
                )
              ) : (
                detail.course_name && (
                  <p className="doc-detail-sub">
                    {detail.course_name}
                    {detail.sector ? ` · ${detail.sector}` : ''}
                  </p>
                )
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

                {/* => Deep link to the full enrollment this document belongs to -
                    => enrollment_public_id + enrollment_type both already come
                    => back from documentModel.js, just weren't used until now */}
                <div className="doc-detail-card">
                  <p className="doc-detail-label">Linked Enrollment</p>
                  <button
                    type="button"
                    className="doc-detail-link"
                    onClick={() =>
                      navigate(
                        detail.enrollment_type === 'SHS'
                          ? `/dashboard/enrollment/shs/${detail.enrollment_public_id}`
                          : `/dashboard/enrollment/tesda/${detail.enrollment_public_id}`
                      )
                    }
                  >
                    View full enrollment <i className="ti ti-arrow-right" />
                  </button>
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
