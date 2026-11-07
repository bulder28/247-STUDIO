const MS_PER_DAY = 24 * 60 * 60 * 1000;

function deriveRetentionRisk(attendanceHistory, now) {
  const nowMs = now.getTime();
  const attendedBookings = attendanceHistory
    .filter((b) => b.status === "ATTENDED")
    .map((b) => new Date(b.date).getTime())
    .sort((a, b) => b - a);

  if (attendedBookings.length === 0) {
    return "HIGH";
  }

  const mostRecentAttendedMs = attendedBookings[0];
  const daysSinceLastAttended = Math.floor((nowMs - mostRecentAttendedMs) / MS_PER_DAY);

  const last30DaysMs = nowMs - 30 * MS_PER_DAY;
  const recentBookings = attendanceHistory.filter((b) => {
    const t = new Date(b.date).getTime();
    return t >= last30DaysMs && t <= nowMs;
  });

  const totalRecentActiveBookings = recentBookings.filter(
    (b) => b.status === "ATTENDED" || b.status === "NO_SHOW"
  );

  let noShowRatio = 0;
  if (totalRecentActiveBookings.length > 0) {
    const noShowCount = totalRecentActiveBookings.filter((b) => b.status === "NO_SHOW").length;
    noShowRatio = noShowCount / totalRecentActiveBookings.length;
  }

  const window1Start = nowMs - 28 * MS_PER_DAY;
  const window2Start = nowMs - 56 * MS_PER_DAY;

  const attendedLast4Weeks = attendedBookings.filter((t) => t >= window1Start && t <= nowMs).length;
  const attendedPrev4Weeks = attendedBookings.filter((t) => t >= window2Start && t < window1Start).length;

  let frequencyDropRatio = 0;
  if (attendedPrev4Weeks > 0) {
    frequencyDropRatio = (attendedPrev4Weeks - attendedLast4Weeks) / attendedPrev4Weeks;
  }

  if (
    daysSinceLastAttended >= 21 ||
    (attendedPrev4Weeks > 0 && frequencyDropRatio > 0.5) ||
    noShowRatio > 0.3
  ) {
    return "HIGH";
  }

  if (
    (daysSinceLastAttended >= 14 && daysSinceLastAttended <= 20) ||
    (attendedPrev4Weeks > 0 && frequencyDropRatio >= 0.3 && frequencyDropRatio <= 0.5)
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

const now = new Date("2026-11-07T12:00:00Z");
const sixtyDaysAgo = new Date(now.getTime() - 60 * MS_PER_DAY);
const minDateStr = sixtyDaysAgo.toISOString().slice(0, 10);

let discrepancies = 0;
let totalTests = 0;

for (let lastSeen = 0; lastSeen <= 120; lastSeen++) {
  for (let prevCount = 0; prevCount <= 10; prevCount++) {
    for (let recentCount = 0; recentCount <= 10; recentCount++) {
      totalTests++;
      const fullHistory = [];
      if (lastSeen < 28 && recentCount > 0) {
        fullHistory.push({ date: new Date(now.getTime() - lastSeen * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });
        for (let i = 1; i < recentCount; i++) {
          const d = Math.min(27, lastSeen + i * 2);
          fullHistory.push({ date: new Date(now.getTime() - d * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });
        }
      } else if (lastSeen >= 28) {
        fullHistory.push({ date: new Date(now.getTime() - lastSeen * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });
      }
      for (let i = 0; i < prevCount; i++) {
        const d = 29 + i * 2;
        if (d < 56) {
          fullHistory.push({ date: new Date(now.getTime() - d * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });
        }
      }
      // Old bookings
      fullHistory.push({ date: new Date(now.getTime() - 75 * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });
      fullHistory.push({ date: new Date(now.getTime() - 150 * MS_PER_DAY).toISOString().slice(0, 10), status: "ATTENDED" });

      const filteredHistory = fullHistory.filter(b => b.date >= minDateStr);

      const riskFull = deriveRetentionRisk(fullHistory, now);
      const riskFiltered = deriveRetentionRisk(filteredHistory, now);

      if (riskFull !== riskFiltered) {
        discrepancies++;
        if (discrepancies <= 5) {
          console.log("Discrepancy found:", { lastSeen, prevCount, recentCount, riskFull, riskFiltered });
        }
      }
    }
  }
}

console.log(`Fuzzing complete: ${totalTests} scenarios tested. Discrepancies: ${discrepancies}`);
