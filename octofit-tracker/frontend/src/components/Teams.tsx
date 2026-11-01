import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type TeamRecord = {
  _id?: string;
  name: string;
  members?: unknown[];
};

export default function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ teams: TeamRecord[] }>('/api/teams')
      .then(({ teams: records }) => {
        if (active) setTeams(records);
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {loading ? <p role="status">Loading teams...</p> : null}
        {!loading && hasError ? <p role="alert">Unable to load teams.</p> : null}
        {!loading && !hasError && teams.length === 0 ? <p>No teams yet.</p> : null}
        {!loading && !hasError && teams.length > 0 ? (
          <ul className="list-group list-group-flush">
            {teams.map((team, index) => (
              <li className="list-group-item px-0" key={team._id ?? `${team.name}-${index}`}>
                <span className="fw-semibold">{team.name}</span>
                <span> - {team.members?.length ?? 0} members</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
