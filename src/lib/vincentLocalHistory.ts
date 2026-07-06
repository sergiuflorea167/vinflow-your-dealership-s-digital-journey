import type { VincentConversation, VincentMessage } from "@/lib/vincentHistory";

interface LocalConversationRecord {
  conversation: VincentConversation;
  messages: VincentMessage[];
}

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;
const storageKey = (userId: string) => `vincent-local-history:${userId}`;

const readRecords = (userId: string): LocalConversationRecord[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LocalConversationRecord => Boolean(
      item && typeof item === "object" && "conversation" in item && "messages" in item,
    ));
  } catch {
    return [];
  }
};

const writeRecords = (userId: string, records: LocalConversationRecord[]) => {
  localStorage.setItem(storageKey(userId), JSON.stringify(records.slice(0, MAX_CONVERSATIONS)));
};

const activeRecords = (userId: string) => {
  const now = Date.now();
  const records = readRecords(userId).filter(({ conversation }) => new Date(conversation.expiresAt).getTime() > now);
  writeRecords(userId, records);
  return records;
};

export const listLocalVincentConversations = (userId: string): VincentConversation[] =>
  activeRecords(userId)
    .map(({ conversation }) => conversation)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

export const loadLocalVincentMessages = (userId: string, conversationId: string): VincentMessage[] =>
  activeRecords(userId).find(({ conversation }) => conversation.id === conversationId)?.messages ?? [];

export const saveLocalVincentConversation = ({
  userId, conversationId, title, messages, retentionDays,
}: {
  userId: string;
  conversationId: string;
  title: string;
  messages: VincentMessage[];
  retentionDays: number;
}) => {
  const records = activeRecords(userId);
  const existing = records.find(({ conversation }) => conversation.id === conversationId);
  const now = new Date().toISOString();
  const conversation: VincentConversation = {
    id: conversationId,
    title: title.slice(0, 120),
    createdAt: existing?.conversation.createdAt ?? now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + retentionDays * 86_400_000).toISOString(),
  };
  const record: LocalConversationRecord = {
    conversation,
    messages: messages
      .filter((message) => message.content.trim())
      .slice(-MAX_MESSAGES_PER_CONVERSATION)
      .map((message) => ({ ...message, content: message.content.slice(0, 12_000) })),
  };
  writeRecords(userId, [record, ...records.filter(({ conversation: item }) => item.id !== conversationId)]);
};

export const renameLocalVincentConversation = (userId: string, conversationId: string, title: string) => {
  const records = activeRecords(userId).map((record) => record.conversation.id === conversationId
    ? { ...record, conversation: { ...record.conversation, title: title.slice(0, 120), updatedAt: new Date().toISOString() } }
    : record);
  writeRecords(userId, records);
};

export const deleteLocalVincentConversation = (userId: string, conversationId: string) => {
  writeRecords(userId, activeRecords(userId).filter(({ conversation }) => conversation.id !== conversationId));
};

export const deleteAllLocalVincentConversations = (userId: string) => {
  localStorage.removeItem(storageKey(userId));
};
