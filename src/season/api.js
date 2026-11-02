import { currentHandicaps, parseHandicap } from './players.js';
// Only use a public browser key here. Database permissions enforce access.
export function createDatabaseApi(projectUrl, publicKey, fetcher = fetch) {
  let base;
  try { base = new URL(projectUrl); } catch { throw new Error('Add your Supabase project URL to the preview settings.'); }
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    throw new Error('Use the HTTPS project URL, without an API path.');
  }
  if (!publicKey || publicKey.startsWith('sb_secret_')) {
    throw new Error('Use a public publishable key, never a secret key.');
  }
  if (!publicKey.startsWith('sb_publishable_')) {
    try {
      const payload = publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      if (JSON.parse(atob(payload)).role !== 'anon') throw new Error();
    } catch { throw new Error('Use a Supabase publishable key or legacy anon key.'); }
  }

  async function request(path, { token, body, method = 'GET' } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(new URL(path, base).href, {
        method, cache: 'no-store', signal: controller.signal,
        headers: {
          apikey: publicKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      const data = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        if (path.startsWith('/auth/v1/token')) throw new Error('Unable to sign in. Check your email and password, and that the account is confirmed.');
        if (path.startsWith('/rest/v1/rpc/sw_')) {
          if (data?.code === '22023') throw new Error(data.message);
          if (data?.code === 'PGRST202') throw new Error(path.includes('start_swindle') ? 'Run database/02-round-setup.sql in Supabase before starting a round.' : 'Run database/01-player-management.sql in Supabase before adding players.');
        }
        if (response.status === 401) throw new Error('Your session has expired. Sign out and sign in again.');
        if (response.status === 403) throw new Error('Access denied. Check the admin role and database permissions.');
        throw new Error('The database request failed. Check your project settings and try again.');
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The connection timed out. Check your connection and try again.');
      if (error instanceof TypeError) throw new Error('Unable to connect. Check your connection and Supabase project URL.');
      throw error;
    } finally { clearTimeout(timeout); }
  }

  return {
    async signIn(email, password) {
      const data = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: email.trim(), password } });
      if (!data?.access_token || !data?.user?.id || !Number.isFinite(data.expires_in)) throw new Error('The sign-in response was incomplete. Try again.');
      return { token: data.access_token, userId: data.user.id, expiresAt: Date.now() + data.expires_in * 1000 };
    },
    async loadCourses(session) {
      const query = new URLSearchParams({ select: 'role', user_id: `eq.${session.userId}` });
      const roles = await request(`/rest/v1/sw_user_roles?${query}`, { token: session.token });
      if (!Array.isArray(roles) || !roles.some(row => row.role === 'admin')) {
        throw new Error('This preview is for the main admin account. Scorer access will be added later.');
      }
      const coursesQuery = new URLSearchParams({ select: 'id,name,tees,sw_course_holes(hole_number,par,stroke_index)', order: 'name.asc' });
      const courses = await request(`/rest/v1/sw_courses?${coursesQuery}`, { token: session.token });
      if (!Array.isArray(courses)) throw new Error('Unexpected course response. Please try again.');
      return courses.map(course => ({ ...course, sw_course_holes: [...(course.sw_course_holes || [])].sort((a,b) => a.hole_number - b.hole_number) }));
    },
    async loadPlayerSetup(session) {
      const [seasons, players] = await Promise.all([
        request('/rest/v1/sw_seasons?select=id,name,start_date,end_date&order=start_date.desc,name.asc', { token: session.token }),
        request('/rest/v1/sw_players?select=id,name&order=name.asc', { token: session.token })
      ]);
      if (!Array.isArray(seasons) || !Array.isArray(players)) throw new Error('Unexpected player setup response. Please try again.');
      return { seasons, players };
    },
    async loadSeasonPlayers(session, seasonId, asOf) {
      const filter = `eq.${seasonId}`;
      const memberQuery = new URLSearchParams({ select: 'season_id,player_id,starting_handicap,joined_on,sw_players(id,name)', season_id: filter });
      const changesQuery = new URLSearchParams({ select: 'id,season_id,player_id,handicap_after,effective_from,created_at', season_id: filter });
      const [members, changes] = await Promise.all([
        request(`/rest/v1/sw_season_players?${memberQuery}`, { token: session.token }),
        request(`/rest/v1/sw_handicap_changes?${changesQuery}`, { token: session.token })
      ]);
      if (!Array.isArray(members) || !Array.isArray(changes)) throw new Error('Unexpected season response. Please try again.');
      if (members.some(m => !m.sw_players)) throw new Error('A player record is unavailable. Please check the database permissions.');
      return currentHandicaps(members, changes, asOf);
    },
    registerPlayer(session, { seasonId, name, handicap, existingPlayerId, joinedOn }) {
      return request('/rest/v1/rpc/sw_register_season_player', {
        token: session.token, method: 'POST', body: {
          p_season_id: seasonId, p_name: name.trim(),
          p_starting_handicap: parseHandicap(handicap),
          p_existing_player_id: existingPlayerId || null,
          p_joined_on: joinedOn
        }
      });
    },
    async loadRoundOptions(session, seasonId, playedOn) {
      const entriesQuery = new URLSearchParams({ select: 'player_id,event_id,joker_declared_at', season_id: `eq.${seasonId}` });
      const eventQuery = new URLSearchParams({ select: 'id,course_id,status', season_id: `eq.${seasonId}`, event_type: 'eq.swindle', played_on: `eq.${playedOn}`, status: 'neq.cancelled' });
      const [members, entries, events] = await Promise.all([
        this.loadSeasonPlayers(session, seasonId, playedOn),
        request(`/rest/v1/sw_entries?${entriesQuery}`, { token: session.token }),
        request(`/rest/v1/sw_events?${eventQuery}`, { token: session.token })
      ]);
      if (!Array.isArray(entries) || !Array.isArray(events)) throw new Error('Unexpected round setup response. Refresh and try again.');
      return { members, entries, events };
    },
    async loadMyScorecards(session) {
      const query = new URLSearchParams({ select: 'id,status,started_at,sw_events(id,season_id,played_on,course_name_snapshot,tees_snapshot),sw_entries(player_id,handicap_used,joker_declared_at,sw_players(name))', scorer_user_id: `eq.${session.userId}`, order: 'started_at.desc', limit: '50' });
      const cards = await request(`/rest/v1/sw_scorecards?${query}`, { token: session.token });
      if (!Array.isArray(cards)) throw new Error('Unable to read saved scorecards.');
      return cards;
    },
    startRound(session, { requestId, seasonId, courseId, playedOn, playerIds, jokerPlayerIds }) {
      return request('/rest/v1/rpc/sw_start_swindle_round', { token: session.token, method: 'POST', body: {
        p_request_id: requestId, p_season_id: seasonId, p_course_id: courseId,
        p_played_on: playedOn, p_player_ids: playerIds, p_joker_player_ids: jokerPlayerIds
      } });
    },
    signOut: session => request('/auth/v1/logout?scope=local', { token: session.token, method: 'POST' })
  };
}
