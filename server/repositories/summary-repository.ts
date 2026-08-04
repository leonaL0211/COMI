export type ConversationSummary = {
  conversationId: string;
  content: string;
  coveredThroughMessageId: string;
  coveredMessageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SummaryUpsertInput = {
  conversationId: string;
  content: string;
  coveredThroughMessageId: string;
  coveredMessageCount: number;
};

export interface SummaryRepository {
  listForBackup(): Promise<ConversationSummary[]>;
  findByConversation(conversationId: string): Promise<ConversationSummary | null>;
  upsert(input: SummaryUpsertInput): Promise<ConversationSummary>;
}
