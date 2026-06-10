import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';

/** Matches tab bar height in app/(main)/_layout.tsx */
const FALLBACK_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;

/** Bottom padding so scroll content clears the absolute-positioned tab bar. */
export function useTabBarInset(extra = 16): number {
  const tabBarHeight = useBottomTabBarHeight();
  return (tabBarHeight || FALLBACK_TAB_BAR_HEIGHT) + extra;
}
