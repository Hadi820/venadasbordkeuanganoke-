import supabase from '../lib/supabaseClient';
import { TeamMember, PerformanceNote } from '../types';

const TABLE = 'team_members';

function normalize(row: any): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    standardFee: Number(row.standard_fee || 0),
    noRek: row.no_rek ?? undefined,
    rewardBalance: Number(row.reward_balance || 0),
    rating: Number(row.rating || 0),
    performanceNotes: (row.performance_notes ?? []) as PerformanceNote[],
    portalAccessId: row.portal_access_id,
  };
}

function denormalize(obj: Partial<TeamMember>): any {
  return {
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.role !== undefined ? { role: obj.role } : {}),
    ...(obj.email !== undefined ? { email: obj.email } : {}),
    ...(obj.phone !== undefined ? { phone: obj.phone } : {}),
    ...(obj.standardFee !== undefined ? { standard_fee: obj.standardFee } : {}),
    ...(obj.noRek !== undefined ? { no_rek: obj.noRek } : {}),
    ...(obj.rewardBalance !== undefined ? { reward_balance: obj.rewardBalance } : {}),
    ...(obj.rating !== undefined ? { rating: obj.rating } : {}),
    ...(obj.performanceNotes !== undefined ? { performance_notes: obj.performanceNotes } : {}),
    ...(obj.portalAccessId !== undefined ? { portal_access_id: obj.portalAccessId } : {}),
  };
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('name');
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createTeamMember(payload: Omit<TeamMember, 'id'>): Promise<TeamMember> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateTeamMember(id: string, patch: Partial<TeamMember>): Promise<TeamMember> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
