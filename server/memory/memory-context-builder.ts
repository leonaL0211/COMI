import type { Memory } from "@/server/repositories/memory-repository";
import type { ChatMessage } from "@/shared/chat-types";

export const MAX_MEMORIES = 12;
export const MAX_MEMORY_CHARACTERS = 4000;

export function buildMemoryContextMessage(memories: Memory[]): ChatMessage | null {
  const selectedBlocks: string[] = [];
  let usedCharacters = 0;

  for (const memory of memories) {
    if (selectedBlocks.length >= MAX_MEMORIES) {
      break;
    }

    const block = formatMemory(memory);

    if (!block) {
      continue;
    }

    const separatorLength = selectedBlocks.length ? 1 : 0;

    if (usedCharacters + separatorLength + block.length > MAX_MEMORY_CHARACTERS) {
      break;
    }

    selectedBlocks.push(block);
    usedCharacters += separatorLength + block.length;
  }

  if (!selectedBlocks.length) {
    return null;
  }

  return {
    role: "system",
    content: [
      "以下内容是用户管理的长期记忆。",
      "只有与当前话题相关时才自然使用，不要机械罗列。",
      "不要向用户说“我查了记忆库”，也不要暴露内部字段或数据库结构。",
      "记忆可能过时；当前用户明确表达和最近原始消息始终优先。",
      "如果记忆与当前对话冲突，以较新的明确消息为准。",
      "不得因为记忆存在而强行提起无关人物、偏好或项目。",
      "不得虚构记忆中不存在的信息。",
      "",
      selectedBlocks.join("\n"),
    ].join("\n"),
  };
}

function formatMemory(memory: Memory) {
  const title = memory.title.trim();
  const content = memory.content.trim();

  if (!title || !content) {
    return null;
  }

  return `- ${title}: ${content}`;
}
