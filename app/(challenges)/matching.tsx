/**
 * matching.tsx
 * Format données : options = [{id, item, match, matchLabel}]
 *   item = texte gauche (symptôme, concept)
 *   match = lettre de la catégorie (ex: "A", "B", "C")
 *   matchLabel = libellé de la catégorie (ex: "Physique")
 *
 * UX : Tap un item à gauche, tap une catégorie à droite pour associer
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeRewardModal } from '../../components/BadgeRewardModal';
import ChallengeProgressBar from '../../components/ChallengeProgressBar';
import { ChallengeHeader } from '../../components/ChallengeHeader';
import { ConfettiEffect } from '../../components/ConfettiEffect';
import { ImmediateFeedback } from '../../components/ImmediateFeedback';
import { MissionSplash } from '../../components/MissionSplash';
import { useBadges } from '../../hooks/useBadges';
import { useMissions } from '../../hooks/useMissions';
import { useQuestions } from '../../hooks/useQuestions';
import { useTheme } from '../../hooks/useTheme';
import { playSound } from '../../utils/SoundManager';
import { useChallengeNavigation } from '../../hooks/useChallengeNavigation';
import { useMissionStore } from '../../stores/missionStore';

export default function V1MatchingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { navigateToNext, skipQuestion, goBack, goToIntro } = useChallengeNavigation();
  const { initQueue, markComplete, getQueue } = useMissionStore();
  const { missionId, questionIndex = '0', cityId: cityParam } = useLocalSearchParams();
  const cityId = cityParam as string;
  const currentIdx = parseInt(questionIndex as string) || 0;

  const { loading: loadingMissions } = useMissions(cityId);
  const { questions: dbQuestions, loading: loadingQuestions } = useQuestions(missionId as string);
  const questions = dbQuestions || [];
  const qData = questions[currentIdx];

  const { awardBadge, showReward, lastAwardedBadge, dismissReward } = useBadges();

  // State
  // userMatches: { [itemId]: matchKey }
  const [userMatches, setUserMatches] = useState<Record<string, string>>({});
  const [activeItem, setActiveItem] = useState<string | null>(null); // selected left item
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSplash, setShowSplash] = useState(currentIdx === 0);

  useEffect(() => {
    if (questions.length > 0 && missionId) initQueue(missionId as string, questions);
  }, [questions, missionId]);

  useEffect(() => {
    setUserMatches({});
    setActiveItem(null);
    setRevealed(false);
    setIsCorrect(null);
  }, [currentIdx]);

  // Parse items from options [{id, item, match, matchLabel}]
  const rawOptions: { id: string; item: string; match: string; matchLabel: string }[] =
    useMemo(() => {
      let base: any[] = [];
      if (Array.isArray(qData?.options)) {
        base = qData.options;
      } else if (qData?.options?.pairs && Array.isArray(qData.options.pairs)) {
        base = qData.options.pairs;
      }

      return base.map((o: any, idx: number) => ({
        id: String(o.id ?? idx),
        item: o.item ?? o.left_fr ?? o.left ?? o.label ?? '',
        match: String(o.match ?? o.value ?? o.right ?? ''),
        matchLabel: o.matchLabel ?? o.right_fr ?? o.right ?? o.match ?? '',
      }));
    }, [qData]);

  // Unique categories (right side)
  const categories: { key: string; label: string }[] = useMemo(() => {
    const seen = new Map<string, string>();
    rawOptions.forEach(o => {
      if (!seen.has(o.match)) seen.set(o.match, o.matchLabel);
    });
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, [rawOptions]);

  // Color palette for categories
  const categoryColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
  const getCatColor = (key: string) => {
    const idx = categories.findIndex(c => c.key === key);
    return categoryColors[idx % categoryColors.length];
  };

  const handleItemTap = (id: string) => {
    if (revealed) return;
    setActiveItem(prev => prev === id ? null : id);
    playSound('click');
  };

  const handleCategoryTap = (catKey: string) => {
    if (!activeItem || revealed) return;
    setUserMatches(prev => ({ ...prev, [activeItem]: catKey }));
    setActiveItem(null);
    playSound('click');
  };

  const handleValidate = () => {
    if (revealed) return;
    const allMatched = rawOptions.every(o => userMatches[o.id] !== undefined);
    if (!allMatched) return;

    const correct = rawOptions.every(o => userMatches[o.id] === o.match);
    setIsCorrect(correct);
    setRevealed(true);
    setShowFeedback(true);
    playSound(correct ? 'correct' : 'wrong');

    if (correct && currentIdx + 1 === questions.length) {
      setShowConfetti(true);
      awardBadge('maitre_des_liens');
    }

    markComplete(missionId as string, currentIdx);

    // Record the result
    const { recordResult } = useMissionStore.getState();
    recordResult(missionId as string, currentIdx, correct);

    setTimeout(() => {
      setShowFeedback(false);
      navigateToNext({
        missionId: missionId as string,
        cityId,
        isMissionComplete: getQueue(missionId as string).length === 0,
      });
    }, 3000);
  };

  if (loadingMissions || loadingQuestions) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!qData) return null;

  const matchedCount = Object.keys(userMatches).length;
  const totalItems = rawOptions.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <ChallengeHeader cityId={cityId} onClose={() => goToIntro(cityId)} />
      <ChallengeProgressBar progress={currentIdx / questions.length} color={colors.primary} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Context */}
        {!!qData.presentation_fr && (
          <Animated.View entering={FadeInDown.delay(80)} style={[styles.contextCard, { borderLeftColor: colors.primary }]}>
            <Text style={[styles.contextLabel, { color: colors.onSurface }]}>📋 CONTEXTE</Text>
            <Text style={[styles.contextText, { color: colors.onSurface }]}>{qData.presentation_fr}</Text>
          </Animated.View>
        )}

        {/* Instruction */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.header}>
          <Text style={[styles.instruction, { color: colors.onSurface }]}>ASSOCIATION</Text>
          <Text style={[styles.questionText, { color: colors.onSurface }]}>{qData.question_fr}</Text>
          <Text style={[styles.hint, { color: colors.onSurface }]}>
            Tapez un élément <MaterialIcons name="arrow-right-alt" size={14} /> puis sa catégorie
          </Text>
        </Animated.View>

        {/* Category chips (right side targets) */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.categoriesRow}>
          {categories.map((cat, i) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catChip,
                { backgroundColor: getCatColor(cat.key) + '18', borderColor: getCatColor(cat.key) },
                activeItem !== null && { borderWidth: 2.5, transform: [{ scale: 1.04 }] },
              ]}
              onPress={() => handleCategoryTap(cat.key)}
              disabled={!activeItem || revealed}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, { color: getCatColor(cat.key) }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Items list */}
        <View style={styles.itemsList}>
          {rawOptions.map((item, idx) => {
            const matchedKey = userMatches[item.id];
            const catColor = matchedKey ? getCatColor(matchedKey) : null;
            const isActive = activeItem === item.id;
            const isItemCorrect = revealed && matchedKey === item.match;
            const isItemWrong   = revealed && matchedKey !== item.match;

            let borderColor = isActive
              ? colors.primary
              : catColor ? catColor : 'rgba(0,0,0,0.08)';
            if (isItemCorrect) borderColor = '#22c55e';
            if (isItemWrong)   borderColor = '#ef4444';

            const correctCat = categories.find(c => c.key === item.match);

            return (
              <Animated.View key={item.id} entering={FadeInRight.delay(250 + idx * 60)}>
                <TouchableOpacity
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: isActive
                        ? colors.primary + '12'
                        : catColor
                        ? getCatColor(matchedKey!) + '10'
                        : colors.surface,
                      borderColor,
                    },
                  ]}
                  onPress={() => handleItemTap(item.id)}
                  disabled={revealed}
                  activeOpacity={0.75}
                >
                  {/* Left: item text */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemText, { color: colors.onSurface }]}>{item.item}</Text>
                    {/* Matched category label */}
                    {matchedKey && !revealed && (
                      <Text style={[styles.matchedLabel, { color: getCatColor(matchedKey) }]}>
                        → {categories.find(c => c.key === matchedKey)?.label}
                      </Text>
                    )}
                    {revealed && (
                      <Text style={[styles.matchedLabel, { color: isItemCorrect ? '#15803d' : '#991b1b' }]}>
                        {isItemCorrect ? `✓ ${correctCat?.label}` : `✗ ${correctCat?.label}`}
                      </Text>
                    )}
                  </View>

                  {/* Right: color dot or check/cross */}
                  {!revealed && matchedKey && (
                    <View style={[styles.colorDot, { backgroundColor: getCatColor(matchedKey) }]} />
                  )}
                  {revealed && isItemCorrect && <MaterialIcons name="check-circle" size={22} color="#22c55e" />}
                  {revealed && isItemWrong   && <MaterialIcons name="cancel"       size={22} color="#ef4444" />}
                  {!matchedKey && !revealed && (
                    <MaterialIcons name={isActive ? 'touch-app' : 'radio-button-unchecked'} size={20} color={isActive ? colors.primary : colors.border} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Progress counter */}
        {matchedCount > 0 && !revealed && (
          <Animated.View entering={FadeInUp} style={[styles.progressRow, { backgroundColor: colors.primary + '12' }]}>
            <MaterialIcons name="link" size={18} color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.primary }]}>
              {matchedCount}/{totalItems} associés
            </Text>
          </Animated.View>
        )}

        {/* Result */}
        {revealed && (
          <Animated.View entering={FadeInUp.delay(200)} style={[
            styles.resultBox,
            { backgroundColor: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', borderColor: isCorrect ? '#22c55e' : '#ef4444' }
          ]}>
            <MaterialIcons name={isCorrect ? 'emoji-events' : 'info'} size={24} color={isCorrect ? '#22c55e' : '#ef4444'} />
            <Text style={[styles.resultText, { color: isCorrect ? '#15803d' : '#991b1b' }]}>
              {isCorrect
                ? 'Parfait ! Toutes les associations sont correctes !'
                : `${rawOptions.filter(o => userMatches[o.id] === o.match).length}/${totalItems} bonnes associations.`}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 16) + 8, backgroundColor: colors.surface }]}>
        <View style={styles.footerRow}>
          <View style={styles.sideActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={goBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => { setUserMatches({}); setActiveItem(null); setRevealed(false); setIsCorrect(null); playSound('click'); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="refresh" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, { borderColor: colors.primary + '40' }]}
            onPress={() => skipQuestion({ missionId: missionId as string, cityId })}
          >
            <MaterialIcons name="fast-forward" size={24} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.validateBtn,
              { backgroundColor: colors.primary },
              (matchedCount < totalItems || revealed) && { opacity: 0.45 },
            ]}
            onPress={handleValidate}
            disabled={matchedCount < totalItems || revealed}
          >
            <MaterialIcons name="done-all" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ImmediateFeedback 
        isVisible={showFeedback} 
        isCorrect={isCorrect ?? false} 
        onClose={() => setShowFeedback(false)}
      />
      {showConfetti && <ConfettiEffect />}
      <BadgeRewardModal badge={lastAwardedBadge} isVisible={showReward} onClose={dismissReward} />
      <MissionSplash
        isVisible={showSplash}
        title="Association"
        subtitle="Reliez chaque élément à sa catégorie"
        onFinish={() => setShowSplash(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  contextCard: { borderRadius: 14, padding: 14, marginBottom: 18, backgroundColor: 'rgba(0,0,0,0.03)', borderLeftWidth: 4 },
  contextLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
  contextText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  header: { marginBottom: 18, alignItems: 'center' },
  instruction: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8, opacity: 0.6 },
  questionText: { fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 25, marginBottom: 8 },
  hint: { fontSize: 13, opacity: 0.7, textAlign: 'center' },
  // Categories
  categoriesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22, justifyContent: 'center' },
  catChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 2,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  catChipText: { fontSize: 14, fontWeight: '800' },
  // Items
  itemsList: { gap: 10 },
  itemCard: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 16,
    borderRadius: 18, borderWidth: 2, gap: 12,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  itemText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  matchedLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, padding: 12, borderRadius: 12 },
  progressText: { fontSize: 14, fontWeight: '700' },
  // Result
  resultBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  resultText: { flex: 1, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  // Footer
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  footerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sideActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  skipBtn: { paddingHorizontal: 22, height: 56, borderRadius: 28, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  validateBtn: { paddingHorizontal: 32, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
});
