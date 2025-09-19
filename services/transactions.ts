import supabase from '../lib/supabaseClient';
import { Transaction, TransactionType } from '../types';

const TRANSACTIONS = 'transactions';
const CARDS = 'cards';

export async function createTransaction(row: Omit<Transaction, 'id' | 'vendorSignature'>): Promise<Transaction> {
  const payload = {
    date: row.date,
    description: row.description,
    amount: row.amount,
    type: row.type,
    project_id: row.projectId ?? null,
    category: row.category,
    method: row.method,
    pocket_id: row.pocketId ?? null,
    card_id: row.cardId ?? null,
    printing_item_id: row.printingItemId ?? null,
  };
  const { data, error } = await supabase
    .from(TRANSACTIONS)
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return normalizeTransaction(data);
}

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from(TRANSACTIONS)
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeTransaction);
}

export async function updateCardBalance(cardId: string, delta: number): Promise<void> {
  // increment balance = balance + delta
  const { error } = await supabase.rpc('increment_card_balance', { p_card_id: cardId, p_delta: delta });
  if (error) {
    // fallback: do update with select-then-update (not ideal for concurrency)
    const { data: card, error: selErr } = await supabase.from(CARDS).select('balance').eq('id', cardId).maybeSingle();
    if (selErr) throw selErr;
    const current = Number(card?.balance || 0);
    const { error: updErr } = await supabase.from(CARDS).update({ balance: current + delta }).eq('id', cardId);
    if (updErr) throw updErr;
    return;
  }
}

function normalizeTransaction(row: any): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount),
    type: row.type as TransactionType,
    projectId: row.project_id ?? undefined,
    category: row.category,
    method: row.method,
    pocketId: row.pocket_id ?? undefined,
    cardId: row.card_id ?? undefined,
    printingItemId: row.printing_item_id ?? undefined,
    vendorSignature: row.vendor_signature ?? undefined,
  };
}

function denormalizeTransaction(patch: Partial<Transaction>): any {
  return {
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId ?? null } : {}),
    ...(patch.category !== undefined ? { category: patch.category } : {}),
    ...(patch.method !== undefined ? { method: patch.method } : {}),
    ...(patch.pocketId !== undefined ? { pocket_id: patch.pocketId ?? null } : {}),
    ...(patch.cardId !== undefined ? { card_id: patch.cardId ?? null } : {}),
    ...(patch.printingItemId !== undefined ? { printing_item_id: patch.printingItemId ?? null } : {}),
  };
}

export async function updateTransaction(id: string, patch: Partial<Transaction>): Promise<Transaction> {
  const payload = denormalizeTransaction(patch);
  const { data, error } = await supabase
    .from(TRANSACTIONS)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalizeTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from(TRANSACTIONS).delete().eq('id', id);
  if (error) throw error;
}
