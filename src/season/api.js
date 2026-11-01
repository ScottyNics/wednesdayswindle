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
    signOut: session => request('/auth/v1/logout?scope=local', { token: session.token, method: 'POST' })
  };
}
