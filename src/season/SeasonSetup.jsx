import React,{useEffect,useRef,useState}from'react';
import{ukToday}from'./players';
const field='w-full rounded-2xl border border-slate-300 bg-white p-3 text-base';
const dateLabel=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
export default function SeasonSetup({api,session}){
 const today=ukToday(),initialYear=Number(today.slice(0,4))+(Number(today.slice(5,7))>=11?1:0);
 const[year,setYear]=useState(String(initialYear)),[name,setName]=useState(`Wednesday Swindle ${initialYear}`),[plan,setPlan]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0),[prompt,setPrompt]=useState(null);
 const dialog=useRef(null),inFlight=useRef(false);
 useEffect(()=>{
  let active=true;setPlan(null);setError('');setLoading(true);
  if(!/^\d{4}$/.test(year)||Number(year)<2000||Number(year)>2100){setError('Choose a year between 2000 and 2100.');setLoading(false);return;}
  api.seasonPlan(session,Number(year)).then(data=>{if(active)setPlan(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[api,session,year,revision]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(prompt&&!d.open)d.showModal();if(!prompt&&d.open)d.close();},[prompt]);
 function changeYear(value){setYear(value);setName(`Wednesday Swindle ${value}`);setNotice('');}
 async function create(){
  if(inFlight.current||!prompt)return;const details=prompt;setPrompt(null);inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{await api.createSeason(session,details.year,details.name);setNotice('Season created. Open Players to register each player with their current club handicap for this season.');setRevision(n=>n+1);}
  catch(e){setError(e.message);}finally{setBusy(false);inFlight.current=false;}
 }
 return <div>
  <dialog ref={dialog} onClose={()=>setPrompt(null)} onCancel={()=>setPrompt(null)} aria-labelledby="setup-title" aria-describedby="setup-confirmation" className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-black/60" style={{width:'calc(100% - 2rem)'}}><h2 id="setup-title" className="mb-4 text-2xl font-bold">Create this season?</h2><p id="setup-confirmation" className="mb-6 text-lg">Create {prompt?.name} with {prompt?.weeks} Wednesdays and hide season standings from {prompt?dateLabel(prompt.blackout):''}? Players will start with fresh season registrations.</p><div className="flex gap-3"><button onClick={create} className="flex-1 rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white">Yes</button><button autoFocus onClick={()=>setPrompt(null)} className="flex-1 rounded-2xl bg-slate-700 py-4 text-xl font-bold text-white">Go back</button></div></dialog>
  <h3 className="text-xl font-bold">Set up a season</h3><p className="mt-2 mb-5 text-sm text-slate-600">Every Wednesday from the first Wednesday after the spring clock change to the last before the autumn clock change.</p>
  <label htmlFor="setup-year" className="mb-2 block font-semibold">Season year</label><input id="setup-year" type="number" min="2000" max="2100" step="1" value={year} disabled={busy} onChange={e=>changeYear(e.target.value)} className={field}/>
  {loading&&<p role="status" className="mt-4">Checking season dates…</p>}
  {plan&&<>
   <dl className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm"><div><dt className="font-semibold">First Wednesday</dt><dd>{dateLabel(plan.start_date)}</dd></div><div><dt className="font-semibold">Final Wednesday</dt><dd>{dateLabel(plan.end_date)}</dd></div><div><dt className="font-semibold">Competition weeks</dt><dd>{plan.weeks.length}</dd></div><div><dt className="font-semibold">Automatic blackout starts</dt><dd>{dateLabel(plan.leaderboard_hidden_from)} · final five weeks</dd></div></dl>
   <p className="mt-3 text-sm text-slate-600">Best 10 round average · 10 rounds to qualify · one Joker per player. Published weekly scores remain visible during the blackout.</p>
   {plan.existing?<div className="mt-5 rounded-2xl bg-emerald-50 p-4"><h4 className="font-bold">Already set up: {plan.existing.name}</h4><p className="mt-2 text-sm">{plan.existing.results_revealed?'Season results have been revealed.':plan.existing.leaderboard_hidden_from?`Current blackout: ${dateLabel(plan.existing.leaderboard_hidden_from)}.`:'No blackout date is currently set.'} Manage visibility in Season.</p></div>:<>
    <label htmlFor="setup-name" className="mt-5 mb-2 block font-semibold">Season name</label><input id="setup-name" maxLength="100" value={name} disabled={busy} onChange={e=>setName(e.target.value)} className={field}/>
    <button disabled={busy||loading||!name.trim()} onClick={()=>setPrompt({year:plan.year,name:name.trim(),weeks:plan.weeks.length,blackout:plan.leaderboard_hidden_from})} className="mt-4 w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50">{busy?'Creating…':'Create season'}</button>
   </>}
   <details className="mt-5 rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer font-semibold">View all Wednesdays</summary><ol className="mt-3 space-y-2 text-sm">{plan.weeks.map(w=><li key={w.week_number} className={w.hidden?'font-semibold text-amber-800':''}>Week {w.week_number} · {dateLabel(w.played_on)}{w.hidden?' · standings hidden':''}</li>)}</ol><p className="mt-3 text-xs text-slate-500">These are the planned dates. Current visibility settings are shown above for an existing season.</p></details>
   <p className="mt-4 text-sm text-slate-600">Register starting handicaps in Players using each player’s current club handicap at their first round. Previous season cuts and Jokers do not carry over. Create each week’s groups in Rounds when you play.</p>
  </>}
  {notice&&<p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}{error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
  <button disabled={busy||loading} onClick={()=>setRevision(n=>n+1)} className="mt-5 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh season setup</button>
 </div>;
}
