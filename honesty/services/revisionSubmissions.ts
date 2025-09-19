import supabase from '../lib/supabaseClient';
import { RevisionStatus } from '../types';

export type RevisionSubmission = {
  id: string;
  projectId: string;
  freelancerId: string;
  revisionId: string;
  freelancerNotes?: string;
  driveLink: string;
  status: RevisionStatus;
  createdAt: string;
};

const TABLE = 'project_revision_submissions';

function fromRow(row: any): RevisionSubmission {
  return {
    id: row.id,
    projectId: row.project_id,
    freelancerId: row.freelancer_id,
    revisionId: row.revision_id,
    freelancerNotes: row.freelancer_notes ?? undefined,
    driveLink: row.drive_link,
    status: row.status as RevisionStatus,
    createdAt: row.created_at,
  };
}

function toRow(input: Partial<RevisionSubmission>): any {
  return {
    ...(input.projectId !== undefined ? { project_id: input.projectId } : {}),
    ...(input.freelancerId !== undefined ? { freelancer_id: input.freelancerId } : {}),
    ...(input.revisionId !== undefined ? { revision_id: input.revisionId } : {}),
    ...(input.freelancerNotes !== undefined ? { freelancer_notes: input.freelancerNotes } : {}),
    ...(input.driveLink !== undefined ? { drive_link: input.driveLink } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

export async function createRevisionSubmission(payload: Omit<RevisionSubmission, 'id' | 'createdAt'>): Promise<RevisionSubmission> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toRow(payload))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function listRevisionSubmissionsByProject(projectId: string): Promise<RevisionSubmission[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}
