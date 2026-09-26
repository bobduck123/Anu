import { apiFetch } from '@/lib/api/client';

export interface OnboardingState {
  interests: string[];
  joined_microcosms: Array<{ id: number; name: string }>;
  microcosms: Array<{ id: number; name: string; description: string | null }>;
  complete: boolean;
}

export const onboardingApi = {
  get: () => apiFetch<OnboardingState>('/api/hell/onboarding'),
  confirm: (interests: string[], microcosmId: number) =>
    apiFetch<OnboardingState>('/api/hell/onboarding', {
      method: 'POST',
      body: JSON.stringify({ interests, microcosm_id: microcosmId }),
    }),
};
