import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { CleanerAsset } from '../lib/media';
import { Direction } from '../hooks/useDecisions';
import { MediaCard } from './MediaCard';

type Props = {
  assets: CleanerAsset[];
  cursor: number;
  onSwipe: (assetId: string, direction: Direction) => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SWIPE_OUT_DURATION = 220;
const PEEK_FADE_DURATION = 220;

export function SwipeDeck({ assets, cursor, onSwipe }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zoomTranslateX = useSharedValue(0);
  const zoomTranslateY = useSharedValue(0);
  const initialFocalX = useSharedValue(0);
  const initialFocalY = useSharedValue(0);
  const deckWidth = useSharedValue(SCREEN_WIDTH);
  const deckHeight = useSharedValue(0);

  const top = assets[cursor];
  const next = assets[cursor + 1];
  const after = assets[cursor + 2];
  const topId = top?.id;

  const handleSwipeAndReset = (assetId: string, direction: Direction) => {
    onSwipe(assetId, direction);
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 1;
    zoomTranslateX.value = 0;
    zoomTranslateY.value = 0;
  };

  const pan = useMemo(() => {
    if (!topId) return Gesture.Pan().enabled(false);
    return Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationX > SWIPE_THRESHOLD) {
          translateY.value = withTiming(e.translationY, { duration: SWIPE_OUT_DURATION });
          translateX.value = withTiming(
            SCREEN_WIDTH * 1.5,
            { duration: SWIPE_OUT_DURATION },
            (finished) => {
              if (finished) {
                runOnJS(handleSwipeAndReset)(topId, 'right');
              }
            }
          );
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          translateY.value = withTiming(e.translationY, { duration: SWIPE_OUT_DURATION });
          translateX.value = withTiming(
            -SCREEN_WIDTH * 1.5,
            { duration: SWIPE_OUT_DURATION },
            (finished) => {
              if (finished) {
                runOnJS(handleSwipeAndReset)(topId, 'left');
              }
            }
          );
        } else {
          translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
          translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topId]);

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart((e) => {
          initialFocalX.value = e.focalX;
          initialFocalY.value = e.focalY;
        })
        .onUpdate((e) => {
          const newScale = Math.max(1, Math.min(e.scale, 5));
          scale.value = newScale;
          if (newScale > 1.001) {
            const cx = deckWidth.value / 2;
            const cy = deckHeight.value / 2;
            zoomTranslateX.value =
              e.focalX - cx - (initialFocalX.value - cx) * newScale;
            zoomTranslateY.value =
              e.focalY - cy - (initialFocalY.value - cy) * newScale;
          } else {
            zoomTranslateX.value = 0;
            zoomTranslateY.value = 0;
          }
        })
        .onEnd(() => {
          scale.value = withTiming(1, { duration: 220 });
          zoomTranslateX.value = withTiming(0, { duration: 220 });
          zoomTranslateY.value = withTiming(0, { duration: 220 });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(pan, pinch),
    [pan, pinch]
  );

  const topCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: zoomTranslateX.value },
      { translateY: zoomTranslateY.value },
      { scale: scale.value },
    ],
  }));

  const keepBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [40, SCREEN_WIDTH * 0.3], [0, 1], Extrapolation.CLAMP),
  }));

  const deleteBadgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SCREEN_WIDTH * 0.3, -40], [1, 0], Extrapolation.CLAMP),
  }));

  if (!top) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more items.</Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={styles.deck}
        onLayout={(e) => {
          deckWidth.value = e.nativeEvent.layout.width;
          deckHeight.value = e.nativeEvent.layout.height;
        }}
      >
        {after ? (
          <Animated.View
            key={after.id}
            style={[styles.cardSlot, styles.cardBack2]}
            pointerEvents="none"
          >
            <MediaCard asset={after} />
          </Animated.View>
        ) : null}
        {next ? (
          <Animated.View
            key={next.id}
            style={[styles.cardSlot, styles.cardBack1]}
            pointerEvents="none"
          >
            <MediaCard asset={next} />
          </Animated.View>
        ) : null}
        <Animated.View key={top.id} style={[styles.cardSlot, topCardStyle]}>
          <Animated.View style={[styles.zoomLayer, zoomStyle]}>
            <MediaCard asset={top} />
          </Animated.View>
          <Animated.View style={[styles.badge, styles.keepBadge, keepBadgeStyle]}>
            <Text style={styles.badgeText}>KEEP</Text>
          </Animated.View>
          <Animated.View style={[styles.badge, styles.deleteBadge, deleteBadgeStyle]}>
            <Text style={styles.badgeText}>DELETE</Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: {
    flex: 1,
    padding: 12,
  },
  cardSlot: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
  },
  zoomLayer: {
    flex: 1,
  },
  cardBack1: {
    transform: [{ scale: 0.95 }, { translateY: 8 }],
  },
  cardBack2: {
    transform: [{ scale: 0.9 }, { translateY: 16 }],
    opacity: 0.7,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    top: 32,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 4,
    borderRadius: 8,
  },
  keepBadge: {
    left: 24,
    borderColor: '#34d399',
    transform: [{ rotate: '-12deg' }],
  },
  deleteBadge: {
    right: 24,
    borderColor: '#f87171',
    transform: [{ rotate: '12deg' }],
  },
  badgeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
});
