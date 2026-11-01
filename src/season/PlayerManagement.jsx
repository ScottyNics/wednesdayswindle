import React, { useEffect, useState } from 'react';
import { ukToday } from './players';

const inputClass = 'w-full rounded-2xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';
const showHandicap = value => value < 0 ? `+${Math.abs(value)}` : value;

export default function PlayerManagement({ api, session }) {
  const [seasons, setSeasons] = useState([]);
  const [players, setPlayers] = useState([]);
  const [seasonId, setSeasonId] = useState('');
  const [members, setMembers] = useState([]);
  const [loadedSeason, setLoadedSeason] = useState('');
  const [setupReady, setSetupReady] = useState(false);
  const [mode, setMode] = useState('new');
  const [name, setName] = useState('');
  const [existingId, setExistingId] = useState('');
  const [handicap, setHandicap] = useState('');
  const [joinedOn, setJoinedOn] = useState(ukToday());
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setSetupReady(false);
    api.loadPlayerSetup(session).then(data => {
      if (!active) return;
      setSeasons(data.seasons); setPlayers(data.players);
      setSeasonId(id => data.seasons.some(s=>s.id===id) ? id : data.seasons.find(s=>s.name==='Test Season')?.id || data.seasons[0]?.id || '');
      setSetupReady(true);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, session, revision]);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    setLoadedSeason(''); setMembers([]);
    api.loadSeasonPlayers(session, seasonId).then(data => {
      if (active) { setMembers(data); setLoadedSeason(seasonId); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, session, seasonId, revision]);

  const season = seasons.find(s=>s.id===seasonId);
  useEffect(() => {
    if (!season) return;
    const today = ukToday();
    setJoinedOn(today < season.start_date ? season.start_date : today > season.end_date ? season.end_date : today);
  }, [seasonId, season?.start_date, season?.end_date]);

  const availablePlayers = players.filter(p => !members.some(m=>m.player_id===p.id));
  const ready = setupReady && !!season && loadedSeason === seasonId;

  async function addPlayer(event) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const displayName = mode === 'existing' ? players.find(p=>p.id===existingId)?.name : name.trim();
      await api.registerPlayer(session, { seasonId, name: mode === 'new' ? name : '', handicap, existingPlayerId: mode === 'existing' ? existingId : null, joinedOn });
      setNotice(`${displayName} added to ${season.name}.`);
      setName(''); setHandicap(''); setExistingId(''); setRevision(n=>n+1);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <div>
    <h3 className="text-xl font-bold">Season players</h3>
    <p className="mt-2 mb-4 text-sm text-slate-600">Register each player once per season using their starting white-tee handicap.</p>
    {!setupReady && !error && <p role="status">Loading seasons and players…</p>}
    {setupReady && !seasons.length && <p>No seasons found. Add a season in Supabase first.</p>}
    {!!seasons.length && <>
      <label htmlFor="player-season" className="mb-2 block font-semibold">Season</label>
      <select id="player-season" value={seasonId} disabled={saving || !setupReady} onChange={e=>{setSeasonId(e.target.value);setExistingId('');setError('');setNotice('');}} className={inputClass}>
        {seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <div className="my-5 rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm"><caption className="sr-only">Players and their starting and current handicaps</caption>
          <thead className="bg-slate-100"><tr><th scope="col" className="p-3">Player</th><th scope="col" className="p-3 text-center">Start</th><th scope="col" className="p-3 text-center">Current</th></tr></thead>
          <tbody>{ready ? members.length ? members.map(m=><tr key={m.player_id} className="border-t border-slate-200"><th scope="row" className="p-3 font-medium break-words">{m.sw_players.name}</th><td className="p-3 text-center">{showHandicap(m.starting_handicap)}</td><td className="p-3 text-center font-bold">{showHandicap(m.current_handicap)}</td></tr>) : <tr><td colSpan={3} className="p-4 text-slate-600">No players registered yet.</td></tr> : <tr><td colSpan={3} className="p-4">{error ? 'Player list unavailable.' : 'Loading players…'}</td></tr>}</tbody>
        </table>
      </div>
      <p className="mb-5 text-xs text-slate-500">Current handicaps include recorded adjustments effective on or before today (UK time).</p>
      <form onSubmit={addPlayer} className="rounded-2xl bg-slate-50 p-4">
        <h3 className="mb-4 text-lg font-bold">Add a player</h3>
        <fieldset disabled={!ready || saving}>
          <legend className="sr-only">Player registration details</legend>
          <div className="mb-4 flex flex-wrap gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="player-mode" checked={mode==='new'} onChange={()=>{setMode('new');setError('');}} />New player</label>
            <label className="flex items-center gap-2"><input type="radio" name="player-mode" checked={mode==='existing'} onChange={()=>{setMode('existing');setError('');}} />Existing player</label>
          </div>
          {mode==='new' ? <><label htmlFor="new-player-name" className="mb-2 block font-semibold">Full name</label><input id="new-player-name" value={name} onChange={e=>setName(e.target.value)} required maxLength={100} autoComplete="off" className={inputClass} /></> : <><label htmlFor="existing-player" className="mb-2 block font-semibold">Choose player</label><select id="existing-player" value={existingId} onChange={e=>setExistingId(e.target.value)} required className={inputClass}><option value="">Select a player</option>{availablePlayers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{!availablePlayers.length && <p className="mt-2 text-sm text-slate-600">No other existing players are available for this season.</p>}</>}
          <label htmlFor="starting-handicap" className="mt-4 mb-2 block font-semibold">Starting handicap · White tees</label>
          <input id="starting-handicap" type="number" step="1" min="-10" max="54" value={handicap} onChange={e=>setHandicap(e.target.value)} required className={inputClass} aria-describedby="handicap-help" />
          <p id="handicap-help" className="mt-2 text-xs text-slate-600">Whole numbers only. For a plus 2 handicap, enter -2.</p>
          <label htmlFor="joined-on" className="mt-4 mb-2 block font-semibold">First round in this season</label>
          <input id="joined-on" type="date" value={joinedOn} min={season?.start_date} max={season?.end_date} onChange={e=>setJoinedOn(e.target.value)} required className={inputClass} />
          <button type="submit" disabled={!ready || saving || (mode==='existing' && !existingId)} className="mt-5 w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Add to season'}</button>
        </fieldset>
      </form>
    </>}
    {notice && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button onClick={()=>{setError('');setRevision(n=>n+1);}} disabled={saving} className="mt-4 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh players</button>
  </div>;
}
