import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type ActivityRecord = {
  _id?: string;
  type: string;
  minutes: number;
  points: number;
};

export default function Activities() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ activities: ActivityRecord[] }>('/api/activities')
      .then(({ activities: records }) => {
        if (active) setActivities(records);
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
        <h2 className="h4">Activities</h2>
        <p>Track student activity minutes and points.</p>
        {loading ? <p role="status">Loading activities...</p> : null}
        {!loading && hasError ? <p role="alert">Unable to load activities.</p> : null}
        {!loading && !hasError && activities.length === 0 ? <p>No activities yet.</p> : null}
        {!loading && !hasError && activities.length > 0 ? (
          <ul className="list-group list-group-flush">
            {activities.map((activity, index) => (
              <li className="list-group-item px-0" key={activity._id ?? `${activity.type}-${index}`}>
                <span className="fw-semibold">{activity.type}</span>
                <span> - {activity.minutes} min, {activity.points} points</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
