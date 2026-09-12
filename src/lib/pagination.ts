export const DEFAULT_PAGE_SIZE = 15;
export const MAX_PAGE_SIZE = 100;

export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parsePageParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
): PageParams {
  const get = (key: string): string | null => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key);
    const value = searchParams[key];
    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
  };

  const rawPage = Number(get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawPageSize = Number(get('pageSize'));
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize > 0
      ? Math.min(rawPageSize, MAX_PAGE_SIZE)
      : defaultPageSize;

  return { page, pageSize };
}

export function toSkipTake({ page, pageSize }: PageParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageResult<T>(items: T[], total: number, { page, pageSize }: PageParams): PageResult<T> {
  return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
