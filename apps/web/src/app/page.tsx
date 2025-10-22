'use client';

import { Header } from '../components/layout/Header';
import { Page } from '../components/layout/Page';
import { Viewport } from '../components/layout/Viewport';
import { FundingView } from '../components/funding/FundingView';
import { SkeletonTable } from './skeletonTable';
import { EmptyState } from '../components/feedback/EmptyState';
import { useFundingSnapshots } from './useFundingSnapshots';

export default function Home() {
  const { data, isLoading, isError, isFetching, refetch } = useFundingSnapshots();

  const snapshots = data?.snapshots ?? [];
  const lastUpdated = data?.updatedAt ?? null;
  const activeVenues = new Set(snapshots.map((snapshot) => snapshot.exchange)).size;

  const showSkeleton = isLoading && snapshots.length === 0;
  const showEmpty = !isLoading && !snapshots.length && !isError;

  return (
    <Page>
      <Header
        lastUpdated={lastUpdated}
        activeVenues={activeVenues}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />
      <Viewport>
        {isError ? (
          <EmptyState
            title="Unable to load funding data"
            description={
              <>
                Check your API service or connector credentials, then try refreshing. If the problem
                persists, inspect the API logs for detailed error messages.
              </>
            }
          />
        ) : showSkeleton ? (
          <SkeletonTable />
        ) : showEmpty ? (
          <EmptyState title="No funding data yet" description="Connectors are still warming up." />
        ) : (
          <FundingView snapshots={snapshots} />
        )}
      </Viewport>
    </Page>
  );
}
