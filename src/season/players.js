export function ukToday(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = type => parts.find(p => p.type === type).value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function parseHandicap(value) {
  const text = String(value).trim();
  if (!/^[+-]?\d+$/.test(text)) throw new Error('Enter a whole-number handicap.');
  const handicap = Number(text);
  if (!Number.isSafeInteger(handicap) || handicap < -10 || handicap > 54) throw new Error('Enter a handicap between -10 and 54.');
  return handicap;
}

export function currentHandicaps(members, adjustments, asOf = ukToday()) {
  const ordered = [...adjustments].filter(a => a.effective_from <= asOf).sort((a,b) =>
    b.effective_from.localeCompare(a.effective_from)
    || b.created_at.localeCompare(a.created_at)
    || b.id.localeCompare(a.id));
  return members.map(member => {
    const latest = ordered.find(a => a.player_id === member.player_id && a.season_id === member.season_id);
    return { ...member, current_handicap: latest ? latest.handicap_after : member.starting_handicap };
  }).sort((a,b) => a.sw_players.name.localeCompare(b.sw_players.name));
}
