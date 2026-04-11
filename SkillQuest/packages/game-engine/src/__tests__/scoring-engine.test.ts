import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../scoring-engine';

describe('ScoringEngine', () => {
  it('calculates perfect score with 3 stars', () => {
    const result = ScoringEngine.calculate({
      correctCount: 10,
      totalCount: 10,
      timeRemainingSec: 60,
      timeLimitSec: 120,
      maxCombo: 10,
    });

    expect(result.stars).toBe(3);
    expect(result.baseScore).toBe(1000);
    expect(result.timeBonus).toBeGreaterThan(0);
    expect(result.comboBonus).toBeGreaterThan(0);
    expect(result.xpGained).toBeGreaterThan(0);
    expect(result.achievements.length).toBeGreaterThan(0);
  });

  it('calculates 2 stars for 80% accuracy', () => {
    const result = ScoringEngine.calculate({
      correctCount: 8,
      totalCount: 10,
      timeRemainingSec: 0,
      timeLimitSec: 120,
      maxCombo: 3,
    });

    expect(result.stars).toBe(2);
    expect(result.baseScore).toBe(800);
  });

  it('calculates 1 star for 60% accuracy', () => {
    const result = ScoringEngine.calculate({
      correctCount: 6,
      totalCount: 10,
      timeRemainingSec: 0,
      timeLimitSec: 0,
      maxCombo: 0,
    });

    expect(result.stars).toBe(1);
  });

  it('isPassed returns true for >= 60%', () => {
    expect(ScoringEngine.isPassed(6, 10)).toBe(true);
    expect(ScoringEngine.isPassed(5, 10)).toBe(false);
    expect(ScoringEngine.isPassed(10, 10)).toBe(true);
  });

  it('awards perfect_score achievement', () => {
    const result = ScoringEngine.calculate({
      correctCount: 5,
      totalCount: 5,
      timeRemainingSec: -1,
      timeLimitSec: 0,
      maxCombo: 5,
    });

    expect(result.achievements.some((a) => a.id === 'perfect_score')).toBe(true);
  });

  it('awards combo_master achievement for 10+ combo', () => {
    const result = ScoringEngine.calculate({
      correctCount: 10,
      totalCount: 10,
      timeRemainingSec: -1,
      timeLimitSec: 0,
      maxCombo: 12,
    });

    expect(result.achievements.some((a) => a.id === 'combo_master')).toBe(true);
  });
});
