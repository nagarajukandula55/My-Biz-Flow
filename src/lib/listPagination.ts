export const DEFAULT_LIST_PAGE_SIZE = 25;
export const MAX_LIST_PAGE_SIZE = 100;
export const MAX_LIST_PAGE_NUMBER = 10_000;

export type ListPageOptions = { page?: unknown; pageSize?: unknown };

export type PaginatedList<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function normalizeListPage(options: ListPageOptions = {}) {
  const requestedSize = Number(options.pageSize);
  const pageSize = Number.isSafeInteger(requestedSize) && requestedSize > 0
    ? Math.min(MAX_LIST_PAGE_SIZE, requestedSize)
    : DEFAULT_LIST_PAGE_SIZE;
  const requestedPage = Number(options.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(MAX_LIST_PAGE_NUMBER, requestedPage)
    : 1;
  return { page, pageSize };
}

export function buildPaginatedList<T>(rows: T[], total: number, page: number, pageSize: number): PaginatedList<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const actualPage = Math.min(Math.max(1, page), totalPages);
  return { rows, total, page: actualPage, pageSize, totalPages };
}
