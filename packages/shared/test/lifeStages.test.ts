/**
 * Life-stage guide and helpers, and the coach output filter (SRS §20–§25, §34, §67; A-16, A-23).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COACH_STARTERS,
  PREGNANCY_GUIDE,
  celsiusToFahrenheit,
  emergencyNumberFor,
  fahrenheitToCelsius,
  filterCoachReply,
  hotFlashNote,
  hotFlashTime,
  pregnancyGuideFor,
  recentCycleLengths,
  simulateCoachReply,
} from '../src';

test('pregnancy guide covers every week 0–42 without gaps or overlaps', () => {
  for (let w = 0; w <= 42; w++) {
    const hits = PREGNANCY_GUIDE.filter((g) => w >= g.fromWeek && w <= g.toWeek);
    assert.equal(hits.length, 1, `week ${w} matched ${hits.length} entries`);
  }
  assert.equal(pregnancyGuideFor(20).title, 'Halfway there');
  assert.equal(pregnancyGuideFor(-3).fromWeek, 0, 'clamped below');
  assert.equal(pregnancyGuideFor(50).toWeek, 42, 'clamped above');
});

test('pregnancy guide copy stays educational (G2)', () => {
  const text = PREGNANCY_GUIDE.flatMap((g) => [g.title, g.body, ...g.focus]).join(' ').toLowerCase();
  for (const banned of ['diagnos', 'you have', 'guarantee', 'prescri', 'dose']) assert.ok(!text.includes(banned), `contains "${banned}"`);
});

test('emergency number follows the locale region, falling back to 112', () => {
  assert.equal(emergencyNumberFor('en-US').number, '911');
  assert.equal(emergencyNumberFor('en-GB').number, '999');
  assert.equal(emergencyNumberFor('hi-IN').number, '112');
  assert.equal(emergencyNumberFor('en_AU').number, '000');
  assert.deepEqual(emergencyNumberFor('fr'), { number: '112', region: null });
  assert.equal(emergencyNumberFor(undefined).number, '112');
});

test('basal temperature converts between °C and °F', () => {
  assert.equal(celsiusToFahrenheit(37), 98.6);
  assert.equal(fahrenheitToCelsius(98.6), 37);
  assert.equal(fahrenheitToCelsius(celsiusToFahrenheit(36.45)), 36.45);
});

test('a hot flash time round-trips through the symptom note', () => {
  assert.equal(hotFlashNote('14:30'), 'Started 14:30');
  assert.equal(hotFlashNote('07:05', 'at work'), 'Started 07:05 · at work');
  assert.equal(hotFlashTime(hotFlashNote('07:05', 'at work')), '07:05');
  assert.equal(hotFlashTime('felt warm'), null);
  assert.equal(hotFlashTime(undefined), null);
});

test('recent cycle lengths skip the open cycle and list newest first', () => {
  const r = recentCycleLengths([
    { start: '2026-07-01', length: 27 },
    { start: '2026-08-28', length: 34 },
    { start: '2026-10-01', length: null },
    { start: '2026-07-28', length: 31 },
  ]);
  assert.deepEqual(r.map((c) => c.length), [34, 31, 27]);
});

test('coach output filter replaces prohibited claims and keeps safe answers', () => {
  const safe = simulateCoachReply(COACH_STARTERS[0]);
  assert.equal(filterCoachReply(safe), safe, 'a normal answer passes untouched');
  for (const bad of ['Based on this, you have PCOS.', 'Your chart confirms ovulation on day 14.', 'These are your safe days.', 'Take 400 mg twice a day.']) {
    const r = filterCoachReply({ kind: 'educational', text: bad, suggestions: [] });
    assert.equal(r.kind, 'declined', `not filtered: ${bad}`);
    assert.ok(!r.text.includes(bad));
  }
  const negated = { kind: 'educational' as const, text: 'HealthX does not confirm ovulation, and calendar days are not safe days.', suggestions: [] };
  assert.equal(filterCoachReply(negated), negated, 'negated statements are allowed');
  const emergency = simulateCoachReply('I have chest pain');
  assert.equal(filterCoachReply(emergency), emergency, 'emergency redirects are never altered');
});
