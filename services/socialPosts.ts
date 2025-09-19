import supabase from '../lib/supabaseClient';
import { SocialMediaPost, PostStatus, PostType } from '../types';

const TABLE = 'social_media_posts';

function normalize(row: any): SocialMediaPost {
  return {
    id: row.id,
    projectId: row.project_id,
    clientName: row.client_name,
    postType: row.post_type as PostType,
    platform: row.platform,
    scheduledDate: row.scheduled_date,
    caption: row.caption ?? '',
    mediaUrl: row.media_url ?? '',
    status: row.status as PostStatus,
    notes: row.notes ?? '',
  };
}

function denormalize(obj: Partial<SocialMediaPost>): any {
  return {
    ...(obj.projectId !== undefined ? { project_id: obj.projectId } : {}),
    ...(obj.clientName !== undefined ? { client_name: obj.clientName } : {}),
    ...(obj.postType !== undefined ? { post_type: obj.postType } : {}),
    ...(obj.platform !== undefined ? { platform: obj.platform } : {}),
    ...(obj.scheduledDate !== undefined ? { scheduled_date: obj.scheduledDate } : {}),
    ...(obj.caption !== undefined ? { caption: obj.caption } : {}),
    ...(obj.mediaUrl !== undefined ? { media_url: obj.mediaUrl } : {}),
    ...(obj.status !== undefined ? { status: obj.status } : {}),
    ...(obj.notes !== undefined ? { notes: obj.notes } : {}),
  };
}

export async function listSocialPosts(): Promise<SocialMediaPost[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('scheduled_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createSocialPost(payload: Omit<SocialMediaPost, 'id'>): Promise<SocialMediaPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateSocialPost(id: string, patch: Partial<SocialMediaPost>): Promise<SocialMediaPost> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteSocialPost(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
