import fetch from 'cross-fetch';

type RequestOptions = Parameters<typeof fetch>[1];

export class HttpError extends Error {
  constructor(message: string, readonly status: number, readonly url: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function fetchJson<T>(url: string, init: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text().catch(() => '<no-body>');
    throw new HttpError(
      `Request failed with status ${response.status} – ${body.slice(0, 200)}`,
      response.status,
      url
    );
  }

  return (await response.json()) as T;
}
