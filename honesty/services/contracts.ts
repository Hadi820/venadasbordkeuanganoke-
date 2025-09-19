import supabase from '../lib/supabaseClient';
import { Contract } from '../types';

const TABLE = 'contracts';

function normalize(row: any): Contract {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    clientId: row.client_id,
    projectId: row.project_id,
    signingDate: row.signing_date,
    signingLocation: row.signing_location,
    createdAt: row.created_at,
    clientName1: row.client_name1,
    clientAddress1: row.client_address1,
    clientPhone1: row.client_phone1,
    clientName2: row.client_name2 ?? undefined,
    clientAddress2: row.client_address2 ?? undefined,
    clientPhone2: row.client_phone2 ?? undefined,
    shootingDuration: row.shooting_duration,
    guaranteedPhotos: row.guaranteed_photos,
    albumDetails: row.album_details,
    digitalFilesFormat: row.digital_files_format,
    otherItems: row.other_items,
    personnelCount: row.personnel_count,
    deliveryTimeframe: row.delivery_timeframe,
    dpDate: row.dp_date,
    finalPaymentDate: row.final_payment_date,
    cancellationPolicy: row.cancellation_policy,
    jurisdiction: row.jurisdiction,
    vendorSignature: row.vendor_signature ?? undefined,
    clientSignature: row.client_signature ?? undefined,
  };
}

function denormalize(obj: Partial<Contract>): any {
  return {
    ...(obj.contractNumber !== undefined ? { contract_number: obj.contractNumber } : {}),
    ...(obj.clientId !== undefined ? { client_id: obj.clientId } : {}),
    ...(obj.projectId !== undefined ? { project_id: obj.projectId } : {}),
    ...(obj.signingDate !== undefined ? { signing_date: obj.signingDate } : {}),
    ...(obj.signingLocation !== undefined ? { signing_location: obj.signingLocation } : {}),
    ...(obj.clientName1 !== undefined ? { client_name1: obj.clientName1 } : {}),
    ...(obj.clientAddress1 !== undefined ? { client_address1: obj.clientAddress1 } : {}),
    ...(obj.clientPhone1 !== undefined ? { client_phone1: obj.clientPhone1 } : {}),
    ...(obj.clientName2 !== undefined ? { client_name2: obj.clientName2 } : {}),
    ...(obj.clientAddress2 !== undefined ? { client_address2: obj.clientAddress2 } : {}),
    ...(obj.clientPhone2 !== undefined ? { client_phone2: obj.clientPhone2 } : {}),
    ...(obj.shootingDuration !== undefined ? { shooting_duration: obj.shootingDuration } : {}),
    ...(obj.guaranteedPhotos !== undefined ? { guaranteed_photos: obj.guaranteedPhotos } : {}),
    ...(obj.albumDetails !== undefined ? { album_details: obj.albumDetails } : {}),
    ...(obj.digitalFilesFormat !== undefined ? { digital_files_format: obj.digitalFilesFormat } : {}),
    ...(obj.otherItems !== undefined ? { other_items: obj.otherItems } : {}),
    ...(obj.personnelCount !== undefined ? { personnel_count: obj.personnelCount } : {}),
    ...(obj.deliveryTimeframe !== undefined ? { delivery_timeframe: obj.deliveryTimeframe } : {}),
    ...(obj.dpDate !== undefined ? { dp_date: obj.dpDate } : {}),
    ...(obj.finalPaymentDate !== undefined ? { final_payment_date: obj.finalPaymentDate } : {}),
    ...(obj.cancellationPolicy !== undefined ? { cancellation_policy: obj.cancellationPolicy } : {}),
    ...(obj.jurisdiction !== undefined ? { jurisdiction: obj.jurisdiction } : {}),
    ...(obj.vendorSignature !== undefined ? { vendor_signature: obj.vendorSignature } : {}),
    ...(obj.clientSignature !== undefined ? { client_signature: obj.clientSignature } : {}),
  };
}

export async function listContracts(): Promise<Contract[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createContract(payload: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateContract(id: string, patch: Partial<Contract>): Promise<Contract> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
