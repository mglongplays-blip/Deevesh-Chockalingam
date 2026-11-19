export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { 'Content-Type': 'application/json' };

  const resp = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    if (contentType.includes('application/json')) {
      const errData = (await resp.json()) as { error?: string; retryAfterSeconds?: number };
      throw new ApiError(
        errData.error || `Request failed with status ${resp.status}`,
        resp.status,
        errData.retryAfterSeconds
      );
    }
    throw new ApiError(`Request failed with status ${resp.status}`, resp.status);
  }

  return (await resp.json()) as T;
}

export async function downloadFile(url: string, fileName: string, options?: RequestInit): Promise<void> {
  const resp = await fetch(url, {
    ...options,
    credentials: 'include',
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(errText || 'Download failed.');
  }
  const blob = await resp.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
