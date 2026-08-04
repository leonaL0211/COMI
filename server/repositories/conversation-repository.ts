export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  listForBackup(): Promise<Conversation[]>;
  findById(conversationId: string): Promise<Conversation | null>;
  create(input?: { title?: string }): Promise<Conversation>;
  rename(conversationId: string, title: string): Promise<Conversation | null>;
  touch(
    conversationId: string,
    input?: { lastMessageAt?: string | null },
  ): Promise<Conversation | null>;
  delete(conversationId: string): Promise<boolean>;
}
