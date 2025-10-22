'use client';

import { useQuery } from '@tanstack/react-query';
import type { FundingLatestResponse } from '@evplus/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function fetchFundingLatest(): Promise<FundingLatestResponse> {
  const response = await fetch(`${API_BASE_URL}/api/funding/latest`);
  if (!response.ok) {
    throw new Error(`Failed to fetch funding snapshots: ${response.status}`);
  }
  return (await response.json()) as FundingLatestResponse;
}

export function useFundingSnapshots() {
  return useQuery({
    queryKey: ['funding-latest'],
    queryFn: fetchFundingLatest,
    refetchInterval: 120_000,
    staleTime: 60_000
  });
}
