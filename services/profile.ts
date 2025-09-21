import supabase from '../lib/supabaseClient';
import { Profile, ProjectStatusConfig } from '../types';

const TABLE = 'profile';

function asJsonObject<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return null;
}

function fromRow(row: any): Profile {
  return {
    id: row.id,
    adminUserId: row.admin_user_id || '',
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    companyName: row.company_name || '',
    website: row.website || '',
    address: row.address || '',
    bankAccount: row.bank_account || '',
    authorizedSigner: row.authorized_signer || '',
    idNumber: row.id_number || undefined,
    bio: row.bio || '',
    incomeCategories: row.income_categories || [],
    expenseCategories: row.expense_categories || [],
    projectTypes: row.project_types || [],
    eventTypes: row.event_types || [],
    assetCategories: row.asset_categories || [],
    sopCategories: row.sop_categories || [],
    packageCategories: row.package_categories || [],
    projectStatusConfig: (row.project_status_config || []) as ProjectStatusConfig[],
    notificationSettings: { newProject: true, paymentConfirmation: true, deadlineReminder: true },
    securitySettings: { twoFactorEnabled: false },
    briefingTemplate: row.briefing_template || '',
    termsAndConditions: row.terms_and_conditions || undefined,
    contractTemplate: row.contract_template || undefined,
    logoBase64: row.logo_base64 || undefined,
    brandColor: row.brand_color || undefined,
    publicPageConfig: row.public_page_config ? {
      template: row.public_page_config.template || 'classic',
      title: row.public_page_config.title || 'Vena Pictures',
      introduction: row.public_page_config.introduction || '',
      galleryImages: row.public_page_config.galleryImages || [],
    } : {
      template: (row.public_page_template || 'classic') as any,
      title: row.public_page_title || 'Vena Pictures',
      introduction: row.public_page_introduction || '',
      galleryImages: [],
    },
    packageShareTemplate: row.package_share_template || undefined,
    bookingFormTemplate: row.booking_form_template || undefined,
    // Prefer dedicated column; else, fallback to booking_form_template JSON envelope { chatTemplates: [...] }
    chatTemplates: row.chat_templates || (asJsonObject(row.booking_form_template)?.chatTemplates ?? []),
  } as Profile;
}

function toRow(p: Partial<Profile>): any {
  return {
    ...(p.adminUserId !== undefined ? { admin_user_id: p.adminUserId } : {}),
    ...(p.fullName !== undefined ? { full_name: p.fullName } : {}),
    ...(p.email !== undefined ? { email: p.email } : {}),
    ...(p.phone !== undefined ? { phone: p.phone } : {}),
    ...(p.companyName !== undefined ? { company_name: p.companyName } : {}),
    ...(p.website !== undefined ? { website: p.website } : {}),
    ...(p.address !== undefined ? { address: p.address } : {}),
    ...(p.bankAccount !== undefined ? { bank_account: p.bankAccount } : {}),
    ...(p.authorizedSigner !== undefined ? { authorized_signer: p.authorizedSigner } : {}),
    ...(p.idNumber !== undefined ? { id_number: p.idNumber } : {}),
    ...(p.bio !== undefined ? { bio: p.bio } : {}),
    ...(p.incomeCategories !== undefined ? { income_categories: p.incomeCategories } : {}),
    ...(p.expenseCategories !== undefined ? { expense_categories: p.expenseCategories } : {}),
    ...(p.projectTypes !== undefined ? { project_types: p.projectTypes } : {}),
    ...(p.eventTypes !== undefined ? { event_types: p.eventTypes } : {}),
    ...(p.assetCategories !== undefined ? { asset_categories: p.assetCategories } : {}),
    ...(p.sopCategories !== undefined ? { sop_categories: p.sopCategories } : {}),
    ...(p.packageCategories !== undefined ? { package_categories: p.packageCategories } : {}),
    ...(p.termsAndConditions !== undefined ? { terms_and_conditions: p.termsAndConditions } : {}),
    ...(p.contractTemplate !== undefined ? { contract_template: p.contractTemplate } : {}),
    ...(p.logoBase64 !== undefined ? { logo_base64: p.logoBase64 } : {}),
    ...(p.brandColor !== undefined ? { brand_color: p.brandColor } : {}),
    ...(p.publicPageConfig !== undefined ? {
      public_page_config: p.publicPageConfig,
      // Also update legacy columns for backward compatibility
      public_page_template: p.publicPageConfig.template,
      public_page_title: p.publicPageConfig.title,
      public_page_introduction: p.publicPageConfig.introduction,
    } : {}),
    ...(p.projectStatusConfig !== undefined ? { project_status_config: p.projectStatusConfig } : {}),
    ...(p.packageShareTemplate !== undefined ? { package_share_template: p.packageShareTemplate } : {}),
    ...(p.bookingFormTemplate !== undefined ? { booking_form_template: p.bookingFormTemplate } : {}),
    ...(p.briefingTemplate !== undefined ? { briefing_template: p.briefingTemplate } : {}),
    // We intentionally do NOT write chat_templates column to avoid schema dependency.
  };
}

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? fromRow(data) : null;
}

export async function upsertProfile(input: Partial<Profile> & { id?: string }): Promise<Profile> {
  // If chatTemplates provided, embed into booking_form_template JSON to ensure backward compatibility
  let bookingFormTemplatePayload: string | undefined = undefined;
  if (input.chatTemplates !== undefined) {
    let existingTemplate: any = {};
    if (input.id) {
      const { data: current } = await supabase.from(TABLE).select('booking_form_template').eq('id', input.id).maybeSingle();
      const parsed = asJsonObject(current?.booking_form_template);
      if (parsed && typeof parsed === 'object') {
        existingTemplate = parsed;
      } else if (typeof current?.booking_form_template === 'string' && current.booking_form_template) {
        existingTemplate = { bookingFormTemplate: current.booking_form_template };
      }
    }
    const merged = { ...existingTemplate, chatTemplates: input.chatTemplates };
    bookingFormTemplatePayload = JSON.stringify(merged);
  }

  const row = toRow({ ...input, bookingFormTemplate: bookingFormTemplatePayload ?? input.bookingFormTemplate, chatTemplates: undefined });
  if (input.id) {
    const { error } = await supabase.from(TABLE).update(row).eq('id', input.id);
    if (error) throw error;
    const { data, error: err2 } = await supabase.from(TABLE).select('*').eq('id', input.id).single();
    if (err2) throw err2;
    return fromRow(data);
  } else {
    const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
    if (error) throw error;
    return fromRow(data);
  }
}
