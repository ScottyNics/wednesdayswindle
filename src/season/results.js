export function winnerCut(handicap) { return handicap >= 20 ? 3 : handicap >= 10 ? 2 : 1; }
export function decideWeeklyWinner(standings, recordedWinnerId = null) {
  const leaders = standings.filter(row => Number(row.weekly_position) === 1);
  const recorded = recordedWinnerId ? standings.find(row => row.player_id === recordedWinnerId) : null;
  if (!leaders.length) return { winner: recorded || null, tied: [], reason: 'No completed scores yet.' };
  if (leaders.length > 1) return { winner: recorded || null, tied: leaders, reason: recorded ? 'Organiser decision after all tie-breaks were equal.' : 'All tie-breaks are equal. Choose one of the tied leaders.' };
  const winner = recorded || leaders[0];
  const runners = standings.filter(row => row.player_id !== winner.player_id).sort((a,b)=>Number(a.weekly_position)-Number(b.weekly_position));
  if (!runners.length) return { winner, tied: [], reason: 'Only completed entry.' };
  const second=runners[0];
  for(const [key,label] of [['weekly_points','Highest Stableford score'],['last_5','Countback: last 5 holes'],['last_3','Countback: last 3 holes'],['last_2','Countback: last 2 holes'],['last_1','Countback: last hole'],['handicap_used','Lower playing handicap'],['season_blob_average','Lower season blob average']]) {
    if(Number(winner[key])!==Number(second[key])) return {winner,tied:[],reason:label};
  }
  return {winner,tied:[],reason:'Organiser decision'};
}
