// => public/services/Enrollments/enrollmentEligibilityService.js
// => Decides whether the student dashboard Enrollment page shows the "+"
// => button, and if so, whether TESDA is restricted to the student's
// => currently active sector(s) or fully open across all sectors.

import { pool } from '../../config/db.js';
import {
  getTesdaEnrollmentsByStudentId,
  getShsEnrollmentsByStudentId,
  countCoursesInSector,
} from '../../models/Enrollments/enrollmentEligibilityModel.js';

// => Terminal statuses per program - a student "clears" a program once
// => every enrollment they have in it sits in one of these. Any status
// => NOT in this list is treated as active/in-progress.
const TERMINAL_SHS   = ['Rejected', 'Dropped', 'Failed Assessment'];
const TERMINAL_TESDA = ['Rejected', 'Dropped', 'Passed Assessment', 'Failed Assessment'];

export const getEnrollmentEligibility = async (studentId) => {
  const [tesdaRows, shsRows] = await Promise.all([
    getTesdaEnrollmentsByStudentId(pool, studentId),
    getShsEnrollmentsByStudentId(pool, studentId),
  ]);

  const hasActiveShs   = shsRows.some(r => !TERMINAL_SHS.includes(r.status));
  const hasActiveTesda = tesdaRows.some(r => !TERMINAL_TESDA.includes(r.status));

  // => SHS side: only reachable when NEITHER program has an active
  // => enrollment right now - an active TESDA enrollment blocks SHS too,
  // => and vice versa, per the cross-program lock rule
  const canEnrollSHS = !hasActiveShs && !hasActiveTesda;

  let canEnrollTESDA = false;
  let tesdaMode = null;        // => 'cross' (any sector) or 'same-sector' (restricted)
  let eligibleSectorIds = [];  // => only populated when tesdaMode is 'same-sector'

  // => Every course_id this student currently has a non-terminal (active
  // => or Reserved) TESDA enrollment in - returned so the frontend AND
  // => the re-enrollment submit endpoint can both exclude these courses,
  // => not just filter by sector. Fixes: a student in same-sector mode
  // => could previously re-select the exact course they already have a
  // => Reserved enrollment in, since the old check only asked "does this
  // => sector have more than one course total" and never subtracted out
  // => the course already occupied.
  const activeCourseIds = tesdaRows
    .filter(r => !TERMINAL_TESDA.includes(r.status) && r.course_id)
    .map(r => r.course_id);

  // => An active SHS enrollment blocks TESDA entirely, same cross-program lock
  if (!hasActiveShs) {
    if (!hasActiveTesda) {
      // => Nothing active on either side - fully open, any sector, any course
      canEnrollTESDA = true;
      tesdaMode = 'cross';
    } else {
      // => Active TESDA enrollment(s) exist - restricted to adding another
      // => course within the SAME sector(s) already active, and only if
      // => that sector actually has a course the student ISN'T already
      // => actively enrolled in
      const activeSectorIds = [...new Set(
        tesdaRows
          .filter(r => !TERMINAL_TESDA.includes(r.status) && r.sector_id)
          .map(r => r.sector_id)
      )];

      for (const sectorId of activeSectorIds) {
        const courseCount = await countCoursesInSector(pool, sectorId);

        // => How many DISTINCT courses in this specific sector the student
        // => already has an active enrollment in - previously this used a
        // => flat ">1 course in the sector" check, which stayed true even
        // => when every course in that sector was already occupied
        const activeCourseCountInSector = new Set(
          tesdaRows
            .filter(r => !TERMINAL_TESDA.includes(r.status) && r.sector_id === sectorId)
            .map(r => r.course_id)
        ).size;

        if (courseCount > activeCourseCountInSector) {
          eligibleSectorIds.push(sectorId);
        }
      }

      if (eligibleSectorIds.length > 0) {
        canEnrollTESDA = true;
        tesdaMode = 'same-sector';
      }
    }
  }

  return { canEnrollSHS, canEnrollTESDA, tesdaMode, eligibleSectorIds, activeCourseIds };
};