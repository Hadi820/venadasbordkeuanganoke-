import supabase from '../lib/supabaseClient';
import { Client, ClientStatus, ClientType } from '../types';

const TABLE = 'clients';

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('since', { ascending: false });
  if (error) throw error;
  // Supabase returns snake_case typically; ensure it matches our Client interface
  return (data || []).map(row => normalizeClient(row));
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if ((error as any).code === 'PGRST116') return null; // not found
    throw error;
  }
  return data ? normalizeClient(data) : null;
}

export async function createClient(payload: Omit<Client, 'id'>): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalizeClient(payload)])
    .select()
    .single();
  if (error) throw error;
  return normalizeClient(data);
}

export async function updateClient(id: string, patch: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalizeClient(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizeClient(data);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Helpers to map between DB row and TS type (in case of snake_case in DB)
function normalizeClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    since: row.since,
    instagram: row.instagram ?? undefined,
    status: row.status as ClientStatus,
    clientType: row.client_type as ClientType,
    lastContact: row.last_contact,
    portalAccessId: row.portal_access_id,
  };
}

function denormalizeClient(obj: Partial<Client>): any {
  return {
    ...(obj.id !== undefined ? { id: obj.id } : {}),
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.email !== undefined ? { email: obj.email } : {}),
    ...(obj.phone !== undefined ? { phone: obj.phone } : {}),
    ...(obj.whatsapp !== undefined ? { whatsapp: obj.whatsapp } : {}),
    ...(obj.since !== undefined ? { since: obj.since } : {}),
    ...(obj.instagram !== undefined ? { instagram: obj.instagram } : {}),
    ...(obj.status !== undefined ? { status: obj.status } : {}),
    ...(obj.clientType !== undefined ? { client_type: obj.clientType } : {}),
    ...(obj.lastContact !== undefined ? { last_contact: obj.lastContact } : {}),
    ...(obj.portalAccessId !== undefined ? { portal_access_id: obj.portalAccessId } : {}),
  };
}
