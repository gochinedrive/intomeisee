import { supabase } from "@/integrations/supabase/client";

export interface JournalEntry {
  id: string;
  entry_type: string;
  title: string | null;
  content: string | null;
  reflection_prompt: string | null;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
}

export async function createJournalEntry(params: {
  entry_type: string;
  title?: string;
  content?: string;
  reflection_prompt?: string;
  mood?: string;
  tags?: string[];
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ ...params, user_id: session.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getJournalEntries() {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadJournalMedia(
  entryId: string,
  file: File,
  mediaType: "photo" | "audio"
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const bucket = mediaType === "photo" ? "journal-photos" : "journal-audio";
  const path = `${session.user.id}/${entryId}/${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { error: mediaError } = await supabase
    .from("journal_media")
    .insert({
      entry_id: entryId,
      user_id: session.user.id,
      media_type: mediaType,
      storage_path: path,
    });
  if (mediaError) throw mediaError;

  return path;
}
