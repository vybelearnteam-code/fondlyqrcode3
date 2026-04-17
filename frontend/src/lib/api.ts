/** Base URL for the API (empty = same origin, e.g. Vite proxy `/api` in dev). */
function apiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === undefined || raw === '') return '';
  return raw.replace(/\/$/, '');
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(res.status, text || res.statusText);
    }
  }
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : res.statusText;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

/** Active rewards for the spin wheel */
export async function fetchPublicRewards(options?: { omitDataImages?: boolean }) {
  const q = new URLSearchParams({ scope: 'public' });
  if (options?.omitDataImages) q.set('omit_data_images', '1');
  return apiJson<
    Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      sub_content: string | null;
      image_url: string | null;
      probability: number;
      stock: number;
      enabled: boolean;
      sort_order: number;
    }>
  >(`/api/rewards?${q.toString()}`);
}

export async function fetchCampaignSettings() {
  return apiJson<{
    id: string;
    spin_enabled: boolean;
    whatsapp_number: string | null;
    whatsapp_message: string | null;
    coupon_inventory_saved_at: string | null;
    coupon_valid_until: string | null;
    coupon_validity_text: string | null;
    wheel_image_size: number | null;
  }>('/api/campaign-settings');
}

export async function lookupCoupon(code: string) {
  return apiJson<{ code: string; used: boolean; unlimited: boolean }>(`/api/coupons/${encodeURIComponent(code)}`);
}

export async function phoneHasSubmission(phone: string) {
  return apiJson<{ exists: boolean }>(`/api/user-submissions/check-phone/${encodeURIComponent(phone)}`);
}

export async function completeSpin(body: {
  phone: string;
  couponCode: string;
  planName?: string;
  rewardId: string;
  rewardTitle: string;
}) {
  return apiJson<{ id: string }>('/api/spin/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateUserSubmission(
  id: string,
  patch: Record<string, string | boolean | null | undefined>,
) {
  return apiJson<{ ok: boolean }>(`/api/user-submissions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** Admin + unused pages */
export async function fetchAllRewards() {
  return apiJson<
    Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      sub_content: string | null;
      image_url: string | null;
      probability: number;
      stock: number;
      enabled: boolean;
      sort_order: number;
    }>
  >('/api/rewards?scope=admin');
}

export async function fetchAllSubmissions() {
  return apiJson<
    Array<{
      id: string;
      phone: string;
      coupon_code: string | null;
      pin_code: string | null;
      otp_verified: boolean;
      name: string | null;
      address: string | null;
      city: string | null;
      source: string | null;
      reward_title: string | null;
      created_at: string;
    }>
  >('/api/user-submissions');
}

export async function fetchCouponCodes() {
  return apiJson<
    Array<{
      id: string;
      code: string;
      used: boolean;
      unlimited: boolean;
      used_at: string | null;
      created_at: string;
      updated_at: string | null;
    }>
  >('/api/coupon-codes');
}

export async function fetchCouponCodeStrings(offset: number, limit: number) {
  return apiJson<{ codes: string[] }>(
    `/api/coupon-codes/codes-only?offset=${offset}&limit=${limit}`,
  );
}

export async function insertCouponCodes(codes: string[], unlimited?: boolean) {
  return apiJson<{ inserted: number }>('/api/coupon-codes/bulk', {
    method: 'POST',
    body: JSON.stringify({ codes, unlimited: Boolean(unlimited) }),
  });
}

/** Delete coupons by prefix or exact codes; set `includeUsed` to remove redeemed rows too. */
export async function deleteUnusedCouponCodes(body: {
  codes?: string[];
  prefix?: string;
  includeUsed?: boolean;
}) {
  return apiJson<{ deleted: number }>('/api/coupon-codes/delete-unused', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateReward(id: string, updates: Record<string, string | number | boolean | null>) {
  return apiJson<{ ok: boolean }>(`/api/rewards/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function updateCampaignSettings(
  id: string,
  updates: Record<string, string | number | boolean | null>,
) {
  return apiJson<{ ok: boolean }>(`/api/campaign-settings/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function createUserSubmission(body: {
  phone: string;
  otp_code: string;
  otp_expires_at: string;
  reward_id: string | null;
  reward_title: string | null;
}) {
  return apiJson<{ id: string }>('/api/user-submissions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchSubmissionOtp(id: string) {
  return apiJson<{ otp_code: string | null; otp_expires_at: string | null }>(
    `/api/user-submissions/${encodeURIComponent(id)}/otp`,
  );
}
