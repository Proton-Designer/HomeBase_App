import React from 'react';
import { View, Text, FlatList, Pressable, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import * as postingsApi from '../../lib/api/postings';
import { EmptyState } from '../../components/shared';
import { SERVICE_LABELS as SERVICE_LABEL } from '../../lib/constants';
import { colors, fonts, textStyles } from '../../tokens';
import type { ServiceType } from '../../lib/types';

function timeAgo(iso: string): string {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function ProviderRequestsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const providerId = useAuthStore((s) => s.providerId);

  const { data: postings = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['provider', 'open-postings', providerId],
    queryFn: () => postingsApi.listOpenForProvider(providerId ?? ''),
    enabled: !!providerId,
    staleTime: 60_000,
  });

  const { data: myQuotes = [] } = useQuery({
    queryKey: ['provider', 'my-quotes', providerId],
    queryFn: () => postingsApi.listMyQuotes(providerId ?? ''),
    enabled: !!providerId,
  });
  const quotedIds = new Set(myQuotes.map((q) => q.postingId));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Job requests</Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
            Homeowners near you looking for your services
          </Text>
        </View>
      </View>

      {!providerId || (isLoading && postings.length === 0) ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={postings}
          keyExtractor={(p) => p.id}
          contentContainerStyle={postings.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[600]} />}
          ListEmptyComponent={
            <EmptyState
              illustration={<Inbox size={40} color={colors.textTertiary} />}
              heading="No open requests"
              body="When homeowners post a custom job in your service areas, it shows up here to quote on."
            />
          }
          renderItem={({ item }) => {
            const quoted = quotedIds.has(item.id);
            return (
              <Pressable
                onPress={() => router.push(`/(provider)/posting/${item.id}`)}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    gap: 6,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ ...textStyles.label, color: colors.primary[600] }}>
                    {SERVICE_LABEL[item.serviceType as ServiceType] ?? item.serviceType}
                  </Text>
                  <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>{timeAgo(item.postedAt)}</Text>
                </View>
                <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }} numberOfLines={1}>
                  {item.headline}
                </Text>
                <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  {quoted ? (
                    <View style={{ backgroundColor: colors.successLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 11, color: colors.success }}>Quote sent</Text>
                    </View>
                  ) : (
                    <Text style={{ ...textStyles['body-sm'], fontFamily: fonts.bodySemibold, color: colors.primary[600] }}>
                      Send a quote
                    </Text>
                  )}
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
