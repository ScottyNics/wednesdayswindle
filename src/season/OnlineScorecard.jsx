import React, { useEffect, useRef, useState } from 'react';
import { buildHoleScores, holeShots, playerTotals, pointsFor } from './scoring';
const green='w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50';
const secondary='w-full rounded-2xl bg-slate-700 p-4 text-lg font-bold text-white disabled:opacity-50';
const hcp=value=>value<0?`+${Math.abs(value)}`:value;

export default function OnlineScorecard({api,session,cardId,onBack}) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[refreshNeeded,setRefreshNeeded]=useState(false);
  const [editing,setEditing]=useState(null),[draft,setDraft]=useState({}),[prompt,setPrompt]=useState(null);
  const dialogRef=useRef(null),inFlight=useRef(false);
  useEffect(()=>{
    let active=true;setLoading(true);
    api.loadScorecard(session,cardId).then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[api,session,cardId]);
  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog)return;
    if(prompt&&!dialog.open)dialog.showModal();
    if(!prompt&&dialog.open)dialog.close();
  },[prompt]);

  async function refresh(){
    if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');
    try{setData(await api.loadScorecard(session,cardId));setRefreshNeeded(false);setEditing(null);setDraft({});setNotice('Scorecard refreshed.');}
    catch(e){setError(e.message);}finally{setBusy(false);inFlight.current=false;}
  }
  function beginEdit(hole){
    const next={};data.entries.forEach(entry=>{
      const score=data.scores.find(s=>s.entry_id===entry.id&&s.hole_position===hole.position);
      next[entry.id]=score?(score.no_score?'NS':String(score.gross_score)):String(hole.par);
    });setDraft(next);setEditing(hole);setPrompt(null);setError('');setNotice('');
  }
  function chooseHole(hole){
    if(locked||busy||refreshNeeded)return;
    if(data.scores.some(s=>s.hole_position===hole.position))setPrompt({type:'edit',hole});
    else beginEdit(hole);
  }
  async function save(e){
    e.preventDefault();if(inFlight.current)return;
    let scores;try{scores=buildHoleScores(data.entries,draft);}catch(e){setError(e.message);return;}
    const hole=editing;inFlight.current=true;setBusy(true);setError('');setNotice('');
    try{
      const revision=await api.saveHole(session,cardId,hole.position,scores,data.card.score_revision);
      // Keep the confirmed write visible even if its follow-up read fails.
      setData(prev=>({...prev,card:{...prev.card,score_revision:revision},scores:[...prev.scores.filter(s=>s.hole_position!==hole.position),...scores.map(s=>({...s,hole_position:hole.position}))]}));
      setEditing(null);setDraft({});setNotice(`Hole ${hole.course_hole_number} saved online.`);
      try{setData(await api.loadScorecard(session,cardId));setRefreshNeeded(false);}
      catch{setRefreshNeeded(true);setError('The scores were saved online, but the latest scorecard could not be loaded. Refresh before continuing.');}
    }catch(e){setError(e.message);if(e.code==='40001')setRefreshNeeded(true);}
    finally{setBusy(false);inFlight.current=false;}
  }
  async function submit(){
    if(inFlight.current)return;setPrompt(null);inFlight.current=true;setBusy(true);setError('');setNotice('');
    try{
      const revision=await api.submitScorecard(session,cardId,data.card.score_revision);
      setData(prev=>({...prev,card:{...prev.card,status:'submitted',score_revision:revision}}));setNotice('Scorecard submitted. Weekly results will be revealed by the organiser.');
    }catch(e){setError(e.message);if(e.code==='40001')setRefreshNeeded(true);}
    finally{setBusy(false);inFlight.current=false;}
  }
  const locked=data&&(data.card.status!=='draft'||!['in_progress','submitted'].includes(data.card.sw_events.status));
  const totals=data?.entries.map(entry=>playerTotals(entry,data.holes,data.scores));
  const complete=!!data&&totals.every(t=>t.played===data.holes.length);
  return <div>
    <dialog ref={dialogRef} aria-labelledby="online-confirm-title" aria-describedby="online-confirm-text" onCancel={()=>setPrompt(null)} onClose={()=>setPrompt(null)} className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-black/60" style={{width:'calc(100% - 2rem)'}}>
      <h2 id="online-confirm-title" className="text-2xl font-bold mb-4">{prompt?.type==='edit'?'Change scores?':'Submit scorecard?'}</h2>
      <p id="online-confirm-text" className="text-lg mb-6">{prompt?.type==='edit'?`Are you sure you want to change the scores for hole number ${prompt.hole.course_hole_number}?`:'This will lock your group’s scores for organiser review. Are you sure you want to submit?'}</p>
      <div className="flex gap-3"><button type="button" onClick={()=>prompt?.type==='edit'?beginEdit(prompt.hole):submit()} className="flex-1 rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white">Yes</button><button type="button" autoFocus onClick={()=>setPrompt(null)} className="flex-1 rounded-2xl bg-slate-700 py-4 text-xl font-bold text-white">Go back</button></div>
    </dialog>
    {loading?<p role="status">Loading scorecard…</p>:data?<>
      <h3 className="text-xl font-bold">{editing?`Hole ${editing.course_hole_number}`:'Group scorecard'}</h3>
      <p className="mt-2 text-sm text-slate-600">{data.card.sw_events.course_name_snapshot} · {data.card.sw_events.tees_snapshot} · {data.card.sw_events.played_on}</p>
      {locked&&<p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{data.card.status==='submitted'?'Submitted · scores are locked for review.':'This event is closed to score changes.'}</p>}
      {editing?<form onSubmit={save} className="mt-5">
        <p className="mb-4 text-sm text-slate-600">Par {editing.par} · Stroke index {editing.stroke_index}. Save scores for the whole group together.</p>
        <fieldset disabled={busy||refreshNeeded}>
          <legend className="sr-only">Scores for this hole</legend>
          {data.entries.map(entry=><div key={entry.id} className="mb-4 rounded-2xl bg-slate-50 p-4">
            <label htmlFor={`score-${entry.id}`} className="block font-bold">{entry.sw_players?.name} <span className="font-normal text-slate-500">(HCP {hcp(entry.handicap_used)})</span></label>
            <div className="mt-3 flex items-center gap-3"><input id={`score-${entry.id}`} type="number" min="1" max="99" step="1" required={draft[entry.id]!=='NS'} disabled={draft[entry.id]==='NS'} value={draft[entry.id]==='NS'?'':draft[entry.id]||''} placeholder={draft[entry.id]==='NS'?'—':''} onFocus={e=>e.target.select()} onChange={e=>setDraft(d=>({...d,[entry.id]:e.target.value}))} className="w-24 rounded-2xl border border-slate-300 p-3 text-center text-3xl"/><button type="button" aria-pressed={draft[entry.id]==='NS'} onClick={()=>setDraft(d=>({...d,[entry.id]:d[entry.id]==='NS'?String(editing.par):'NS'}))} className={`flex-1 rounded-2xl border p-3 font-semibold ${draft[entry.id]==='NS'?'bg-slate-700 text-white':'bg-white text-slate-700'}`}>No Score</button></div>
          </div>)}
          <button className={green}> {busy?'Saving…':'Save hole scores'} </button>
        </fieldset>
        <button type="button" disabled={busy} onClick={()=>{setEditing(null);setDraft({});setError('');}} className={`${secondary} mt-3`}>Go back without saving</button>
      </form>:<>
        <p className="my-4 text-sm text-slate-600">{locked?'Saved scores and totals.':'Tap a hole to enter scores. Scores are saved online after each hole.'}</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full text-center text-sm"><caption className="sr-only">Group scores and Stableford points</caption><thead className="bg-slate-100"><tr><th scope="col" className="p-2">Hole</th><th scope="col" className="p-2">Par</th><th scope="col" className="p-2">S.I.</th>{data.entries.map(entry=><th scope="col" key={entry.id} className="min-w-[76px] border-l border-slate-300 p-2">{entry.sw_players?.name}<span className="block text-xs font-normal">HCP {hcp(entry.handicap_used)}</span>{entry.joker_declared_at&&<span className="block text-xs text-purple-700">Joker</span>}</th>)}</tr></thead><tbody>
          {data.holes.map(hole=><tr key={hole.position} className={`border-t border-slate-200 ${locked?'':'cursor-pointer'} odd:bg-white even:bg-slate-50`} onClick={()=>chooseHole(hole)}>
            <th scope="row" className="p-2"><button type="button" disabled={locked||busy||refreshNeeded} aria-label={`Enter or change scores for hole ${hole.course_hole_number}`} className="rounded-lg p-2 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600">{hole.course_hole_number}</button></th><td className="p-2">{hole.par}</td><td className="p-2">{hole.stroke_index}</td>
            {data.entries.map(entry=>{
              const score=data.scores.find(s=>s.entry_id===entry.id&&s.hole_position===hole.position),points=pointsFor(score,hole.par,entry.handicap_used,hole.stroke_index),shots=holeShots(entry.handicap_used,hole.stroke_index);
              const eagle=score&&!score.no_score&&score.gross_score===hole.par-2,birdie=score&&!score.no_score&&score.gross_score===hole.par-1;
              return <td key={entry.id} className="border-l border-slate-200 p-2"><span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${eagle?'border-[5px] border-double border-emerald-600':birdie?'border-2 border-emerald-600':''}`}>{score?(score.no_score?'—':score.gross_score):'—'}</span>{shots!==0&&<span className={`ml-1 text-xs ${shots<0?'text-red-700':'text-slate-500'}`}>{shots>0?'•'.repeat(Math.min(shots,3)):'−'}</span>}<span className={`mt-1 block text-xs font-bold ${points===null?'text-slate-400':points<2?'text-red-700':points===2?'text-amber-700':'text-emerald-700'}`}>{points===null?'Not entered':`${points} pts`}</span></td>;
            })}
          </tr>)}
          {['Points','Birdies','Blobs','Holes'].map((label,i)=><tr key={label} className="border-t bg-slate-100"><th scope="row" colSpan={3} className="p-3 text-left">{label}</th>{totals.map((total,index)=><td key={data.entries[index].id} className="border-l border-slate-200 p-2 font-bold">{i===0?total.points:i===1?total.birdies:i===2?total.blobs:`${total.played}/${data.holes.length}`}</td>)}</tr>)}
        </tbody></table></div>
        <p className="mt-3 text-xs text-slate-500">Points shown are ordinary weekly points. A declared Joker doubles the season score only. Eagles count as two birdies.</p>
        {!locked&&<button disabled={!complete||busy||refreshNeeded} onClick={()=>setPrompt({type:'submit'})} className={`${green} mt-5`}>{complete?'Submit completed scorecard':'Complete every hole to submit'}</button>}
      </>}
      {notice&&<p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    </>:null}
    {error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button type="button" disabled={busy||loading} onClick={refresh} className="mt-4 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh scorecard{editing?' (discard unsaved edits)':''}</button>
    <button type="button" disabled={busy} onClick={onBack} className={`${secondary} mt-3`}>Back to rounds{editing?' without saving':''}</button>
  </div>;
}
