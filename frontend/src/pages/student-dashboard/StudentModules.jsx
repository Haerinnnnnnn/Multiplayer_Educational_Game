import React, { useMemo, useState } from 'react';
import { Feedback } from '../../components/Common.jsx';

const CREATED_FILTERS = {
  all: { label: 'All time', days: null },
  week: { label: 'Within 7 days', days: 7 },
  month: { label: 'Within 30 days', days: 30 },
};

function ModuleAccessBadge({ module }) {
  if (module.memberStatus === 'joined') return <span className="visibility-badge public">Joined</span>;
  if (module.requestStatus === 'pending') return <span className="review-badge pending">Pending</span>;
  if (module.requestStatus === 'rejected') return <span className="review-badge rejected">Rejected</span>;
  return <span className={`visibility-badge ${module.visibility === 'public' ? 'public' : 'private'}`}>{module.visibility === 'public' ? 'Public' : 'Private'}</span>;
}

function getCreatedFilterMatch(module, createdFilter) {
  const filter = CREATED_FILTERS[createdFilter] || CREATED_FILTERS.all;

  if (!filter.days) {
    return true;
  }

  if (!module.createdAt) {
    return false;
  }

  const createdTime = new Date(module.createdAt).getTime();

  if (Number.isNaN(createdTime)) {
    return false;
  }

  const earliestTime = Date.now() - filter.days * 24 * 60 * 60 * 1000;
  return createdTime >= earliestTime;
}

function getJoinFilterMatch(module, joinFilter) {
  if (joinFilter === 'joined') return module.memberStatus === 'joined';
  if (joinFilter === 'not_joined') return module.memberStatus !== 'joined' && !module.requestStatus;
  if (joinFilter === 'pending') return module.requestStatus === 'pending';
  if (joinFilter === 'rejected') return module.requestStatus === 'rejected';
  return true;
}

function getAccessFilterMatch(module, accessFilter) {
  if (accessFilter === 'locked') return module.isLocked;
  if (accessFilter === 'public') return !module.isLocked && module.visibility === 'public';
  if (accessFilter === 'private') return !module.isLocked && module.visibility !== 'public';
  return true;
}

export function StudentModules({ modules, onJoinPublic, onRequestPrivate, loading, error }) {
  const [requestMessages, setRequestMessages] = useState({});
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    access: 'all',
    created: 'all',
    joined: 'all',
    search: '',
  });

  const filteredModules = useMemo(() => {
    const searchText = filters.search.trim().toLowerCase();

    return modules.filter((module) => {
      const searchMatch = !searchText || [module.moduleCode, module.title, module.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText));

      return (
        searchMatch &&
        getCreatedFilterMatch(module, filters.created) &&
        getJoinFilterMatch(module, filters.joined) &&
        getAccessFilterMatch(module, filters.access)
      );
    });
  }, [filters, modules]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ access: 'all', created: 'all', joined: 'all', search: '' });
  }

  if (loading) return <section className="panel student-dashboard-panel-in">Loading modules...</section>;
  if (error) return <Feedback text={error} />;

  return (
    <section className="student-module-list student-dashboard-panel-in">
      <div className="student-module-filter-panel collapsible-filter-panel">
        <div className="collapsible-filter-header">
          <div>
            <p className="eyebrow">Module Filter</p>
            <h2>Find Modules</h2>
            <p className="muted">Showing {filteredModules.length} of {modules.length} modules.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            {filtersOpen ? 'Hide Filter' : 'Show Filter'}
          </button>
        </div>
        {filtersOpen && (
          <div className="collapsible-filter-body">
            <div className="student-module-filter-grid">
              <label>
                Search
                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Module name, code, description"
                />
              </label>
              <label>
                Created
                <select value={filters.created} onChange={(event) => updateFilter('created', event.target.value)}>
                  {Object.entries(CREATED_FILTERS).map(([value, filter]) => (
                    <option key={value} value={value}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Join Status
                <select value={filters.joined} onChange={(event) => updateFilter('joined', event.target.value)}>
                  <option value="all">All modules</option>
                  <option value="joined">Joined</option>
                  <option value="not_joined">Not joined</option>
                  <option value="pending">Request pending</option>
                  <option value="rejected">Request rejected</option>
                </select>
              </label>
              <label>
                Access
                <select value={filters.access} onChange={(event) => updateFilter('access', event.target.value)}>
                  <option value="all">All access</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="locked">Locked</option>
                </select>
              </label>
            </div>
            <button className="secondary-button" type="button" onClick={resetFilters}>Clear Filter</button>
          </div>
        )}
      </div>

      {filteredModules.map((module) => {
        const isJoined = module.memberStatus === 'joined';
        const isPending = module.requestStatus === 'pending';
        const isPrivate = module.visibility !== 'public';
        const descriptionId = `student-module-description-${module.id}`;
        const isDescriptionOpen = Boolean(expandedDescriptions[module.id]);

        return (
          <article className={module.isLocked ? 'student-module-card locked-module-card' : 'student-module-card'} key={module.id}>
            <div className="student-module-card-header">
              <div><p className="eyebrow">{module.moduleCode || `MOD${String(module.id).padStart(3, '0')}`}</p><h2 className={module.isLocked ? 'locked-module-title' : ''}>{module.title}</h2></div>
              <ModuleAccessBadge module={module} />
            </div>
            <button
              className="student-module-description-toggle"
              type="button"
              aria-expanded={isDescriptionOpen}
              aria-controls={descriptionId}
              onClick={() => setExpandedDescriptions((current) => ({ ...current, [module.id]: !current[module.id] }))}
            >
              {isDescriptionOpen ? 'Hide Description' : 'Show Description'}
            </button>
            {isDescriptionOpen && <p id={descriptionId} className="student-module-description">{module.description}</p>}
            {module.isLocked && <p className="module-lock-message">This module is locked by admin and cannot be used in sessions now.</p>}
            {module.requestStatus === 'rejected' && module.teacherResponse && <p className="lock-warning">Teacher response: {module.teacherResponse}</p>}
            {!isJoined && !module.isLocked && isPrivate && (
              <label className="student-request-message">Request Message
                <textarea value={requestMessages[module.id] || ''} onChange={(event) => setRequestMessages((current) => ({ ...current, [module.id]: event.target.value }))} placeholder="Optional message to teacher" />
              </label>
            )}
            <div className="button-row">
              {isJoined && <button className="secondary-button" disabled type="button">Already Joined</button>}
              {!isJoined && !module.isLocked && module.visibility === 'public' && <button className="primary-button" type="button" onClick={() => onJoinPublic(module.id)}>Join Module</button>}
              {!isJoined && !module.isLocked && isPrivate && <button className="primary-button" disabled={isPending} type="button" onClick={() => onRequestPrivate(module.id, requestMessages[module.id] || '')}>{isPending ? 'Request Sent' : 'Request Join'}</button>}
            </div>
          </article>
        );
      })}
      {!modules.length && <section className="panel empty-state">No modules available yet.</section>}
      {modules.length > 0 && filteredModules.length === 0 && <section className="panel empty-state">No modules match these filters.</section>}
    </section>
  );
}
