import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSafeBack } from '../../../lib/useSafeBack';
import { ChevronLeft } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { ProviderCard } from '../../../components/shared/ProviderCard';
import { SkeletonLoader } from '../../../components/shared/SkeletonLoader';
import { EmptyState } from '../../../components/shared/EmptyState';
import { QueryErrorState } from '../../../components/shared';
import { Chip } from '../../../components/ui/Chip';
import * as api from '../../../lib/api';
import { useAuthStore } from '../../../stores/authStore';
import { fetchPrimaryAddress } from '../../../lib/api/addresses';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { colors, textStyles } from '../../../tokens';
import { enterStaggered } from '../../../lib/motion';
import type { Provider, ServiceType } from '../../../lib/types';

type SortKey = 'trust' | 'distance' | 'available';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'trust', label: 'Trust' },
  { key: 'distance', label: 'Distance' },
  { key: 'available', label: 'Available' },
];

const FILTER_CHIPS: { id: ServiceType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lawn', label: 'Lawn' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'pool', label: 'Pool' },
  { id: 'pest', label: 'Pest' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'window', label: 'Window' },
  { id: 'gutter', label: 'Gutter' },
  { id: 'detailing', label: 'Detailing' },
  { id: 'tree', label: 'Tree' },
  { id: 'solar', label: 'Solar' },
];

function sortProviders(providers: Provider[], sort: SortKey): Provider[] {
  const copy = [...providers];
  if (sort === 'trust') {
    return copy.sort((a, b) => b.compositeScore.overall - a.compositeScore.overall);
  }
  if (sort === 'distance') {
    return copy.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
  }
  return copy.sort((a, b) => {
    if (a.isAvailableToday === b.isAvailableToday) {
      return b.compositeScore.overall - a.compositeScore.overall;
    }
    return a.isAvailableToday ? -1 : 1;
  });
}

function ProviderRowSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 1,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLoader width="60%" height={16} borderRadius={6} />
          <SkeletonLoader width="40%" height={12} borderRadius={6} />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
            <SkeletonLoader width={80} height={20} borderRadius={10} />
            <SkeletonLoader width={64} height={20} borderRadius={10} />
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
        }}
      >
        <SkeletonLoader width={100} height={12} borderRadius={6} />
        <SkeletonLoader width={60} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

function BrowseSkeleton() {
  return (
    <View style={{ paddingTop: 12 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <ProviderRowSkeleton key={i} />
      ))}
    </View>
  );
}

function SortSegment({
  active,
  onSelect,
}: {
  active: SortKey;
  onSelect: (k: SortKey) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 14,
        gap: 24,
      }}
    >
      {SORT_OPTIONS.map((opt) => {
        const selected = opt.key === active;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[
              { paddingBottom: 4 },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Text
              style={{
                fontFamily: selected ? 'Fraunces_600SemiBold' : 'Fraunces_400Regular',
                fontSize: 13,
                fontStyle: 'italic',
                color: selected ? colors.textPrimary : colors.textTertiary,
              }}
            >
              {opt.label}
            </Text>
            {selected ? (
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.accent[500],
                  marginTop: 3,
                  borderRadius: 1,
                }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function AmberDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 16, justifyContent: 'center' }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.accent[400],
          }}
        />
      ))}
    </View>
  );
}

