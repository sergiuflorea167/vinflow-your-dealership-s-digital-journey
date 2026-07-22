import { supabase } from "@/integrations/supabase/client";
import {
  addDaysToLocalDate, getVincentClientTimezone, getVincentLocalDate,
  VINCENT_NOTICE_INTERVAL_DAYS, VINCENT_NOTICE_VERSION, VINCENT_RETENTION_DAYS,
} from "@/lib/vincentPrivacy";

export type VincentRole = "user" | "assistant";
export interface VincentMessage {
  id: string;
  role: VincentRole;
  content: string;
  createdAt: string;
}

export interface VincentConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface VincentPreference {
  acknowledged: boolean;
  historyEnabled: boolean;
  retentionDays: number;
  /** Lokales Datum, ab dem der Hinweis erneut bestätigt werden muss (7 Tage nach der letzten Bestätigung). */
  noticeValidUntil: string | null;
}

const expiryFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export const loadVincentPreference = async (userId: string): Promise<VincentPreference> => {
  const windowStart = addDaysToLocalDate(getVincentLocalDate(), -(VINCENT_NOTICE_INTERVAL_DAYS - 1));
  const [{ data, error }, { data: acceptance, error: acceptanceError }] = await Promise.all([
    supabase
    .from("vincent_preferences")
    .select("history_enabled,retention_days")
    .eq("user_id", userId)
    .maybeSingle(),
    supabase
      .from("vincent_notice_acceptances")
      .select("accepted_local_date")
      .eq("user_id", userId)
      .eq("notice_version", VINCENT_NOTICE_VERSION)
      .gte("accepted_local_date", windowStart)
      .order("accepted_local_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (error) throw error;
  if (acceptanceError) throw acceptanceError;
  return {
    acknowledged: Boolean(acceptance?.accepted_local_date),
    historyEnabled: data?.history_enabled ?? false,
    retentionDays: data?.retention_days ?? VINCENT_RETENTION_DAYS,
    noticeValidUntil: acceptance?.accepted_local_date
      ? addDaysToLocalDate(acceptance.accepted_local_date, VINCENT_NOTICE_INTERVAL_DAYS)
      : null,
  };
};

export const acknowledgeVincentNotice = async () => {
  const { data, error } = await supabase.rpc("acknowledge_vincent_notice", {
    _notice_version: VINCENT_NOTICE_VERSION,
    _timezone: getVincentClientTimezone(),
  });
  if (error) throw error;
  if (data !== true) throw new Error("Bestätigung wurde vom Backend abgelehnt.");
};

export const setVincentHistoryEnabled = async (userId: string, enabled: boolean) => {
  const { error } = await supabase.from("vincent_preferences").update({ history_enabled: enabled }).eq("user_id", userId);
  if (error) throw error;
};

export const listVincentConversations = async (): Promise<VincentConversation[]> => {
  await supabase.from("vincent_conversations").delete().lt("expires_at", new Date().toISOString());
  const { data, error } = await supabase
    .from("vincent_conversations")
    .select("id,title,created_at,updated_at,expires_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id, title: item.title, createdAt: item.created_at, updatedAt: item.updated_at, expiresAt: item.expires_at,
  }));
};

export const loadVincentMessages = async (conversationId: string): Promise<VincentMessage[]> => {
  const { data, error } = await supabase
    .from("vincent_messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((item): item is typeof item & { role: VincentRole } => item.role === "user" || item.role === "assistant")
    .map((item) => ({ id: item.id, role: item.role, content: item.content, createdAt: item.created_at }));
};

export const saveVincentConversation = async ({
  conversationId, title, messages, userId, organizationId, retentionDays,
}: {
  conversationId: string;
  title: string;
  messages: VincentMessage[];
  userId: string;
  organizationId: string;
  retentionDays: number;
}) => {
  const expiresAt = expiryFromNow(retentionDays);
  const { error: conversationError } = await supabase.from("vincent_conversations").upsert({
    id: conversationId,
    title: title.slice(0, 120),
    user_id: userId,
    organization_id: organizationId,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (conversationError) throw conversationError;
  if (messages.some((message) => message.content.trim())) {
    const { error: messageError } = await supabase.from("vincent_messages").upsert(
      messages.filter((message) => message.content.trim()).map((message) => ({
        id: message.id,
        conversation_id: conversationId,
        role: message.role,
        content: message.content.slice(0, 12_000),
        created_at: message.createdAt,
      })),
      { onConflict: "id" },
    );
    if (messageError) throw messageError;
  }
  return expiresAt;
};

export const renameVincentConversation = async (conversationId: string, title: string) => {
  const { error } = await supabase.from("vincent_conversations").update({ title: title.slice(0, 120) }).eq("id", conversationId);
  if (error) throw error;
};

export const deleteVincentConversation = async (conversationId: string) => {
  const { error } = await supabase.from("vincent_conversations").delete().eq("id", conversationId);
  if (error) throw error;
};

export const deleteAllVincentConversations = async () => {
  const { error } = await supabase.from("vincent_conversations").delete().not("id", "is", null);
  if (error) throw error;
};
