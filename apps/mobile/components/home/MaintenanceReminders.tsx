import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Leaf,
  Sparkles,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
  Container,
  Car,
  TreePine,
  Sun,
} from 'lucide-react-native';
import { Button } from '../ui/Button';
import { colors, textStyles, shadows, serviceTints } from '../../tokens';
import { enterStaggered } from '../../lib/motion';
import type { Reminder, ReminderStatus } from '../../lib/home/reminders';
import type { ServiceType } from '../../lib/types';

type IconComp = React.ComponentType<{ size?: number; color?: string }>;

const SERVICE_ICONS: Record<ServiceType, IconComp> = {
  lawn: Leaf,
  cleaning: Sparkles,
  pool: Waves,
  pest: Bug,
  pressure: Droplets,
  window: SquareDashed,
  gutter: Container,
  detailing: Car,
  tree: TreePine,
  solar: Sun,
};

type PillConfig = { bg: string; textColor: string; label: string };

const PILL: Record<ReminderStatus, PillConfig> = {
  overdue:     { bg: colors.errorLight,   textColor: colors.error,       label: 'Overdue'   },
  due_soon:    { bg: colors.warningLight, textColor: colors.warning,     label: 'Due soon'  },
  recommended: { bg: colors.primary[50],  textColor: colors.primary[700], label: 'Suggested' },
};

export interface MaintenanceRemindersProps {
  reminders: Reminder[];
  onBook: (serviceType: ServiceType) => void;
}

export function MaintenanceReminders({ reminders, onBook }: MaintenanceRemindersProps) {
  if (reminders.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingRight: 4 }}
    >
      {reminders.map((r, i) => {
        const Icon = SERVICE_ICONS[r.serviceType];
        const pill = PILL[r.status];
        return (
          <Animated.View
            key={r.id}
            entering={enterStaggered(i)}
            style={[
              {
                width: 210,
                backgroundColor: serviceTints[r.serviceType] ?? colors.primary[50],
                borderRadius: 14,
                padding: 14,
              },
              shadows.sm,
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={20} color={colors.primary[600]} />
              </View>

              <View
                style={{
                  backgroundColor: pill.bg,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    ...textStyles['label'],
                    fontSize: 10,
                    color: pill.textColor,
                  }}
                >
                  {pill.label}
                </Text>
              </View>
            </View>

            <Text
              style={{
                ...textStyles['title-md'],
                color: colors.textPrimary,
                marginTop: 10,
              }}
            >
              {r.title}
            </Text>

            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {r.reason}
            </Text>

            <View style={{ marginTop: 10 }}>
              <Button
                label="Book"
                variant="primary"
                size="sm"
                fullWidth
                onPress={() => onBook(r.serviceType)}
              />
            </View>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

export default MaintenanceReminders;
