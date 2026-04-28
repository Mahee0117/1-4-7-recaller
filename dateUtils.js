// dateUtils.js — All date calculation logic lives here (clean separation)

/**
 * Add N days to a YYYY-MM-DD string and return a new YYYY-MM-DD string.
 * We use UTC to avoid timezone-related date shifts.
 *
 * @param {string} dateStr - e.g. "2025-04-20"
 * @param {number} days    - number of days to add
 * @returns {string}       - e.g. "2025-04-24"
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr + "T00:00:00Z"); // force UTC midnight
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10); // returns "YYYY-MM-DD"
}

/**
 * Get today's date as a YYYY-MM-DD string (UTC).
 * Using UTC ensures consistency between server and any client timezone logic.
 *
 * @returns {string} - e.g. "2025-04-21"
 */
function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Given a study date, compute all three revision dates using the 1-4-7 rule.
 * These are NEVER stored in the DB — always computed on the fly.
 *
 * @param {string} studyDate - YYYY-MM-DD
 * @returns {{ revision1: string, revision2: string, revision3: string }}
 */
function getRevisionDates(studyDate) {
  return {
    revision1: addDays(studyDate, 1), // Revision 1: study + 1 day
    revision2: addDays(studyDate, 4), // Revision 2: study + 4 days
    revision3: addDays(studyDate, 7), // Revision 3: study + 7 days
  };
}

/**
 * Check which revisions (if any) are due for a topic on a given date.
 * Also detects overdue revisions (revision date < today).
 *
 * @param {string} studyDate   - YYYY-MM-DD from the database
 * @param {string} today       - YYYY-MM-DD (current date)
 * @param {number[]} completedRevisions - array of revision numbers already completed
 * @returns {Array<{ revisionNumber: number, date: string, status: string }>}
 */
function getDueRevisions(studyDate, today, completedRevisions = []) {
  const { revision1, revision2, revision3 } = getRevisionDates(studyDate);
  const revisionDates = [revision1, revision2, revision3];
  const due = [];

  revisionDates.forEach((date, idx) => {
    const revNum = idx + 1; // 1, 2, or 3

    if (completedRevisions.includes(revNum)) return; // already done, skip

    let status = null;
    if (date === today) {
      status = "due";       // due today
    } else if (date < today) {
      status = "overdue";   // missed, past due
    }
    // future revisions are ignored (not shown yet)

    if (status) {
      due.push({ revisionNumber: revNum, date, status });
    }
  });

  // Sort by revision number (1 → 2 → 3) so priority is clear
  due.sort((a, b) => a.revisionNumber - b.revisionNumber);
  return due;
}

module.exports = { addDays, getTodayUTC, getRevisionDates, getDueRevisions };
