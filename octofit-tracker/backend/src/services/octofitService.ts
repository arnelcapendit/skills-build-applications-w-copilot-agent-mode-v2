import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !mongoose.isValidObjectId(userId)) {
    throw Object.assign(new Error('A valid userId is required'), { status: 400 });
  }
  if (typeof teamId !== 'string' || !mongoose.isValidObjectId(teamId)) {
    throw Object.assign(new Error('A valid teamId is required'), { status: 400 });
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw Object.assign(new Error('A valid activity type is required'), { status: 400 });
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Minutes must be a positive number'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team must be an object'), { status: 400 });
  }

  const { name, mascot, members } = input as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw Object.assign(new Error('A team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw Object.assign(new Error('A team mascot is required'), { status: 400 });
  }

  const memberIds = members === undefined ? [] : members;
  if (
    !Array.isArray(memberIds) ||
    memberIds.some((memberId) => typeof memberId !== 'string' || !mongoose.isValidObjectId(memberId))
  ) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }

  const memberUsers = memberIds.length > 0
    ? await User.find({ _id: { $in: memberIds } }).select('_id team')
    : [];
  const uniqueMemberIds = new Set(memberIds.map((memberId) => memberId.toLowerCase()));
  if (memberUsers.length !== uniqueMemberIds.size) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  const team = await Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: memberUsers.map((member) => member._id),
  });

  if (memberUsers.length > 0) {
    const userIds = memberUsers.map((member) => member._id);
    await Team.updateMany(
      { _id: { $ne: team._id } },
      { $pull: { members: { $in: userIds } } },
    );
    await User.updateMany({ _id: { $in: userIds } }, { $set: { team: team._id } });
  }

  return team;
}

export async function getLeaderboard() {
  const [teams, activityTotals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(activityTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));

  return teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [activities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).lean(),
    Workout.find().lean(),
  ]);
  const fitnessGoal = user.fitnessGoal.toLowerCase();
  const activityFocus = (type: string) => {
    switch (type.toLowerCase()) {
      case 'run':
      case 'cycle':
      case 'walk':
      case 'swim':
        return 'endurance';
      case 'strength':
      case 'weightlifting':
        return 'strength';
      case 'yoga':
      case 'stretching':
        return 'mobility';
      default:
        return type.toLowerCase();
    }
  };

  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const matchingActivity = activities.find((activity) =>
        focus === activityFocus(activity.type),
      );
      const goalMatch = focus === fitnessGoal;
      return {
        ...workout,
        reason: goalMatch
          ? matchingActivity
            ? `Matches your ${user.fitnessGoal} goal and complements your recent ${matchingActivity.type} activity.`
            : `Matches your ${user.fitnessGoal} fitness goal.`
          : matchingActivity
            ? `Recommended based on your recent ${matchingActivity.type} activity.`
            : undefined,
      };
    })
    .sort((left, right) => {
      const score = (workout: typeof left) =>
        Number(workout.focus.toLowerCase() === fitnessGoal) * 2 + Number(Boolean(workout.reason?.includes('recent')));
      return score(right) - score(left) || String(left.title ?? '').localeCompare(String(right.title ?? ''));
    });
}

export { User };
