import React, { useEffect, useRef, useState } from 'react';
import { decideWeeklyWinner, winnerCut } from './results';
const field='w-full rounded-2xl border border-slate-300 bg-white p-3 text-base';
const green='w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50';
const statusLabel={in_progress:'In progress',submitted:'Awaiting review',finalised:'Finalised · not published',published:'Published',scheduled:'Scheduled'};
const handicap=n=>n<0?`+${Math.abs(n)}`:n;
export default function WeeklyResults({api,session}) {
 const [seasons,setSeasons]=useState([]),[seasonId,setSeasonId]=useState(''),[events,setEvents]=useState([]),[eventId,setEventId]=useState('');
 const [review,setReview]=useState(null),[manual,setManual]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[prompt,setPrompt]=useState(null);
 const dialogRef=useRef(null),inFlight=useRef(false);
 useEffect(()=>{let active=true;api.loadWeeklySeasons(session).then(seasons=>{if(active){setSeasons(seasons);setSeasonId(seasons.find(s=>s.name==='Test Season')?.id||seasons[0]?.id||'');if(!seasons.length)setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[api,session]);
 useEffect(()=>{
   if(!seasonId)return;let active=true;const previousEvent=eventId;setEventId('');setReview(null);setEvents([]);setLoading(true);setManual('');setError('');setNotice('');
   api.loadWeeklyEvents(session,seasonId).then(data=>{if(active){setEvents(data);setEventId(data.some(ev=>ev.id===previousEvent)?previousEvent:data[0]?.id||'');if(!data.length)setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
   return()=>{active=false;};
 },[api,session,seasonId,revision]);
 useEffect(()=>{
   if(!eventId)return;let active=true;setLoading(true);setReview(null);setManual('');setError('');
   api.reviewWeeklyEvent(session,eventId).then(data=>{if(active)setReview(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;};
 },[api,session,eventId,revision]);
 useEffect(()=>{const d=dialogRef.current;if(!d)return;if(prompt&&!d.open)d.showModal();if(!prompt&&d.open)d.close();},[prompt]);
 const decision=decideWeeklyWinner(review?.standings||[],review?.event.winner_player_id);
 const winner=decision.winner||decision.tied.find(row=>row.player_id===manual);
 const terminal=review&&['finalised','published'].includes(review.event.status);
 async function act(){
   if(inFlight.current)return;const action=prompt;setPrompt(null);inFlight.current=true;setBusy(true);setError('');setNotice('');
   try{
     if(action==='finalise')await api.confirmWeeklyEvent(session,eventId,review.review_token,decision.tied.length?manual:null);
     else await api.publishWeeklyEvent(session,eventId);
     setNotice(action==='finalise'?'Results finalised. The winner’s handicap cut has been recorded.':'Weekly results marked as published.');
     setReview(null);
     try{setReview(await api.reviewWeeklyEvent(session,eventId));setManual('');}
     catch{setError('The action succeeded, but results could not be refreshed. Refresh results before continuing.');}
   }catch(e){setError(e.message);if(e.code==='40001')setReview(null);}
   finally{setBusy(false);inFlight.current=false;}
 }
 return <div>
   <dialog ref={dialogRef} aria-labelledby="weekly-confirm-title" aria-describedby="weekly-confirm-text" onClose={()=>setPrompt(null)} onCancel={()=>setPrompt(null)} className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-black/60" style={{width:'calc(100% - 2rem)'}}>
     <h2 id="weekly-confirm-title" className="mb-4 text-2xl font-bold">{prompt==='finalise'?'Finalise weekly results?':'Publish weekly results?'}</h2>
     <p id="weekly-confirm-text" className="mb-6 text-lg">{prompt==='finalise'?`Confirm ${winner?.name||'the selected player'} as the winner? Their handicap will be reduced by ${winner?winnerCut(winner.handicap_used):''} shot(s) for subsequent rounds. Results will remain unpublished.`:'Have you announced the winner? This will mark the weekly results as published. It will not reveal hidden season standings.'}</p>
     <div className="flex gap-3"><button onClick={act} className="flex-1 rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white">Yes</button><button autoFocus onClick={()=>setPrompt(null)} className="flex-1 rounded-2xl bg-slate-700 py-4 text-xl font-bold text-white">Go back</button></div>
   </dialog>
   <h3 className="text-xl font-bold">Weekly results</h3><p className="mt-2 mb-5 text-sm text-slate-600">Private organiser review. Finish all groups before confirming the winner.</p>
   <label htmlFor="results-season" className="mb-2 block font-semibold">Season</label><select id="results-season" disabled={busy} value={seasonId} onChange={e=>setSeasonId(e.target.value)} className={field}><option value="">Select season</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
   <label htmlFor="results-event" className="mt-4 mb-2 block font-semibold">Weekly event</label><select id="results-event" disabled={busy||!events.length} value={eventId} onChange={e=>{setEventId(e.target.value);setNotice('');}} className={field}><option value="">Select event</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.played_on} · {ev.course_name_snapshot}</option>)}</select>
   {loading&&<p role="status" className="mt-4">Loading results…</p>}
   {!loading&&!events.length&&!error&&<p className="mt-4 rounded-2xl bg-slate-100 p-4">No weekly events in this season yet.</p>}
   {review&&<>
     <p className="mt-5 rounded-2xl bg-slate-100 p-4 font-semibold">{statusLabel[review.event.status]||review.event.status}</p>
     <h4 className="mt-5 mb-3 font-bold">Group progress</h4>
     {review.groups.map((group,index)=><div key={group.id} className="mb-3 rounded-2xl border border-slate-200 p-4"><p className="font-semibold">Group {index+1} · {group.status==='submitted'?'Submitted':'Not submitted'}</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{group.players.map(p=><li key={p.id}>{p.name} · {p.holes_recorded}/{p.holes_expected} holes{p.complete?' · complete':''}</li>)}</ul></div>)}
     {!review.groups.length&&<p className="text-sm text-slate-600">No groups registered yet.</p>}
     <h4 className="mt-5 mb-3 font-bold">{terminal?'Confirmed standings':'Provisional standings'}</h4>
     {!terminal&&!review.can_finalise&&<p className="mb-3 text-sm text-amber-800">Unfinished groups can still affect the winner. Finalise is available after all groups submit complete scorecards.</p>}
     <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-sm"><caption className="sr-only">Weekly standings using ordinary Stableford points</caption><thead className="bg-slate-100"><tr><th scope="col" className="p-3 text-left">Player</th><th scope="col" className="p-3">Points</th><th scope="col" className="p-3">Birdies</th><th scope="col" className="p-3">Blobs</th></tr></thead><tbody>{review.standings.map(row=><tr key={row.player_id} className={`border-t border-slate-200 ${terminal&&row.player_id===review.event.winner_player_id?'bg-emerald-50 font-semibold':''}`}><th scope="row" className="p-3 text-left font-medium">{row.name}{terminal&&row.player_id===review.event.winner_player_id&&<span className="block text-xs text-emerald-700">Winner</span>}</th><td className="p-3 text-center">{row.weekly_points}</td><td className="p-3 text-center">{row.birdies}</td><td className="p-3 text-center">{row.blobs}</td></tr>)}</tbody></table>{!review.standings.length&&<p className="p-4 text-sm text-slate-600">No complete scores yet.</p>}</div>
     <p className="mt-3 text-xs text-slate-500">Jokers do not affect the weekly winner.</p>
     {!!review.standings.length&&<details className="mt-4 rounded-2xl border border-slate-200 p-3"><summary className="cursor-pointer font-semibold">View countback details</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-xs text-center"><thead><tr>{['Player','Last 5','Last 3','Last 2','Last 1','HCP','Avg blobs'].map(label=><th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead><tbody>{review.standings.map(row=><tr key={row.player_id} className="border-t"><th scope="row" className="p-2 text-left font-normal">{row.name}</th>{['last_5','last_3','last_2','last_1','handicap_used','season_blob_average'].map(key=><td key={key} className="p-2">{key==='season_blob_average'?(row[key]===null?'—':Number(row[key]).toFixed(2)):key==='handicap_used'?handicap(row[key]):row[key]}</td>)}</tr>)}</tbody></table></div></details>}
     {decision.tied.length>1&&!terminal&&<div className="mt-4"><label htmlFor="manual-winner" className="mb-2 block font-semibold">Choose the winner from the tied leaders</label><select id="manual-winner" disabled={busy} value={manual} onChange={e=>setManual(e.target.value)} className={field}><option value="">Select winner</option>{decision.tied.map(row=><option key={row.player_id} value={row.player_id}>{row.name}</option>)}</select></div>}
     {winner&&<div className="mt-5 rounded-2xl bg-emerald-50 p-4"><p className="font-bold text-emerald-900">{terminal?'Winner':'Provisional winner'}: {winner.name}</p><p className="mt-2 text-sm text-emerald-800">{decision.reason}</p><p className="mt-2 text-sm text-emerald-800">Handicap: {handicap(winner.handicap_used)} → {handicap(winner.handicap_used-winnerCut(winner.handicap_used))} ({winnerCut(winner.handicap_used)} shot cut{terminal?' recorded':' on confirmation'})</p></div>}
     {!terminal&&<button disabled={busy||loading||!review.can_finalise||!winner} onClick={()=>setPrompt('finalise')} className={`${green} mt-5`}>{busy?'Working…':'Finalise weekly results'}</button>}
     {review.event.status==='finalised'&&<button disabled={busy||loading} onClick={()=>setPrompt('publish')} className={`${green} mt-5`}>{busy?'Working…':'Publish weekly results'}</button>}
     {review.event.status==='published'&&<p className="mt-5 text-sm font-semibold text-emerald-700">Weekly results have been marked as published.</p>}
   </>}
   {notice&&<p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
   {error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
   <button disabled={busy||!seasonId} onClick={()=>{setNotice('');setRevision(n=>n+1);}} className="mt-5 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh results</button>
 </div>;
}
