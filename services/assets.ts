import supabase from '../lib/supabaseClient';
import { Asset } from '../types';

const TABLE = 'assets';

function normalize(row: any): Asset {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    purchaseDate: row.purchase_date,
    purchasePrice: Number(row.purchase_price || 0),
    serialNumber: row.serial_number ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

function denormalize(obj: Partial<Asset>): any {
  return {
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.category !== undefined ? { category: obj.category } : {}),
    ...(obj.purchaseDate !== undefined ? { purchase_date: obj.purchaseDate } : {}),
    ...(obj.purchasePrice !== undefined ? { purchase_price: obj.purchasePrice } : {}),
    ...(obj.serialNumber !== undefined ? { serial_number: obj.serialNumber } : {}),
    ...(obj.status !== undefined ? { status: obj.status } : {}),
    ...(obj.notes !== undefined ? { notes: obj.notes } : {}),
  };
}

export async function listAssets(): Promise<Asset[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('name');
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createAsset(payload: Omit<Asset, 'id'>): Promise<Asset> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<Asset> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
