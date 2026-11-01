import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabaseApi } from '../src/season/api.js';
const base = 'https://example.supabase.co', key='sb_publishable_example';
const session={token:'user-token',userId:'player-id'};
const response = data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});

test('rejects secret and privileged legacy keys',()=>{
 assert.throws(()=>createDatabaseApi(base,'sb_secret_example'));
 const payload=btoa(JSON.stringify({role:'service_role'}));
 assert.throws(()=>createDatabaseApi(base,`x.${payload}.x`));
});
test('rejects malformed project URL',()=>{
 for(const url of ['http://example.com','https://example.com/rest/v1','https://u:p@example.com']) assert.throws(()=>createDatabaseApi(url,key));
});
test('sign in sends credentials only to Auth and returns limited in-memory session',async()=>{
 const api=createDatabaseApi(base,key,async(url,options)=>{
  assert.equal(url,base+'/auth/v1/token?grant_type=password');
  assert.equal(options.cache,'no-store');
  assert.deepEqual(JSON.parse(options.body),{email:'a@example.com',password:'password'});
  return response({access_token:'token',refresh_token:'unused',expires_in:3600,user:{id:'id'}});
 });
 const result=await api.signIn(' a@example.com ','password');
 assert.equal(result.token,'token'); assert.equal(result.refresh_token,undefined); assert.equal(result.userId,'id');
});
test('failed sign-in has no response-body or credential leak',async()=>{
 const api=createDatabaseApi(base,key,async()=>new Response('private detail',{status:400}));
 await assert.rejects(()=>api.signIn('email','secret'),/Unable to sign in/);
});
test('non-admin cannot trigger course request',async()=>{
 let calls=0;
 const api=createDatabaseApi(base,key,async()=>{calls++;return response([])});
 await assert.rejects(()=>api.loadCourses(session),/main admin/);assert.equal(calls,1);
});
test('course requests use user token and sort holes numerically',async()=>{
 let calls=0;
 const api=createDatabaseApi(base,key,async(url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer user-token');
  assert.equal(options.headers.apikey,key);
  calls++;
  if(calls===1){assert.equal(new URL(url).searchParams.get('user_id'),'eq.player-id');return response([{role:'admin'}]);}
  return response([{id:'course',sw_course_holes:[{hole_number:10},{hole_number:2}]}]);
 });
 assert.deepEqual((await api.loadCourses(session))[0].sw_course_holes.map(h=>h.hole_number),[2,10]);
});
test('permission denied is actionable',async()=>{
 const api=createDatabaseApi(base,key,async()=>new Response('{}',{status:403}));
 await assert.rejects(()=>api.loadCourses(session),/Access denied/);
});
test('network failure is actionable',async()=>{
 const api=createDatabaseApi(base,key,async()=>{throw new TypeError('fetch failed')});
 await assert.rejects(()=>api.loadCourses(session),/Unable to connect/);
});
test('logout revokes the current session',async()=>{
 const api=createDatabaseApi(base,key,async(url,options)=>{
  assert.equal(new URL(url).searchParams.get('scope'),'local');assert.equal(options.method,'POST');
  return new Response(null,{status:204});
 });await api.signOut(session);
});
