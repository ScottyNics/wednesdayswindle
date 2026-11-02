export function holeShots(handicap, strokeIndex) {
  return Math.floor((handicap + 18 - strokeIndex) / 18);
}
export function pointsFor(score, par, handicap, strokeIndex) {
  if (!score) return null;
  return score.no_score ? 0 : Math.max(0, 2 + par + holeShots(handicap, strokeIndex) - score.gross_score);
}
export function playerTotals(entry, holes, scores) {
  return holes.reduce((total, hole) => {
    const score = scores.find(s => s.entry_id === entry.id && s.hole_position === hole.position);
    if (!score) return total;
    const points = pointsFor(score, hole.par, entry.handicap_used, hole.stroke_index);
    total.played++; total.points += points;
    if (points === 0) total.blobs++;
    if (!score.no_score && score.gross_score < hole.par) total.birdies += score.gross_score === hole.par - 2 ? 2 : 1;
    return total;
  }, { played: 0, points: 0, birdies: 0, blobs: 0 });
}
export function buildHoleScores(entries, draft) {
  return entries.map(entry => {
    const value = draft[entry.id];
    if (value === 'NS') return { entry_id: entry.id, gross_score: null, no_score: true };
    if (!/^[1-9]\d?$/.test(String(value || ''))) throw new Error('Enter a score from 1 to 99 or choose No Score for every player.');
    return { entry_id: entry.id, gross_score: Number(value), no_score: false };
  });
}