export default function BrowseProvidersScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const [activeFilter, setActiveFilter] = useState<ServiceType | 'all'>('all');
  const [activeSort, setActiveSort] = useState<SortKey>('trust');
  const bp = useBreakpoint();
  const userId = useAuthStore((s) => s.user)?.id ?? null;
  const numColumns =
    Platform.OS === 'web' && bp === 'desktop' ? 3 : Platform.OS === 'web' && bp === 'tablet' ? 2 : 1;

  const { data: primaryAddress } = useQuery({
    queryKey: ['addresses', 'primary', userId],
    queryFn: () => fetchPrimaryAddress(userId!),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });

  const homeZip = primaryAddress?.zip ?? null;

  const { data: allProviders = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['providers', 'search', homeZip, activeFilter === 'all' ? undefined : activeFilter],
    queryFn: () =>
      api.providers.search(homeZip!, activeFilter === 'all' ? undefined : activeFilter),
    enabled: !!homeZip,
    staleTime: 5 * 60 * 1000,
  });

  const sorted = useMemo(() => sortProviders(allProviders, activeSort), [allProviders, activeSort]);

  // Browsing/filtering providers is a demand signal — record it to demand_events
  // (CLAUDE.md non-negotiable: every search writes to demand_events). Debounced
  // by the dependency keys so we log one event per zip+filter view.
  useEffect(() => {
    if (!homeZip) return;
    void api.events.track({
      event: 'search',
      serviceType: activeFilter === 'all' ? undefined : activeFilter,
      zip: homeZip,
      metadata: { surface: 'providers_index' },
    });
  }, [homeZip, activeFilter]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem: ListRenderItem<Provider> = useCallback(
    ({ item, index }) => {
      const isGrid = numColumns > 1;
      return (
        <Animated.View
          entering={enterStaggered(index)}
          style={isGrid ? { flex: 1, margin: 8 } : undefined}
        >
          <View style={isGrid ? undefined : { marginHorizontal: 20 }}>
            <ProviderCard
              provider={item}
              variant={isGrid ? 'compact' : 'standard'}
              onPress={() => router.push(`/(homeowner)/providers/${item.id}`)}
            />
          </View>
          {!isGrid ? (
            <View
              style={{
                height: 1,
                marginHorizontal: 20,
                backgroundColor: colors.divider,
              }}
            />
          ) : null}
        </Animated.View>
      );
    },
    [router, numColumns]
  );

  const keyExtractor = useCallback((item: Provider) => item.id, []);

  const ListHeader = (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 }}>
        <Text
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 12,
            fontStyle: 'italic',
            color: colors.textTertiary,
            letterSpacing: 0.4,
            marginBottom: 8,
          }}
        >
          the directory
        </Text>
        <Text
          style={{
            ...textStyles['editorial-title'],
            color: colors.textPrimary,
          }}
        >
          Pros on your block.
        </Text>
        <Text
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 14,
            fontStyle: 'italic',
            color: colors.textSecondary,
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          verified, insured, rated by your neighbors
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 6, paddingBottom: 14 }}
      >
        {FILTER_CHIPS.map((chip) => {
          const selected = activeFilter === chip.id;
          return (
            <View key={chip.id}>
              <Chip
                label={chip.label}
                selected={selected}
                size="sm"
                onPress={() => setActiveFilter(chip.id)}
                style={
                  selected
                    ? {
                        backgroundColor: colors.primary[700],
                        borderColor: colors.primary[700],
                      }
                    : undefined
                }
              />
              {selected ? (
                <View
                  style={{
                    height: 2,
                    backgroundColor: colors.accent[400],
                    borderRadius: 1,
                    marginTop: 3,
                    opacity: 0.7,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <SortSegment active={activeSort} onSelect={setActiveSort} />

      {!isLoading && !isError && sorted.length > 0 ? (
        <Text
          style={{
            fontFamily: 'Fraunces_400Regular',
            fontSize: 12,
            fontStyle: 'italic',
            color: colors.textTertiary,
            paddingHorizontal: 20,
            marginBottom: 10,
          }}
        >
          {sorted.length} {sorted.length === 1 ? 'pro' : 'pros'} near you
        </Text>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          paddingTop: 4,
          paddingBottom: 2,
        }}
      >
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={[
            { padding: 8 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <SkeletonLoader width={80} height={12} borderRadius={6} />
            <View style={{ marginTop: 10 }}>
              <SkeletonLoader width="70%" height={30} borderRadius={8} />
            </View>
            <View style={{ marginTop: 8 }}>
              <SkeletonLoader width="85%" height={14} borderRadius={6} />
            </View>
          </View>
          <BrowseSkeleton />
        </>
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={numColumns}
          key={numColumns}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 40, maxWidth: 1200, width: '100%', alignSelf: 'center' }}
          columnWrapperStyle={numColumns > 1 ? { paddingHorizontal: 8 } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary[600]}
              colors={[colors.primary[600]]}
            />
          }
          ListEmptyComponent={
            <View>
              <EmptyState
                heading="No pros match"
                body="Try a different service or zoom out to other neighborhoods"
                ctaLabel="Show all services"
                onCta={() => setActiveFilter('all')}
              />
              <AmberDots />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
