import supabase from '../lib/supabaseClient';
import { Revision, RevisionStatus } from '../types';

const TABLE = 'project_revisions';

function fromRow(row: any): Revision {
  return {
    id: row.id,
    date: row.date,
    adminNotes: row.admin_notes,
    deadline: row.deadline,
    freelancerId: row.freelancer_id,
    status: row.status as RevisionStatus,
    freelancerNotes: row.freelancer_notes ?? undefined,
    driveLink: row.drive_link ?? undefined,
    completedDate: row.completed_date ?? undefined,
  };
}

function toRow(input: Partial<Revision> & { projectId?: string }): any {
  return {
    ...(input.date !== undefined ? { date: input.date } : {}),
    ...(input.adminNotes !== undefined ? { admin_notes: input.adminNotes } : {}),
    ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
    ...(input.freelancerId !== undefined ? { freelancer_id: input.freelancerId } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.freelancerNotes !== undefined ? { freelancer_notes: input.freelancerNotes } : {}),
    ...(input.driveLink !== undefined ? { drive_link: input.driveLink } : {}),
    ...(input.completedDate !== undefined ? { completed_date: input.completedDate } : {}),
    ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
  };
}

export async function listRevisionsByProject(projectId: string): Promise<Revision[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createRevision(projectId: string, payload: Omit<Revision, 'id'>): Promise<Revision> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toRow({ ...payload, projectId }))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateRevision(projectId: string, revisionId: string, patch: Partial<Revision>): Promise<Revision> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('project_id', projectId)
    .eq('id', revisionId)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}
