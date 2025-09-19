import supabase from '../lib/supabaseClient';
import { SOP } from '../types';

const TABLE = 'sops';

function normalize(row: any): SOP {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    lastUpdated: row.last_updated,
  };
}

function denormalize(obj: Partial<SOP>): any {
  return {
    ...(obj.title !== undefined ? { title: obj.title } : {}),
    ...(obj.category !== undefined ? { category: obj.category } : {}),
    ...(obj.content !== undefined ? { content: obj.content } : {}),
    ...(obj.lastUpdated !== undefined ? { last_updated: obj.lastUpdated } : {}),
  };
}

export async function listSOPs(): Promise<SOP[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('last_updated', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createSOP(payload: Omit<SOP, 'id'>): Promise<SOP> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateSOP(id: string, patch: Partial<SOP>): Promise<SOP> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteSOP(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
