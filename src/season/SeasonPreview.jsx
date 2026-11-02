import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createDatabaseApi } from './api';
import WeeklyResults from './WeeklyResults';
import RoundSetup from './RoundSetup';
import PlayerManagement from './PlayerManagement';
import { projectUrl, publishableKey } from './config';

const inputClass = 'w-full rounded-2xl border border-slate-300 bg-white p-4 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';
const buttonClass = 'w-full rounded-2xl bg-emerald-600 p-4 text-lg font-bold text-white disabled:opacity-50';

export default function SeasonPreview() {
  const [tab, setTab] = useState('courses');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const config = useMemo(() => {
    try {
      return { api: createDatabaseApi(projectUrl, publishableKey) };
    } catch (e) { return { error: e.message }; }
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      generation.current++;
      setSession(null); setCourses([]); setPassword(''); setBusy(false);
      setError('Your session has expired. Please sign in again.');
    }, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);

  async function signIn(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const current = ++generation.current;
    let next;
    try {
      next = await config.api.signIn(email, password);
      const loaded = await config.api.loadCourses(next);
      if (generation.current !== current) return;
      setSession(next); setCourses(loaded);
      setSelectedId(loaded.find(c => c.name === 'Bungay')?.id || loaded[0]?.id || '');
    } catch (e) {
      if (next) await config.api.signOut(next).catch(() => {});
      if (generation.current === current) setError(e.message);
    } finally {
      if (generation.current === current) { setBusy(false); setPassword(''); }
    }
  }

  async function refresh() {
    setBusy(true); setError(''); const current = ++generation.current;
    try {
      const loaded = await config.api.loadCourses(session);
      if (generation.current === current) {
        setCourses(loaded);
        setSelectedId(id => loaded.some(c => c.id === id) ? id : loaded[0]?.id || '');
      }
    } catch (e) { if (generation.current === current) setError(e.message); }
    finally { if (generation.current === current) setBusy(false); }
  }

  function signOut() {
    const previous = session; generation.current++;
    setSession(null); setCourses([]); setError(''); setBusy(false); setPassword('');
    if (previous) config.api.signOut(previous).catch(() => {
      setError('Signed out on this screen. The server could not be reached to revoke the session; it will expire automatically.');
    });
  }

  const course = courses.find(c => c.id === selectedId);
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-emerald-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-lg">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-emerald-300">Season preview</p>
        <h1 className="mt-3 text-center text-3xl font-bold">Wednesday Swindle</h1>
        <p className="mt-3 mb-7 text-center text-slate-300">Your season starts here.</p>
        <section className="rounded-3xl bg-white p-6 text-slate-900 shadow-xl">
          {config.error ? (
            <><h2 className="text-2xl font-bold">Connect your database</h2><p className="mt-4" role="status">{config.error}</p><p className="mt-3 text-sm text-slate-600">Add the project URL and public publishable key to this development deployment, then rebuild.</p></>
          ) : !session ? (
            <form onSubmit={signIn}>
              <h2 className="text-2xl font-bold">Admin sign in</h2>
              <p className="mt-2 mb-5 text-slate-600">Use the app account you created in Supabase.</p>
              <label htmlFor="admin-email" className="mb-2 block font-semibold">Email</label>
              <input id="admin-email" type="email" autoComplete="username" required value={email} disabled={busy} onChange={e=>setEmail(e.target.value)} className={inputClass} />
              <label htmlFor="admin-password" className="mt-4 mb-2 block font-semibold">Password</label>
              <input id="admin-password" type="password" autoComplete="current-password" required value={password} disabled={busy} onChange={e=>setPassword(e.target.value)} className={inputClass} />
              <button disabled={busy} className={`${buttonClass} mt-6`}>{busy ? 'Connecting…' : 'Sign in'}</button>
              <p className="mt-4 text-sm text-slate-500">For this first preview, refreshing the page signs you out.</p>
            </form>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3"><h2 className="text-2xl font-bold">Club admin</h2><button onClick={signOut} className="rounded-xl border border-slate-300 px-3 py-2 font-semibold">Sign out</button></div>
              <p className="mt-3 mb-5 text-sm font-semibold text-emerald-700">Connected to Supabase · Admin access</p>
              <nav aria-label="Admin sections" className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
                {['courses', 'players', 'rounds', 'results'].map(value => <button key={value} type="button" aria-pressed={tab===value} onClick={()=>setTab(value)} className={`min-w-[80px] flex-1 rounded-xl p-2 text-sm font-semibold ${tab===value ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600'}`}>{value==='courses' ? 'Courses' : value==='players' ? 'Players' : value==='rounds' ? 'Rounds' : 'Results'}</button>)}
              </nav>
              {tab === 'players' ? <PlayerManagement api={config.api} session={session} /> : tab === 'results' ? <WeeklyResults api={config.api} session={session} /> : tab === 'rounds' ? <RoundSetup api={config.api} session={session} courses={courses} /> : <>
              {courses.length ? <>
                <label htmlFor="course-select" className="mb-2 block font-semibold">Course and tees</label>
                <select id="course-select" value={selectedId} onChange={e=>setSelectedId(e.target.value)} className={inputClass}>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.name} · {c.tees}</option>)}
                </select>
                {course && <>
                  <p className="my-4 text-slate-600">{course.sw_course_holes.length} configured holes · Par {course.sw_course_holes.reduce((sum,h)=>sum+h.par,0)}</p>
                  <table className="w-full text-center"><caption className="sr-only">Course hole details</caption><thead className="bg-slate-100"><tr><th scope="col" className="p-3">Hole</th><th scope="col">Par</th><th scope="col">S.I.</th></tr></thead><tbody>{course.sw_course_holes.map(h=><tr key={h.hole_number} className="border-t border-slate-200"><th scope="row" className="p-3 font-normal">{h.hole_number}</th><td>{h.par}</td><td>{h.stroke_index}</td></tr>)}</tbody></table>
                  {!course.sw_course_holes.length && <p className="mt-3">No holes have been added to this course yet.</p>}
                </>}
              </> : <p>No courses are available. Check the course setup in Supabase.</p>}
              <button onClick={refresh} disabled={busy} className={`${buttonClass} mt-5`}>{busy ? 'Loading…' : 'Refresh courses'}</button>
              </>}
            </>
          )}
          {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 text-red-800">{error}</p>}
        </section>
        <p className="mt-6 text-center text-sm text-slate-300">Manage your courses, season players and round setup.</p>
        <a className="mt-5 block text-center font-semibold underline underline-offset-4" href="?scorecard=1">Open the existing scorecard</a>
      </div>
    </main>
  );
}
