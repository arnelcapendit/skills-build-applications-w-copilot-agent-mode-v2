import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';
import { CapabilityCard } from './CapabilityCard.js';

type WorkoutSuggestion = {
  _id?: string;
  title: string;
  reason?: string;
};

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<WorkoutSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent('mona@example.com')}`)
      .then(({ suggestions: records }) => {
        if (active) setSuggestions(records);
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
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {loading ? <p role="status">Loading workout suggestions...</p> : null}
        {!loading && hasError ? <p role="alert">Unable to load workout suggestions.</p> : null}
        {!loading && !hasError && suggestions.length === 0 ? <p>No workout suggestions yet.</p> : null}
        {!loading && !hasError && suggestions.length > 0 ? (
          <ul className="list-group list-group-flush">
            {suggestions.map((suggestion, index) => (
              <li className="list-group-item px-0" key={suggestion._id ?? `${suggestion.title}-${index}`}>
                <span className="fw-semibold">{suggestion.title}</span>
                {suggestion.reason ? <span> - {suggestion.reason}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
