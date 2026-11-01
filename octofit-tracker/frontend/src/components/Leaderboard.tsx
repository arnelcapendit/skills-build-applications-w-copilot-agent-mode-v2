import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setEntries(leaderboard);
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {loading ? <p role="status">Loading leaderboard...</p> : null}
        {!loading && hasError ? <p role="alert">Unable to load leaderboard.</p> : null}
        {!loading && !hasError && entries.length === 0 ? <p>No leaderboard rankings yet.</p> : null}
        {!loading && !hasError && entries.length > 0 ? (
          <ol className="list-group list-group-numbered list-group-flush">
            {entries.map((entry) => (
              <li className="list-group-item d-flex justify-content-between px-0" key={`${entry.rank}-${entry.teamName}`}>
                <span>{entry.teamName}</span>
                <span>{entry.totalPoints} points</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
