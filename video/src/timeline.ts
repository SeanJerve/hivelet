// When each scene starts and how long it holds, in frames at 30 fps.
// Scenes overlap the next by OVERLAP frames so a scene fades in over the one
// before it rather than through black.
import durations from './voice-durations.json';

export const VOICE: 'rosa' | 'ava' = 'rosa';
export const OVERLAP = 14;

const order = [
  ['place', 195],
  ['before', 255],
  ['cost', 210],
  ['answer', 135],
  ['rooms', 195],
  ['income', 360],
  ['overview', 180],
  ['tenant', 345],
  ['repairs', 180],
  ['guests', 180],
  ['activity', 165],
  ['proof', 165],
  ['close', 135],
] as const;

export type SceneId = (typeof order)[number][0];
export const T = {} as Record<SceneId, {from: number; dur: number}>;
let cursor = 0;
for (const [id, dur] of order) {
  T[id] = {from: cursor, dur};
  cursor += dur;
}
export const TOTAL = cursor;

// The six voiced lines, each placed a beat after its scene opens.
export const VOICE_CUES = [
  {id: 'v1', at: T.place.from + 16},
  {id: 'v2', at: T.before.from + 16},
  {id: 'v3', at: T.answer.from + 14},
  {id: 'v4', at: T.income.from + 14},
  {id: 'v5', at: T.tenant.from + 14},
  {id: 'v6', at: T.proof.from + 12},
].map((c) => ({...c, dur: Math.ceil((durations[VOICE] as Record<string, number>)[c.id] * 30) + 6}));
