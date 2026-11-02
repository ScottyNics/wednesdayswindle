export function swindleHoles(course) {
  if (!course?.is_swindle_course) return [];
  const holes = course.sw_course_holes || [];
  const numbers = course.swindle_holes ?? (holes.length === 10 ? holes.map(h=>h.hole_number) : []);
  if (numbers.length !== 10 || new Set(numbers).size !== 10) return [];
  const selected = numbers.map(n=>holes.find(h=>h.hole_number === n));
  return selected.every(Boolean) ? selected : [];
}
export function validateCourse(draft) {
  const name = draft.name.trim().replace(/\s+/g,' '), tees = draft.tees.trim().replace(/\s+/g,' ');
  if (!name || name.length > 100 || !tees || tees.length > 50) throw new Error('Enter a course name (up to 100 characters) and tees (up to 50).');
  if (![9,10,18].includes(draft.holes.length)) throw new Error('Choose 9, 10 or 18 holes.');
  const integer = value => /^\d+$/.test(String(value)) ? Number(value) : NaN;
  const holes = draft.holes.map((h,i)=>({hole_number:i+1,par:integer(h.par),stroke_index:integer(h.stroke_index)}));
  if (holes.some(h=>h.par<3||h.par>6||!Number.isInteger(h.par)||h.stroke_index<1||h.stroke_index>18||!Number.isInteger(h.stroke_index))) throw new Error('Each hole needs a par from 3 to 6 and a whole-number stroke index from 1 to 18.');
  if (new Set(holes.map(h=>h.stroke_index)).size !== holes.length) throw new Error('Each hole must have a different stroke index. Keep the original course indexes for a shorter layout.');
  if (draft.isSwindleCourse && holes.length !== 10) throw new Error('The Bungay Swindle course must keep its ten holes.');
  return {name,tees,holes,swindleHoles:draft.isSwindleCourse?Array.from({length:10},(_,i)=>i+1):[]};
}
