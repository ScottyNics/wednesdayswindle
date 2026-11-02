import React,{useEffect,useRef,useState}from'react';
import{validateCourse}from'./courses';
const field='w-full rounded-xl border border-slate-300 bg-white p-3 text-base';
const green='w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50';
const blank=count=>Array.from({length:count},(_,i)=>({hole_number:i+1,par:'4',stroke_index:''}));
export default function CourseManagement({api,session,courses,onChanged}){
 const[selectedId,setSelectedId]=useState(courses.find(c=>c.name==='Bungay')?.id||courses[0]?.id||''),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[prompt,setPrompt]=useState(null);
 const dialog=useRef(null),inFlight=useRef(false),request=useRef(null);
 const course=courses.find(c=>c.id===selectedId);
 useEffect(()=>{if(!courses.some(c=>c.id===selectedId))setSelectedId(courses[0]?.id||'');},[courses,selectedId]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(prompt&&!d.open)d.showModal();if(!prompt&&d.open)d.close();},[prompt]);
 function edit(source){
  setError('');setNotice('');request.current=null;
  setDraft(source?{id:source.id,revision:source.course_revision,isSwindleCourse:source.is_swindle_course===true,name:source.name,tees:source.tees,holes:source.sw_course_holes.map(h=>({...h}))}:{id:null,revision:null,isSwindleCourse:false,name:'',tees:'White',holes:blank(18)});
 }
 function update(key,value){setDraft(d=>({...d,[key]:value}));setError('');}
 function resize(count){setDraft(d=>({...d,holes:Array.from({length:count},(_,i)=>d.holes[i]||blank(count)[i])}));setError('');}
 function holeValue(i,key,value){setDraft(d=>({...d,holes:d.holes.map((h,index)=>index===i?{...h,[key]:value}:h)}));setError('');}

 function review(e){e.preventDefault();try{setError('');const values=validateCourse(draft);setPrompt({action:'save',values,id:draft.id,revision:draft.revision});}catch(e){setError(e.message);}}
 async function confirm(){
  if(inFlight.current||!prompt)return;const action=prompt;setPrompt(null);
  if(action.action==='cancel'){setDraft(null);setError('');return;}
  inFlight.current=true;setBusy(true);setError('');setNotice('');
  const fingerprint=JSON.stringify(action);
  if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
  try{
   const saved=await api.saveCourse(session,{...action.values,courseId:action.id,revision:action.revision,requestId:request.current.id});
   // The write succeeded: close the form before refresh so retry cannot create
   // a second record, even if the list request subsequently fails.
   setDraft(null);setNotice('Course saved. Existing rounds keep their original hole and tee details.');
   try{await onChanged();setSelectedId(saved.id);}catch{setError('The course was saved, but the list could not refresh. Select Refresh courses before continuing.');}
  }catch(e){setError(e.message);}finally{setBusy(false);inFlight.current=false;}
 }
 async function refresh(){if(inFlight.current)return;setBusy(true);setError('');try{await onChanged();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div>
  <dialog ref={dialog} onClose={()=>setPrompt(null)} onCancel={()=>setPrompt(null)} aria-labelledby="course-confirm-title" aria-describedby="course-confirm-text" className="w-full max-w-sm rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-black/60" style={{width:'calc(100% - 2rem)'}}><h2 id="course-confirm-title" className="mb-4 text-2xl font-bold">{prompt?.action==='cancel'?'Discard course edits?':'Save course?'}</h2><p id="course-confirm-text" className="mb-6 text-lg">{prompt?.action==='cancel'?'Your unsaved course details will be discarded.':`Save ${prompt?.values.name||''} — ${prompt?.values.tees||''}? These details apply to new rounds. Existing rounds keep their original details.`}</p><div className="flex gap-3"><button onClick={confirm} className="flex-1 rounded-2xl bg-emerald-600 py-4 text-xl font-bold text-white">Yes</button><button autoFocus onClick={()=>setPrompt(null)} className="flex-1 rounded-2xl bg-slate-700 py-4 text-xl font-bold text-white">Go back</button></div></dialog>
  <h3 className="text-xl font-bold">Courses and tees</h3>
  {!draft?<>
   <p className="mt-2 mb-5 text-sm text-slate-600">Wednesday Swindle uses Bungay’s fixed ten-hole course. Add other courses and tees here for future ad hoc rounds.</p>
   <label htmlFor="managed-course" className="mb-2 block font-semibold">Course and tees</label><select id="managed-course" value={selectedId} disabled={busy} onChange={e=>{setSelectedId(e.target.value);setError('');setNotice('');}} className={field}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name} · {c.tees}</option>)}</select>
   {course&&<><p className="my-4 text-slate-600">{course.sw_course_holes.length} holes · Par {course.sw_course_holes.reduce((sum,h)=>sum+h.par,0)}</p><div className="overflow-x-auto"><table className="w-full text-center"><caption className="sr-only">Saved course holes</caption><thead className="bg-slate-100"><tr><th scope="col" className="p-3">Hole</th><th scope="col">Par</th><th scope="col">S.I.</th></tr></thead><tbody>{course.sw_course_holes.map(h=><tr key={h.hole_number} className="border-t border-slate-200"><th scope="row" className="p-3 font-normal">{h.hole_number}</th><td>{h.par}</td><td>{h.stroke_index}</td></tr>)}</tbody></table></div><p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm">{course.is_swindle_course?'Wednesday Swindle · Bungay holes 1–10':'Course for ad hoc rounds'}</p><button disabled={busy} onClick={()=>edit(course)} className="mt-4 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Edit course and tees</button></>}
   {!courses.length&&<p className="mt-4 text-sm text-slate-600">No courses saved yet.</p>}
   <button disabled={busy} onClick={()=>edit(null)} className={`${green} mt-4`}>Add course / another set of tees</button><button disabled={busy} onClick={refresh} className="mt-3 w-full rounded-2xl border border-slate-300 p-3 font-semibold disabled:opacity-50">Refresh courses</button>
  </>:<form onSubmit={review}><fieldset disabled={busy}><legend className="mt-4 text-lg font-semibold">{draft.id?'Edit course':'New course and tees'}</legend>
   <label htmlFor="course-name" className="mt-4 mb-2 block font-semibold">Course name</label><input id="course-name" maxLength="100" required disabled={draft.isSwindleCourse} value={draft.name} onChange={e=>update('name',e.target.value)} className={field}/>
   <label htmlFor="course-tees" className="mt-4 mb-2 block font-semibold">Tees</label><input id="course-tees" maxLength="50" required disabled={draft.isSwindleCourse} placeholder="White" value={draft.tees} onChange={e=>update('tees',e.target.value)} className={field}/>
   <label htmlFor="course-count" className="mt-4 mb-2 block font-semibold">Number of holes</label><select id="course-count" disabled={draft.isSwindleCourse} value={draft.holes.length} onChange={e=>resize(Number(e.target.value))} className={field}>{[9,10,18].map(n=><option key={n} value={n}>{n} holes</option>)}</select>
   <p className="my-4 text-sm text-slate-600">Enter the par and original stroke index printed on this tee’s scorecard. For a shorter course, keep the original indexes rather than renumbering them.</p>
   <div className="overflow-x-auto"><table className="w-full text-center text-sm"><caption className="sr-only">Enter par and stroke index for each hole</caption><thead className="bg-slate-100"><tr><th scope="col" className="p-2">Hole</th><th scope="col" className="p-2">Par</th><th scope="col" className="p-2">S.I.</th></tr></thead><tbody>{draft.holes.map((h,i)=><tr key={i} className="border-t border-slate-200"><th scope="row" className="p-2">{i+1}</th><td className="p-1"><input aria-label={`Hole ${i+1} par`} type="number" inputMode="numeric" min="3" max="6" step="1" required value={h.par} onChange={e=>holeValue(i,'par',e.target.value)} className="w-16 rounded-xl border border-slate-300 p-2 text-base"/></td><td className="p-1"><input aria-label={`Hole ${i+1} stroke index`} type="number" inputMode="numeric" min="1" max="18" step="1" required value={h.stroke_index} onChange={e=>holeValue(i,'stroke_index',e.target.value)} className="w-16 rounded-xl border border-slate-300 p-2 text-base"/></td></tr>)}</tbody></table></div>
   {draft.isSwindleCourse&&<p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm">This is the fixed Bungay Swindle course. You can update its pars and stroke indexes. Its name, tees and ten holes stay fixed.</p>}
   <p className="mt-5 text-sm text-slate-500">Unsaved edits are lost if you leave this tab or reload. Full-course ad hoc scoring will be added separately.</p><button disabled={busy} className={`${green} mt-4`}>{busy?'Saving…':'Review and save course'}</button><button type="button" onClick={()=>setPrompt({action:'cancel'})} className="mt-3 w-full rounded-2xl border border-slate-300 p-3 font-semibold">Cancel editing</button>
  </fieldset></form>}
  {notice&&<p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}{error&&<p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
 </div>;
}
