import React, { useEffect, useRef, useState } from 'react';
import OnlineScorecard from './OnlineScorecard';
import { ukToday } from './players';
import { swindleHoles } from './courses';
const field='w-full rounded-2xl border border-slate-300 bg-white p-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';
const handicap=value=>value<0?`+${Math.abs(value)}`:value;
export default function RoundSetup({api,session,courses}) {
  const [seasons,setSeasons]=useState([]),[seasonId,setSeasonId]=useState('');
  const [courseId,setCourseId]=useState(courses.find(c=>c.name==='Bungay')?.id||courses[0]?.id||'');
  const [date,setDate]=useState(ukToday()),[options,setOptions]=useState(null);
  const [selected,setSelected]=useState([]),[jokers,setJokers]=useState([]),[confirmed,setConfirmed]=useState(false);
  const [cards,setCards]=useState([]),[opened,setOpened]=useState(null);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const request=useRef(null),action=useRef(false);
  const today=ukToday(),season=seasons.find(s=>s.id===seasonId),course=courses.find(c=>c.id===courseId);
  useEffect(()=>{
    let active=true;
    Promise.all([api.loadPlayerSetup(session),api.loadMyScorecards(session)]).then(([setup,saved])=>{
      if(!active)return;setSeasons(setup.seasons);setCards(saved);
      setSeasonId(id=>setup.seasons.some(s=>s.id===id)?id:setup.seasons.find(s=>s.name==='Test Season')?.id||setup.seasons[0]?.id||'');
      if(!setup.seasons.length)setLoading(false);
    }).catch(e=>{if(active){setError(e.message);setLoading(false);}});
    return()=>{active=false;};
  },[api,session,revision]);
  useEffect(()=>{
    if(season)setDate(today<season.start_date?season.start_date:today>season.end_date?season.end_date:today);
  },[seasonId,season?.start_date,season?.end_date]);
  useEffect(()=>{
    setSelected([]);setJokers([]);setConfirmed(false);setOptions(null);
    if(!seasonId||!date)return;
    let active=true;setLoading(true);
    api.loadRoundOptions(session,seasonId,date).then(data=>{if(active){setOptions(data);setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
    return()=>{active=false;};
  },[api,session,seasonId,date,revision]);
  const event=options?.events[0],closed=event&&!['scheduled','in_progress'].includes(event.status);
  const mismatch=event&&event.course_id!==courseId;
  const valid=season&&date>=season.start_date&&date<=season.end_date&&date<=today;
  const members=options?.members.filter(m=>m.joined_on<=date)||[];
  const used=id=>options?.entries.some(e=>e.player_id===id&&e.joker_declared_at);
  const entered=id=>options?.entries.some(e=>e.player_id===id&&options.events.some(ev=>ev.id===e.event_id));
  function toggle(id){setConfirmed(false);if(selected.includes(id)){setSelected(ids=>ids.filter(p=>p!==id));setJokers(ids=>ids.filter(p=>p!==id));}else if(selected.length<4)setSelected(ids=>[...ids,id]);}
  async function start(e){
    e.preventDefault();if(action.current||!options||!selected.length||!confirmed)return;
    action.current=true;setSaving(true);setError('');
    const details={seasonId,courseId,playedOn:date,playerIds:selected,jokerPlayerIds:jokers},fingerprint=JSON.stringify(details);
    if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
    try{
      const id=await api.startRound(session,{...details,requestId:request.current.id});
      setOpened({id,sw_events:{season_id:seasonId,played_on:date,course_name_snapshot:course.name,tees_snapshot:course.tees},sw_entries:selected.map(playerId=>{
        const m=members.find(p=>p.player_id===playerId);return{player_id:playerId,handicap_used:m.current_handicap,joker_declared_at:jokers.includes(playerId)?'declared':null,sw_players:{name:m.sw_players.name}};
      })});
      setSelected([]);setJokers([]);setConfirmed(false);setRevision(n=>n+1);
      try{const saved=await api.loadMyScorecards(session);setCards(saved);const actual=saved.find(c=>c.id===id);if(actual)setOpened(actual);}
      catch{setError('The round was saved, but details could not be refreshed. Use Refresh rounds to reload.');}
    }catch(e){setError(e.message);}finally{setSaving(false);action.current=false;}
  }
  if(opened)return <OnlineScorecard api={api} session={session} cardId={opened.id} onBack={()=>{setOpened(null);setError('');setRevision(n=>n+1);}} />;
  return <div>
    <h3 className="text-xl font-bold">Wednesday Swindle round</h3><p className="mt-2 mb-5 text-sm text-slate-600">Choose your group and declare any Jokers before starting. Groups on the same date join the same weekly event.</p>
    <form onSubmit={start}><fieldset disabled={saving}><legend className="sr-only">Round setup</legend>
      <label htmlFor="round-season" className="mb-2 block font-semibold">Season</label><select id="round-season" required value={seasonId} onChange={e=>{setSeasonId(e.target.value);setError('');}} className={field}><option value="">Select season</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <label htmlFor="round-date" className="mt-4 mb-2 block font-semibold">Round date</label><input id="round-date" type="date" required min={season?.start_date} max={season?(season.end_date<today?season.end_date:today):today} value={date} onChange={e=>{setDate(e.target.value);setError('');}} className={field}/>
      <label htmlFor="round-course" className="mt-4 mb-2 block font-semibold">Course and tees</label><select id="round-course" required value={courseId} onChange={e=>{setCourseId(e.target.value);setConfirmed(false);setError('');}} className={field}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name} · {c.tees}</option>)}</select>
      {course&&swindleHoles(course).length!==10&&!event&&<p className="mt-2 text-sm text-red-800">Save a ten-hole Swindle layout for these tees in Courses first.</p>}
      {course&&swindleHoles(course).length===10&&!event&&<p className="mt-2 text-sm text-slate-600">Swindle route: {swindleHoles(course).map(h=>h.hole_number).join(' → ')}</p>}
      {event&&!mismatch&&<p className="mt-2 text-sm text-slate-600">Joining this week’s event uses the course details saved when its first group started.</p>}
      {mismatch&&<p className="mt-2 text-sm text-red-800">This date already has an event on another course. Choose that course to join it.</p>}
      {closed&&<p className="mt-3 text-red-800">This event is closed to new groups.</p>}
      <h4 className="mt-6 mb-2 font-bold">Players · {selected.length}/4</h4><p className="mb-3 text-xs text-slate-500">Handicaps apply to the chosen date. Used Jokers cannot be selected.</p>
      {loading?<p role="status">Loading players…</p>:!members.length?<p className="rounded-2xl bg-slate-100 p-4">No players registered on this date. Add them in the Players tab first.</p>:<div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 px-3">{members.map(m=>{
        const id=m.player_id,chosen=selected.includes(id);return <div key={id} className="py-3">
          <label className="flex items-center gap-3"><input type="checkbox" checked={chosen} disabled={closed||entered(id)||(!chosen&&selected.length>=4)} onChange={()=>toggle(id)} className="h-5 w-5"/><span className="flex-1 font-semibold">{m.sw_players.name}</span><span>HCP {handicap(m.current_handicap)}</span></label>
          {entered(id)?<p className="mt-2 ml-8 text-xs text-slate-500">Already entered in this event</p>:chosen?<label className="mt-3 ml-8 flex items-center gap-2 text-sm"><input type="checkbox" checked={jokers.includes(id)} disabled={used(id)} onChange={e=>{setConfirmed(false);setJokers(ids=>e.target.checked?[...ids,id]:ids.filter(p=>p!==id));}}/>{used(id)?'Season Joker already used':'Play season Joker this round'}</label>:used(id)?<p className="mt-2 ml-8 text-xs text-slate-500">Season Joker already used</p>:null}
        </div>;
      })}</div>}
      <label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><input type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/><span>These players have not started their round. Joker choices are final once I start this round.</span></label>
      <button disabled={saving||loading||!options||!valid||(!event&&swindleHoles(course).length!==10)||mismatch||closed||!selected.length||!confirmed} className="mt-4 w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50">{saving?'Saving round…':'Start round'}</button>
    </fieldset></form>
    {error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
    <button disabled={saving} onClick={()=>{setError('');setRevision(n=>n+1);}} className="mt-4 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh rounds</button>
    <h4 className="mt-7 mb-3 font-bold">Your saved groups</h4>
    {cards.filter(c=>c.sw_events?.season_id===seasonId).map(card=><button type="button" key={card.id} disabled={saving} onClick={()=>{setOpened(card);setError('');}} className="mb-3 block w-full rounded-2xl border border-slate-200 p-4 text-left"><span className="font-semibold">{card.sw_events.played_on} · {card.sw_events.course_name_snapshot}</span><span className="mt-1 block text-sm text-slate-600">{card.sw_entries?.map(e=>e.sw_players?.name).filter(Boolean).join(', ')}</span></button>)}
    {!cards.some(c=>c.sw_events?.season_id===seasonId)&&<p className="text-sm text-slate-500">No saved groups for this season.</p>}
  </div>;
}
