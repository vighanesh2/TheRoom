import type { RoomMember } from '@/lib/types/database';

export type MemberMatch = {
  member: RoomMember;
  score: number;
  reason: string;
};

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'to',
  'with',
  'in',
  'on',
  'at',
  'of',
  'my',
  'i',
  'am',
  'is',
  'are',
  'be',
  'who',
  'what',
]);

function tokenize(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];

  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function overlapCount(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;

  const setB = new Set(b);
  let count = 0;
  for (const word of a) {
    if (setB.has(word)) count++;
  }
  return count;
}

function profileCompleteness(member: RoomMember): number {
  let score = 0;
  if (member.headline?.trim()) score += 1;
  if (member.building?.trim()) score += 2;
  if (member.looking_for?.trim()) score += 2;
  if (member.can_help_with?.trim()) score += 1;
  if (member.avatar_url) score += 0.5;
  return score;
}

function fallbackReason(member: RoomMember): string {
  if (member.headline?.trim()) return member.headline.trim();
  if (member.building?.trim()) return member.building.trim();
  if (member.looking_for?.trim()) return `Looking for ${member.looking_for.trim()}`;
  return 'In the room';
}

function scoreCandidate(
  viewer: RoomMember | null,
  candidate: RoomMember
): MemberMatch | null {
  const hasProfile =
    candidate.headline?.trim() ||
    candidate.building?.trim() ||
    candidate.looking_for?.trim() ||
    candidate.can_help_with?.trim();

  if (!hasProfile) return null;

  if (!viewer) {
    return {
      member: candidate,
      score: profileCompleteness(candidate) + (candidate.role === 'host' ? 1 : 0),
      reason: fallbackReason(candidate),
    };
  }

  const viewerLooking = tokenize(viewer.looking_for);
  const viewerHelp = tokenize(viewer.can_help_with);
  const viewerBuilding = tokenize(viewer.building);
  const viewerHeadline = tokenize(viewer.headline);
  const viewerTopics = [...viewerBuilding, ...viewerHeadline, ...viewerLooking, ...viewerHelp];

  const candidateLooking = tokenize(candidate.looking_for);
  const candidateHelp = tokenize(candidate.can_help_with);
  const candidateBuilding = tokenize(candidate.building);
  const candidateHeadline = tokenize(candidate.headline);
  const candidateTopics = [
    ...candidateBuilding,
    ...candidateHeadline,
    ...candidateLooking,
    ...candidateHelp,
  ];

  let score = 0;
  let reason = '';

  const needHelpMatch = overlapCount(viewerLooking, candidateHelp);
  if (needHelpMatch > 0) {
    score += needHelpMatch * 5;
    reason = 'Can help with what you\'re looking for';
  }

  const offerNeedMatch = overlapCount(viewerHelp, candidateLooking);
  if (offerNeedMatch > 0) {
    score += offerNeedMatch * 5;
    if (!reason) reason = 'Looking for what you can help with';
  }

  const topicMatch = overlapCount(viewerTopics, candidateTopics);
  if (topicMatch > 0) {
    score += topicMatch * 2;
    if (!reason) reason = 'Similar interests in the room';
  }

  if (viewer.building?.trim() && candidate.building?.trim()) {
    const buildingMatch = overlapCount(tokenize(viewer.building), tokenize(candidate.building));
    if (buildingMatch > 0) {
      score += buildingMatch * 3;
      if (!reason) reason = 'Building in a similar space';
    }
  }

  score += profileCompleteness(candidate) * 0.25;
  if (candidate.role === 'host') score += 0.5;

  if (score <= 0) {
    return {
      member: candidate,
      score: profileCompleteness(candidate),
      reason: fallbackReason(candidate),
    };
  }

  return { member: candidate, score, reason };
}

/** Rank room members for the "People you may want to meet" section. */
export function rankMembersForMeet(
  members: RoomMember[],
  viewerUserId: string | undefined,
  viewerMember: RoomMember | null,
  limit = 4
): MemberMatch[] {
  return members
    .filter((member) => member.user_id !== viewerUserId)
    .map((member) => scoreCandidate(viewerMember, member))
    .filter((match): match is MemberMatch => match !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
