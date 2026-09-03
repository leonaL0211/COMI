/**
 * Whitelist for the n=4 exploratory user test.
 *
 * Each participant id maps to a dedicated owner_id UUID that is completely
 * separate from the real BERRY_OWNER_ID. These UUIDs are never sent to the
 * client, never derived from anything the client controls, and are only
 * ever read on the server. A request that does not carry a whitelisted
 * participant id always falls back to the normal single-owner behavior.
 *
 * These UUIDs do not need to pre-exist as rows anywhere — `owner_id` is a
 * plain uuid column with no foreign key, so the first write for a given
 * participant just creates rows under that id, exactly like the real
 * account does today.
 */
export const testParticipantIds = ["P01", "P02", "P03", "P04"] as const;

export type TestParticipantId = (typeof testParticipantIds)[number];

export function isTestParticipantId(value: unknown): value is TestParticipantId {
  return (
    typeof value === "string" &&
    (testParticipantIds as readonly string[]).includes(value)
  );
}

const testParticipantOwnerIds: Record<TestParticipantId, string> = {
  P01: "a1e5b6b0-0d1a-4a1a-9c3a-000000000001",
  P02: "a1e5b6b0-0d1a-4a1a-9c3a-000000000002",
  P03: "a1e5b6b0-0d1a-4a1a-9c3a-000000000003",
  P04: "a1e5b6b0-0d1a-4a1a-9c3a-000000000004",
};

export function getTestParticipantOwnerId(participant: TestParticipantId): string {
  return testParticipantOwnerIds[participant];
}
