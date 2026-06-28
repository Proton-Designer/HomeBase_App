import React from 'react';
import { View, Platform, Pressable, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { AuthSplitLayout } from './AuthSplitLayout';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { useSafeBack } from '../../lib/useSafeBack';
import { colors } from '../../tokens';

interface AuthScreenShellProps {
  children: React.ReactNode;
  /** Wrap native content in a KeyboardAvoidingView (forms that need it). */
  keyboardAvoiding?: boolean;
  /** Render the amber masthead rule above the back button (native only). */
  amberRule?: boolean;
  /** Max width of the form column on the web split layout. */
  webContentMaxWidth?: number;
  /** Show the back-button chevron. Set false for screens reached via router.replace. */
  showBack?: boolean;
}

export function AuthScreenShell({
  children,
  keyboardAvoiding = false,
  amberRule = false,
  webContentMaxWidth = 420,
  showBack = true,
}: AuthScreenShellProps) {
  const goBack = useSafeBack();
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  if (isWebSplit) {
    return (
      <AuthSplitLayout>
        <View
          style={{ width: '100%', maxWidth: webContentMaxWidth, flex: 1, justifyContent: 'center' }}
        >
          {children}
        </View>
      </AuthSplitLayout>
    );
  }

  const nativeChrome = (
    <>
      {amberRule && (
        <View
          style={{
            height: 2,
            width: 80,
            backgroundColor: colors.accent[500],
            marginLeft: 24,
            marginTop: 8,
            borderRadius: 1,
          }}
        />
      )}
      {showBack && (
        <Pressable
          onPress={goBack}
          style={[
            { padding: 12, marginLeft: 8, marginTop: 4 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
          hitSlop={8}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {nativeChrome}
        </KeyboardAvoidingView>
      ) : (
        nativeChrome
      )}
    </SafeAreaView>
  );
}
