import React, { useEffect, useRef, useState } from 'react';
const field='w-full rounded-2xl border border-slate-300 bg-white p-3 text-base';
const number=value=>value==null?'—':Number(value).toFixed(2);
export default function PublishedResults({api,session=null}) {
 const [seasons,setSeasons]=useState([]),[seasonId,setSeasonId]=useState(''),[mode,setMode]=useState('season');
 const [weeks,setWeeks]=useState([]),[weekId,setWeekId]=useState(''),[weekly,setWeekly]=useState(null),[board,setBoard]=useState(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[hiddenFrom,setHiddenFrom]=useState(''),[prompt,setPrompt]=useState(null);
 const dialog=useRef(null),inFlight=useRef(false);
 const season=seasons.find(s=>s.id===seasonId);
 useEffect(()=>{
   let active=true;setError('');api.publishedSeasons().then(data=>{if(active){setSeasons(data);setSeasonId(data[0]?.id||'');if(!data.length)setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
   return()=>{active=false;};
 },[api]);
 // Refresh also re-checks visibility at the UK blackout boundary.
 useEffect(()=>{if(session?.role==='admin'||session?.role==='secondary_admin')return;const id=setInterval(()=>setRevision(n=>n+1),60000);return()=>clearInterval(id);},[session]);
 useEffect(()=>{
   if(!seasonId)return;let active=true;setBoard(null);setLoading(true);setError('');
   api.seasonBoard(seasonId,session).then(data=>{if(active){setBoard(data);setHiddenFrom(data.leaderboard_hidden_from||'');}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;};
 },[api,session,seasonId,revision]);
 useEffect(()=>{
   if(!seasonId)return;let active=true;const previous=weekId;setWeeks([]);setWeekId('');setWeekly(null);
   api.publishedWeeks(seasonId).then(data=>{if(active){setWeeks(data);setWeekId(data.some(w=>w.id===previous)?previous:data[0]?.id||'');}}).catch(e=>{if(active)setError(e.message);});
   return()=>{active=false;};
 },[api,seasonId,revision]);
 useEffect(()=>{
   setWeekly(null);if(!weekId)return;let active=true;
   api.publishedWeek(weekId).then(data=>{if(active)setWeekly(data);}).catch(e=>{if(active)setError(e.message);});
   return()=>{active=false;};
 },[api,weekId,revision]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(prompt&&!d.open)d.showModal();if(!prompt&&d.open)d.close();},[prompt]);
 async function changeVisibility(){
   if(inFlight.current)return;const action=prompt;setPrompt(null);inFlight.current=true;setBusy(true);setError('');setNotice('');
   try{
     if(action==='reveal')await api.revealSeason(session,seasonId);
     else await api.setSeasonBlackout(session,seasonId,hiddenFrom);
     setNotice(action==='reveal'?'Season results revealed to everyone.':'Visibility date saved. Any earlier season reveal has been reset.');
     setBoard(null);setRevision(n=>n+1);
   }catch(e){setError(e.message);}finally{setBusy(false);inFlight.current=false;}
 }
 return <div>
   <dialog ref={dialog} onClose={()=>setPrompt(null)} onCancel={()=>setPrompt(null)} aria-labelledby="season-dialog-title" aria-describedby="season-dialog-text" className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-black/60" style={{width:'calc(100% - 2rem)'}}>
     <h2 id="season-dialog-title" className="mb-4 text-2xl font-bold">{prompt==='reveal'?'Reveal season results?':'Save season visibility?'}</h2>
     <p id="season-dialog-text" className="mb-6 text-lg">{prompt==='reveal'?'This will make the season standings, birdie totals and blob averages visible to everyone.':hiddenFrom?`Hide season standings from ${hiddenFrom} (UK time)? Weekly published scores will remain visible. This resets any previous season reveal.`:'Remove the blackout date? Season standings will be visible to everyone.'}</p>
     <div className="flex gap-3"><button onClick={changeVisibility} className="flex-1 rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white">Yes</button><button autoFocus onClick={()=>setPrompt(null)} className="flex-1 rounded-2xl bg-slate-700 py-4 text-xl font-bold text-white">Go back</button></div>
   </dialog>
   <h2 className="text-2xl font-bold">Swindle results</h2><p className="mt-2 mb-5 text-sm text-slate-600">Published weekly scores and the season so far.</p>
   <label htmlFor="published-season" className="mb-2 block font-semibold">Season</label><select id="published-season" disabled={busy} value={seasonId} onChange={e=>{setSeasonId(e.target.value);setNotice('');}} className={field}><option value="">Select season</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   <nav aria-label="Result views" className="my-5 flex gap-2 rounded-2xl bg-slate-100 p-1">{[['season','Season standings'],['weekly','Weekly results']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)} className={`flex-1 rounded-xl p-3 text-sm font-semibold ${mode===value?'bg-white text-emerald-800 shadow-sm':'text-slate-600'}`}>{label}</button>)}</nav>
   {loading&&<p role="status">Loading results…</p>}
   {!loading&&!seasons.length&&!error&&<p>No seasons available yet.</p>}
   {mode==='season'&&board&&<>
     {board.hidden?<div className="rounded-2xl bg-slate-100 p-5"><h3 className="text-lg font-bold">Season standings are under wraps</h3><p className="mt-2 text-sm text-slate-600">The final weeks are kept secret until the organiser reveals the season results. Published weekly scores are still available.</p></div>:<>
       {board.public_hidden&&<p className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Admin view: these season standings are currently hidden from other viewers.</p>}
       <p className="mb-4 text-sm text-slate-600">Average of the best {board.season.best_rounds} published rounds. Play at least {board.season.qualifying_rounds} rounds to qualify for the overall season prize.</p>
       <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-sm text-center"><caption className="sr-only">Season leaderboard, qualification, birdies and average blobs</caption><thead className="bg-slate-100"><tr>{['Pos','Player','Rounds','Best average','Birdies','Avg blobs','Joker'].map(label=><th key={label} scope="col" className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{board.rows.map(row=><tr key={row.player_id} className={`border-t border-slate-200 ${row.qualified?'bg-white':'bg-slate-50 text-slate-500'}`}><td className="p-3">{row.position??'—'}</td><th scope="row" className="p-3 text-left font-semibold"><span>{row.name}</span>{!row.qualified&&<span className="mt-1 block whitespace-nowrap text-xs font-normal">Not yet qualified</span>}</th><td className="p-3">{row.rounds_played}</td><td className="p-3 font-bold">{number(row.best_average)}</td><td className="p-3">{row.birdies}</td><td className="p-3">{number(row.average_blobs)}</td><td className="p-3">{row.joker_used?'Used':'—'}</td></tr>)}</tbody></table>{!board.rows.length&&<p className="p-4 text-sm text-slate-600">No players registered for this season.</p>}</div>
       <p className="mt-3 text-xs text-slate-500">Jokers double season points only. Birdies and blob averages use all published completed rounds; an eagle counts as two birdies.</p>
     </>}
   </>}
   {mode==='weekly'&&<>
     <label htmlFor="published-week" className="mb-2 block font-semibold">Published week</label><select id="published-week" disabled={!weeks.length} value={weekId} onChange={e=>setWeekId(e.target.value)} className={field}><option value="">Select week</option>{weeks.map(week=><option key={week.id} value={week.id}>{week.played_on} · {week.course}</option>)}</select>
     {!weeks.length&&!loading&&<p className="mt-4 text-sm text-slate-600">No weekly results have been published for this season yet.</p>}
     {!!weekId&&!weekly&&!error&&<p role="status" className="mt-4">Loading weekly scores…</p>}
     {weekly&&<><p className="my-4 text-sm text-slate-600">{weekly.event.played_on} · {weekly.event.course} · {weekly.event.tees}</p><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-sm text-center"><caption className="sr-only">Published weekly results</caption><thead className="bg-slate-100"><tr>{['Player','Points','Birdies','Blobs'].map(label=><th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{weekly.rows.map(row=><tr key={row.player_id} className={`border-t border-slate-200 ${row.winner?'bg-emerald-50':''}`}><th scope="row" className="p-3 text-left font-semibold">{row.name}{row.winner&&<span className="block text-xs text-emerald-700">Weekly winner</span>}</th><td className="p-3 font-bold">{row.points}</td><td className="p-3">{row.birdies}</td><td className="p-3">{row.blobs}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs text-slate-500">Ordinary Stableford points. Joker doubling does not affect the weekly result.</p></>}
   </>}
   {board?.can_manage_visibility&&<section className="mt-7 rounded-2xl border border-slate-200 p-4"><h3 className="font-bold">Organiser: season visibility</h3><p className="mt-2 text-sm text-slate-600">Set the date of the first of your final five scheduled competition weeks. Weekly published scores stay available. Reveal standings after the final presentation.</p><label htmlFor="blackout-date" className="mt-4 mb-2 block text-sm font-semibold">Hide season standings from</label><input id="blackout-date" type="date" min={season?.start_date} max={season?.end_date} value={hiddenFrom} disabled={busy} onChange={e=>setHiddenFrom(e.target.value)} className={field}/><button disabled={busy||loading} onClick={()=>setPrompt('save')} className="mt-3 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Save visibility date</button>{!board.results_revealed&&<button disabled={busy||loading} onClick={()=>setPrompt('reveal')} className="mt-3 w-full rounded-2xl bg-emerald-600 p-3 font-bold text-white disabled:opacity-50">Reveal season results</button>}{board.results_revealed&&<p className="mt-3 text-sm font-semibold text-emerald-700">Season results have been revealed.</p>}</section>}
   {notice&&<p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
   {error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
   <button disabled={busy} onClick={()=>{if(!seasonId){window.location.reload();return;}setError('');setRevision(n=>n+1);}} className="mt-5 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh results</button>
 </div>;
}
