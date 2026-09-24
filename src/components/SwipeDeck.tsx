import { useEffect, useMemo, useRef } from 'react';
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
const PROMOTE_DURATION = 180;
const VISIBLE_CARDS = 3;

export function SwipeDeck({ assets, cursor, onSwipe }: Props) {
  const visible = assets.slice(cursor, cursor + VISIBLE_CARDS);

  if (visible.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more items.</Text>
      </View>
    );
  }

  // Cards are rendered in a stable order (top first) and stacked via zIndex, so a
  // card moving up the deck keeps the same native view and never reloads its image.
  return (
    <View style={styles.deck}>
      {visible.map((asset, position) => (
        <DeckCard key={asset.id} asset={asset} position={position} onSwipe={onSwipe} />
      ))}
    </View>
  );
}

type DeckCardProps = {
  asset: CleanerAsset;
  position: number;
  onSwipe: (assetId: string, direction: Direction) => void;
};

function DeckCard({ asset, position, onSwipe }: DeckCardProps) {
  const isTop = position === 0;
  const assetId = asset.id;

  // Each card owns its transforms: a swiped card stays off-screen until it unmounts,
  // and the card promoted to the top starts from a clean state.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zoomTranslateX = useSharedValue(0);
  const zoomTranslateY = useSharedValue(0);
  const initialFocalX = useSharedValue(0);
  const initialFocalY = useSharedValue(0);
  const cardWidth = useSharedValue(0);
  const cardHeight = useSharedValue(0);
  const depth = useSharedValue(position);

  useEffect(() => {
    depth.value = withTiming(position, { duration: PROMOTE_DURATION });
  }, [position, depth]);

  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;
  const handleSwiped = (direction: Direction) => onSwipeRef.current(assetId, direction);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isTop)
        .minPointers(1)
        .maxPointers(1)
        .onUpdate((e) => {
          translateX.value = e.translationX;
          translateY.value = e.translationY;
        })
        .onEnd((e) => {
          if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
            const direction: Direction = e.translationX > 0 ? 'right' : 'left';
            translateY.value = withTiming(e.translationY, { duration: SWIPE_OUT_DURATION });
            translateX.value = withTiming(
              Math.sign(e.translationX) * SCREEN_WIDTH * 1.5,
              { duration: SWIPE_OUT_DURATION },
              (finished) => {
                if (finished) {
                  runOnJS(handleSwiped)(direction);
                }
              }
            );
          } else {
            translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
            translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTop, assetId]
  );

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(isTop)
        .onStart((e) => {
          initialFocalX.value = e.focalX;
          initialFocalY.value = e.focalY;
        })
        .onUpdate((e) => {
          const newScale = Math.max(1, Math.min(e.scale, 5));
          scale.value = newScale;
          if (newScale > 1.001) {
            const cx = cardWidth.value / 2;
            const cy = cardHeight.value / 2;
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
    [isTop]
  );

  const composedGesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );
    return {
      opacity: interpolate(depth.value, [1, 2], [1, 0.7], Extrapolation.CLAMP),
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + depth.value * 8 },
        { rotate: `${rotate}deg` },
        { scale: 1 - depth.value * 0.05 },
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

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.cardSlot, { zIndex: VISIBLE_CARDS - position }, cardStyle]}
        pointerEvents={isTop ? 'auto' : 'none'}
        onLayout={(e) => {
          cardWidth.value = e.nativeEvent.layout.width;
          cardHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <Animated.View style={[styles.zoomLayer, zoomStyle]}>
          <MediaCard asset={asset} active={isTop} />
        </Animated.View>
        <Animated.View style={[styles.badge, styles.keepBadge, keepBadgeStyle]}>
          <Text style={styles.badgeText}>KEEP</Text>
        </Animated.View>
        <Animated.View style={[styles.badge, styles.deleteBadge, deleteBadgeStyle]}>
          <Text style={styles.badgeText}>DELETE</Text>
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
