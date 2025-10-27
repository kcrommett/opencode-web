/**
 * Session Search & Indexing Library
 * 
 * Pure functions for client-side session search, filtering, and sorting.
 * No external dependencies - uses native JavaScript operations for performance.
 */

interface Session {
  id: string;
  title?: string;
  directory?: string;
  projectID?: string;
  createdAt?: Date;
  updatedAt?: Date;
  messageCount?: number;
}

export interface SessionFilters {
  text?: string;
  dateFrom?: Date;
  dateTo?: Date;
  projectID?: string;
  sortBy?: 'created' | 'updated' | 'title';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search sessions by text query in title field
 * @param sessions - Array of sessions to search
 * @param query - Search query string (case-insensitive, partial match)
 * @returns Filtered sessions matching the query
 */
export function searchByText(
  sessions: Session[],
  query: string
): Session[] {
  if (!query || !query.trim()) {
    return sessions;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  return sessions.filter((session) => {
    // Use title if available, fallback to session ID
    const searchTarget = (session.title || session.id).toLowerCase();
    return searchTarget.includes(normalizedQuery);
  });
}

/**
 * Filter sessions by date range based on creation date
 * @param sessions - Array of sessions to filter
 * @param from - Start date (inclusive, optional)
 * @param to - End date (inclusive, optional)
 * @returns Sessions within the date range
 */
export function filterByDateRange(
  sessions: Session[],
  from?: Date,
  to?: Date
): Session[] {
  if (!from && !to) {
    return sessions;
  }

  return sessions.filter((session) => {
    // Skip sessions without creation date
    if (!session.createdAt) {
      return false;
    }

    const createdTime = session.createdAt.getTime();

    // Check lower bound (inclusive)
    if (from && createdTime < from.getTime()) {
      return false;
    }

    // Check upper bound (inclusive)
    if (to && createdTime > to.getTime()) {
      return false;
    }

    return true;
  });
}

/**
 * Filter sessions by project ID
 * @param sessions - Array of sessions to filter
 * @param projectID - Project ID to match (optional)
 * @returns Sessions matching the project ID
 */
export function filterByProject(
  sessions: Session[],
  projectID?: string
): Session[] {
  if (!projectID) {
    return sessions;
  }

  return sessions.filter((session) => session.projectID === projectID);
}

/**
 * Sort sessions by specified field and order
 * @param sessions - Array of sessions to sort
 * @param sortBy - Field to sort by
 * @param sortOrder - Sort direction ('asc' or 'desc')
 * @returns New sorted array (immutable)
 */
export function sortSessions(
  sessions: Session[],
  sortBy: 'created' | 'updated' | 'title',
  sortOrder: 'asc' | 'desc'
): Session[] {
  const sorted = [...sessions];
  const direction = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let valueA: string | number | undefined;
    let valueB: string | number | undefined;

    switch (sortBy) {
      case 'created':
        valueA = a.createdAt?.getTime();
        valueB = b.createdAt?.getTime();
        break;
      case 'updated':
        valueA = a.updatedAt?.getTime();
        valueB = b.updatedAt?.getTime();
        break;
      case 'title':
        valueA = (a.title || a.id).toLowerCase();
        valueB = (b.title || b.id).toLowerCase();
        break;
    }

    // Handle undefined values - push to end
    if (valueA === undefined && valueB === undefined) return 0;
    if (valueA === undefined) return 1;
    if (valueB === undefined) return -1;

    // Compare values
    if (valueA < valueB) return -1 * direction;
    if (valueA > valueB) return 1 * direction;
    return 0;
  });

  return sorted;
}

/**
 * Main search function combining text search, filtering, and sorting
 * @param sessions - Array of sessions to search/filter
 * @param filters - Search filters and options
 * @returns Filtered and sorted sessions
 */
export function searchSessions(
  sessions: Session[],
  filters: SessionFilters
): Session[] {
  // Short-circuit if no filters applied
  if (
    !filters.text &&
    !filters.dateFrom &&
    !filters.dateTo &&
    !filters.projectID &&
    !filters.sortBy
  ) {
    return sessions;
  }

  let results = sessions;

  // Apply text search first (most selective)
  if (filters.text) {
    results = searchByText(results, filters.text);
  }

  // Apply date range filter
  if (filters.dateFrom || filters.dateTo) {
    results = filterByDateRange(results, filters.dateFrom, filters.dateTo);
  }

  // Apply project filter
  if (filters.projectID) {
    results = filterByProject(results, filters.projectID);
  }

  // Apply sorting last
  if (filters.sortBy) {
    const sortOrder = filters.sortOrder || 'desc';
    results = sortSessions(results, filters.sortBy, sortOrder);
  }

  return results;
}
