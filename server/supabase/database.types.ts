export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BackupImportRpcResult = {
  conversations: {
    inserted: number;
    skipped: number;
  };
  messages: {
    inserted: number;
    skipped: number;
  };
  summaries: {
    inserted: number;
    skipped: number;
  };
  memories: {
    inserted: number;
    skipped: number;
  };
};

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      import_berry_chat_backup_v1: {
        Args: {
          p_owner_id: string;
          p_payload: Json;
        };
        Returns: BackupImportRpcResult;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
