import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import { colors, textStyles } from '../tokens';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary. Catches any render/lifecycle error in the screen
 * tree and shows a recoverable fallback instead of a hard white-screen crash.
 */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', gap: 12, maxWidth: 420 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              textAlign: 'center',
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            The app hit an unexpected error. Try again — if it keeps happening,
            fully close and reopen the app.
          </Text>
          {__DEV__ ? (
            <Text
              style={{
                ...textStyles['body-sm'],
                color: colors.error,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              {error.message}
            </Text>
          ) : null}
          <Pressable
            onPress={this.reset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={[
              {
                marginTop: 12,
                backgroundColor: colors.primary[700],
                paddingVertical: 14,
                paddingHorizontal: 28,
                borderRadius: 12,
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Text style={{ ...textStyles['title-md'], color: colors.textInverse }}>
              Try again
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
