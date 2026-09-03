"use client";

import { useState } from "react";
import { ChatScreen } from "@/features/chat/components/ChatScreen";
import { BerryCafeWelcome } from "./BerryCafeWelcome";

export function BerryChatEntry({
  isTestParticipant,
}: {
  isTestParticipant: boolean;
}) {
  const [hasEntered, setHasEntered] = useState(false);

  if (!hasEntered) {
    return <BerryCafeWelcome onEnter={() => setHasEntered(true)} />;
  }

  return <ChatScreen isTestParticipant={isTestParticipant} />;
}
