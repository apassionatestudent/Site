// => src/pages/private/Logs/logs.jsx
// => Student's own activity log history, read-only. The backend scopes
// => every row to this logged-in student, actor_type = 'Student' AND
// => actor_id = student_id, so this page can never render another
// => student's data no matter what filters are applied client-side.
// => Own copy of the search/filter/pagination pattern, no shared file
// => between pages per the no-shared-abstraction convention.

import React, { useEffect, useState } from 'react';
import axiosStudent from '../../../utils/axiosStudent.js';
import { ACTIVITY_ACTIONS } from '../../../constants/activityActions.js';
// => Icon import needed - PNG, no text/emoji icons per project convention.
// => Assumes chevron-down.png already exists at this path from another
// => page, tell me if it doesn't and I'll flag where to source/add it.
import chevronDown from '../../../assets/icons/chevron-down.png';
import LoadingState from '../../../components/private/LoadingState/loadingState.jsx';
import './logs.css';

// => How many rows per page, matches the 10-per-page convention used
// => elsewhere in the dashboard
const LOGS_PER_PAGE = 10;

// => Delays the actual API call until typing pauses, own copy per the
// => no-shared-abstraction convention
const useDebouncedValue = (value, delayMs) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [logsToday, setLogsToday] = useState(0);
  const [entityTypeOptions, setEntityTypeOptions] = useState([]);

  // => Which row is expanded to show its full action_detail, null when none
  const [expandedLogId, setExpandedLogId] = useState(null);

  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const totalPages = Math.max(1, Math.ceil(totalCount / LOGS_PER_PAGE));

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearchTerm, entityTypeFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setFetchError('');
    try {
      // => baseURL is '/api', so this hits /api/student/logs/my-logs -
      // => the backend reads req.student.student_id from the verified
      // => JWT cookie, never from anything sent here
      const res = await axiosStudent.get('/student/logs/my-logs', {
        params: {
          page,
          pageSize: LOGS_PER_PAGE,
          search: debouncedSearchTerm || undefined,
          entityType: entityTypeFilter === 'ALL' ? undefined : entityTypeFilter,
          action: actionFilter === 'ALL' ? undefined : actionFilter,
        },
      });
      setLogs(res.data.logs);
      setTotalCount(res.data.total);
      setLogsToday(res.data.logsToday);
      setEntityTypeOptions(res.data.entityTypes);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setFetchError('Failed to load your logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // => Resets to page 1 whenever a filter/search value changes - without
  //    this, changing a filter while sitting on e.g. page 3 could land on
  //    an out-of-range page with no rows to show
  const handleSearchChange = (value) => { setSearchTerm(value); setPage(1); };
  const handleEntityTypeChange = (value) => { setEntityTypeFilter(value); setPage(1); };
  const handleActionChange = (value) => { setActionFilter(value); setPage(1); };

  const toggleExpand = (logId) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  };

  // => Turns 'STATUS_CHANGE' into 'Status Change' for display
  const formatActionLabel = (value) =>
    value.toLowerCase().split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // => Three-tier color grouping, same spirit as other status badges in
  //    the dashboard, lets the student scan the table by rough category
  const actionBadgeClass = (action) => {
    const positive = ['CREATE', 'INVITE', 'DOCUMENT_ADD', 'RELEASE', 'RESTORE', 'REACTIVATE'];
    const negative = ['DELETE', 'SOFT_DELETE', 'VOID', 'SUSPEND'];
    const tier = positive.includes(action) ? 'positive' : negative.includes(action) ? 'negative' : 'neutral';
    return `logs-action-badge logs-action-badge-${tier}`;
  };

  const formatDate = (isoString) =>
    new Date(isoString).toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

  // => Builds a capped list of page numbers to render instead of one button
  // => per page, which would overflow for students with many logs (e.g. 30
  // => pages). Always shows first, last, current, and one neighbor on each
  // => side, with '...' markers filling the gaps in between.
  const getPageNumbers = (current, total) => {
    const pages = [];
    const addPage = (p) => pages.push(p);
    const addEllipsis = () => pages.push('...');

    const windowStart = Math.max(2, current - 1);
    const windowEnd = Math.min(total - 1, current + 1);

    addPage(1);
    if (windowStart > 2) addEllipsis();

    for (let p = windowStart; p <= windowEnd; p++) addPage(p);

    if (windowEnd < total - 1) addEllipsis();
    if (total > 1) addPage(total);

    return pages;
  };

  return (
    <main className="logs-page">
      <div className="logs-header">
        <div>
          <h1 className="logs-title">My Activity Logs</h1>
          <p className="logs-subtitle">
            Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> log{totalCount !== 1 ? 's' : ''}.
          </p>
        </div>

        {!loading && !fetchError && (
          <div className="logs-count-wrap">
            <div className="logs-count-item">
              <span className="logs-count-num">{logsToday}</span>
              <span className="logs-count-label">Today</span>
            </div>
            <div className="logs-count-item">
              <span className="logs-count-num">{totalCount}</span>
              <span className="logs-count-label">Total</span>
            </div>
          </div>
        )}
      </div>

      <div className="stu-search-wrap">
        <div className="stu-search-row">
          <input
            type="text"
            className="stu-search-input"
            placeholder="Search by detail..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="stu-filter-wrap">
        <div className="stu-filter-group">
          <span className="stu-filter-label">Entity Type</span>
          <select
            className="stu-filter-select"
            value={entityTypeFilter}
            onChange={(e) => handleEntityTypeChange(e.target.value)}
          >
            <option value="ALL">All</option>
            {entityTypeOptions.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="stu-filter-group">
          <span className="stu-filter-label">Action</span>
          <select
            className="stu-filter-select"
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="ALL">All</option>
            {Object.values(ACTIVITY_ACTIONS).map((value) => (
              <option key={value} value={value}>{formatActionLabel(value)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading your logs..." />
      ) : fetchError ? (
        <LoadingState variant="error" message={fetchError} onRetry={fetchLogs} />
      ) : (
        // => wrapper scrolls horizontally on narrow screens instead of the
        // => whole page, same pattern as class-detail-table-wrapper
        <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="logs-empty">
                  {totalCount > 0 ? 'No logs match this filter.' : 'No activity yet.'}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <React.Fragment key={log.log_id}>
                  <tr className="logs-row" onClick={() => toggleExpand(log.log_id)}>
                    <td>{log.actor_name}</td>
                    <td>
                      <span className={actionBadgeClass(log.action)}>{formatActionLabel(log.action)}</span>
                    </td>
                    <td className="logs-detail-cell" title={log.action_detail}>
                      {log.action_detail}
                    </td>
                    <td>{formatDate(log.created_at)}</td>
                    <td>
                      <img
                        src={chevronDown}
                        alt="Expand row"
                        className={`logs-chevron ${expandedLogId === log.log_id ? 'logs-chevron-open' : ''}`}
                      />
                    </td>
                  </tr>
                  {expandedLogId === log.log_id && (
                    <tr className="logs-detail-row">
                      <td colSpan={5}>
                        <div className="logs-detail-full">
                          {log.entity_type && (
                            <p><strong>Entity:</strong> {log.entity_type} #{log.entity_id}</p>
                          )}
                          <p><strong>Detail:</strong> {log.action_detail}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}

      {!loading && !fetchError && totalPages > 1 && (
        <div className="logs-pagination">
          <button
            className="logs-page-btn"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          {/* => Capped page list instead of one button per page - see getPageNumbers above */}
          {getPageNumbers(page, totalPages).map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="logs-page-ellipsis">...</span>
            ) : (
              <button
                key={p}
                className={`logs-page-btn ${p === page ? 'logs-page-btn--active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="logs-page-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}