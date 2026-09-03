import { BerryChatEntry } from "@/features/welcome/components/BerryChatEntry";
import { isCurrentSessionTestParticipant } from "@/server/auth/owner-context";

export default async function Home() {
  const isTestParticipant = await isCurrentSessionTestParticipant();

  return <BerryChatEntry isTestParticipant={isTestParticipant} />;
}
