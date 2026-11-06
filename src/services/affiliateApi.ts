import { config } from '../config';

export type DeviceOs = 'IOS' | 'ANDROID';

export interface AffiliateConfig {
  requirePhone: boolean;
  continuousNavigate?: boolean;
}

interface ClickPayload {
  clickId: string;
  partnerCode: string;
  pubId: string;
  phone?: string | null;
  os: DeviceOs;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = 'Không thể kết nối đến hệ thống. Vui lòng thử lại.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The response may not contain JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function getAffiliateConfig(): Promise<AffiliateConfig> {
  return request<AffiliateConfig>('/api/affiliate/config');
}

export function recordAffiliateClick(payload: ClickPayload): Promise<unknown> {
  return request('/api/affiliate/click', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
