import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from "react-native";

export default function useConversationScroll(identity: string, expanded: boolean, expand: () => void) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const atBottomRef = useRef(false);
  const readerScrolled = useRef(false);
  const geometry = useRef({ offset: 0, height: 0, viewport: 0, stage: 0, card: 0 });
  const savedOffset = useRef(0);
  const pending = useRef<{ y?: number; animated: boolean; announcement?: string } | null>(null);
  const [destinations, setDestinations] = useState({ state: false, latest: false });

  useEffect(() => {
    geometry.current = { offset: 0, height: 0, viewport: 0, stage: 0, card: 0 };
    savedOffset.current = 0;
    pending.current = null;
    atBottomRef.current = false;
    readerScrolled.current = false;
    setDestinations({ state: false, latest: false });
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [identity]);

  const updateDestinations = useCallback(() => {
    const { offset, height, viewport, stage, card } = geometry.current;
    const stateTop = stage + card;
    const next = {
      state: viewport > 0 && (stateTop < offset - 1 || stateTop >= offset + viewport - 44),
      latest: viewport > 0 && height - offset - viewport > 64,
    };
    setDestinations((current) => current.state === next.state && current.latest === next.latest ? current : next);
  }, []);

  const performScroll = useCallback(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    if (target.y === undefined) {
      scrollViewRef.current?.scrollToEnd({ animated: target.animated });
    } else {
      scrollViewRef.current?.scrollTo({ y: target.y, animated: target.animated });
    }
    if (target.announcement) AccessibilityInfo.announceForAccessibility(target.announcement);
  }, []);

  const scrollToBottom = useCallback((animated = false, announcement?: string) => {
    readerScrolled.current = true;
    atBottomRef.current = true;
    pending.current = { animated, announcement };
    if (expanded) requestAnimationFrame(performScroll);
    else expand();
  }, [expand, expanded, performScroll]);

  const scrollToState = useCallback((announcement: string) => {
    atBottomRef.current = false;
    pending.current = { y: Math.max(0, geometry.current.stage + geometry.current.card), animated: true, announcement };
    requestAnimationFrame(performScroll);
  }, [performScroll]);

  const toggleHistory = useCallback(() => {
    atBottomRef.current = false;
    if (expanded) {
      savedOffset.current = geometry.current.offset;
      pending.current = null;
    } else {
      pending.current = { y: savedOffset.current, animated: false };
    }
  }, [expanded]);

  const onScroll = useCallback(({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    geometry.current.offset = contentOffset.y;
    geometry.current.height = contentSize.height;
    geometry.current.viewport = layoutMeasurement.height;
    atBottomRef.current = (readerScrolled.current || atBottomRef.current) && expanded &&
      contentSize.height - contentOffset.y - layoutMeasurement.height < 64;
    updateDestinations();
  }, [expanded, updateDestinations]);

  const onLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    geometry.current.viewport = nativeEvent.layout.height;
    updateDestinations();
    if (atBottomRef.current && expanded) scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [expanded, updateDestinations]);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    geometry.current.height = height;
    updateDestinations();
    if (expanded && pending.current) performScroll();
    else if (expanded && atBottomRef.current) scrollViewRef.current?.scrollToEnd({ animated: false });
  }, [expanded, performScroll, updateDestinations]);

  const onStageLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    geometry.current.stage = nativeEvent.layout.y;
    updateDestinations();
  }, [updateDestinations]);

  const onCardLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    geometry.current.card = nativeEvent.layout.y;
    updateDestinations();
  }, [updateDestinations]);

  const onScrollBeginDrag = useCallback(() => {
    readerScrolled.current = true;
    pending.current = null;
    atBottomRef.current = false;
  }, []);

  return { scrollViewRef, atBottomRef, destinations, scrollToBottom, scrollToState,
    toggleHistory, onScroll, onLayout, onContentSizeChange, onStageLayout, onCardLayout, onScrollBeginDrag };
}
