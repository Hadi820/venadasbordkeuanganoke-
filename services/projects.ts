import supabase from '../lib/supabaseClient';
import { Project, AddOn, PaymentStatus, BookingStatus } from '../types';
import { upsertAssignmentsForProject, listAssignmentsByProject } from './projectTeamAssignments';

const PROJECTS = 'projects';
const PROJECT_ADD_ONS = 'project_add_ons';
const ADD_ONS = 'add_ons';
const PACKAGES = 'packages';

export type CreateProjectInput = {
  projectName: string;
  clientName: string;
  clientId: string;
  projectType: string;
  packageName: string;
  date: string; // ISO date
  location: string;
  status: string;
  // progress percentage (0-100). If omitted, defaults to 0.
  progress?: number;
  totalCost: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  bookingStatus?: BookingStatus;
  notes?: string;
  accommodation?: string;
  driveLink?: string;
  promoCodeId?: string;
  discountAmount?: number;
  printingCost?: number;
  transportCost?: number;
  completedDigitalItems?: string[];
  dpProofUrl?: string;
  addOns: { id: string; name: string; price: number }[];
};

function normalizeProject(row: any): Project {
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name,
    clientId: row.client_id,
    projectType: row.project_type,
    packageName: row.package_name,
    packageId: row.package_id || '',
    addOns: [],
    date: row.date,
    deadlineDate: row.deadline_date || undefined,
    location: row.location || '',
    progress: row.progress ?? 0,
    status: row.status,
    totalCost: Number(row.total_cost || 0),
    amountPaid: Number(row.amount_paid || 0),
    paymentStatus: row.payment_status,
    bookingStatus: row.booking_status || undefined,
    team: [],
    notes: row.notes || undefined,
    accommodation: row.accommodation || undefined,
    driveLink: row.drive_link || undefined,
    clientDriveLink: row.client_drive_link || undefined,
    finalDriveLink: row.final_drive_link || undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    promoCodeId: row.promo_code_id || undefined,
    discountAmount: row.discount_amount || undefined,
    printingDetails: row.printing_details || undefined,
    printingCost: row.printing_cost || undefined,
    transportCost: row.transport_cost || undefined,
    transportPaid: row.transport_paid || false,
    transportNote: row.transport_note || undefined,
    printingCardId: row.printing_card_id || undefined,
    transportCardId: row.transport_card_id || undefined,
    completedDigitalItems: row.completed_digital_items || [],
    dpProofUrl: row.dp_proof_url || undefined,
    shippingDetails: row.shipping_details || undefined,
    activeSubStatuses: row.active_sub_statuses || undefined,
    customSubStatuses: row.custom_sub_statuses || undefined,
    confirmedSubStatuses: row.confirmed_sub_statuses || undefined,
    clientSubStatusNotes: row.client_sub_status_notes || undefined,
    subStatusConfirmationSentAt: row.sub_status_confirmation_sent_at || undefined,
    invoiceSignature: row.invoice_signature || undefined,
    isEditingConfirmedByClient: row.is_editing_confirmed_by_client || false,
    isPrintingConfirmedByClient: row.is_printing_confirmed_by_client || false,
    isDeliveryConfirmedByClient: row.is_delivery_confirmed_by_client || false,
  } as Project;
}

export async function listProjects(options: { limit?: number; offset?: number } = {}): Promise<Project[]> {
  const limit = Math.min(100, options.limit || 50); // Default 50, max 100
  const offset = options.offset || 0;
  
  const { data, error } = await supabase
    .from(PROJECTS)
    .select('*')
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw error;
  const rows = (data || []) as any[];
  return rows.map(normalizeProject);
}

export async function listProjectsPaginated(
  page: number = 1, 
  limit: number = 20,
  searchQuery?: string,
  filters?: {
    status?: string;
    clientId?: string;
    projectType?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<{
  projects: Project[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;
  
  // Build query with search and filters
  let query = supabase.from(PROJECTS).select('*', { count: 'exact' });
  let countQuery = supabase.from(PROJECTS).select('*', { count: 'exact', head: true });
  
  // Apply search
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    query = query.or(`project_name.ilike.${searchTerm},client_name.ilike.${searchTerm},location.ilike.${searchTerm}`);
    countQuery = countQuery.or(`project_name.ilike.${searchTerm},client_name.ilike.${searchTerm},location.ilike.${searchTerm}`);
  }
  
  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
    countQuery = countQuery.eq('status', filters.status);
  }
  
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
    countQuery = countQuery.eq('client_id', filters.clientId);
  }
  
  if (filters?.projectType) {
    query = query.eq('project_type', filters.projectType);
    countQuery = countQuery.eq('project_type', filters.projectType);
  }
  
  if (filters?.dateFrom) {
    query = query.gte('date', filters.dateFrom);
    countQuery = countQuery.gte('date', filters.dateFrom);
  }
  
  if (filters?.dateTo) {
    query = query.lte('date', filters.dateTo);
    countQuery = countQuery.lte('date', filters.dateTo);
  }
  
  // Get total count
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;
  
  // Get paginated data
  const { data, error } = await query
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw error;
  
  const projects = (data || []).map(normalizeProject);
  const total = count || 0;
  
  return {
    projects,
    total,
    hasMore: (page * limit) < total
  };
}

export type UpdateProjectInput = Partial<CreateProjectInput> & { addOns?: { id: string; name: string; price: number }[] };

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  // Resolve package id if packageName provided
  let packageId: string | undefined = undefined;
  if (input.packageName) {
    const { data: pkg, error: pkgErr } = await supabase
      .from(PACKAGES)
      .select('id')
      .eq('name', input.packageName)
      .maybeSingle();
    if (!pkgErr) packageId = pkg?.id;
  }
  const isUuid = (v?: string) => !!v && /^[0-9a-fA-F-]{36}$/.test(v);
  const promoCodeId = isUuid(input.promoCodeId as any) ? (input.promoCodeId as any) : undefined;

  const payload: any = {
    ...(input.projectName !== undefined ? { project_name: input.projectName } : {}),
    ...(input.clientName !== undefined ? { client_name: input.clientName } : {}),
    ...(input.clientId !== undefined ? { client_id: input.clientId } : {}),
    ...(input.projectType !== undefined ? { project_type: input.projectType } : {}),
    ...(input.packageName !== undefined ? { package_name: input.packageName } : {}),
    ...(packageId !== undefined ? { package_id: packageId } : {}),
    ...(input.date !== undefined ? { date: input.date } : {}),
    ...(input as any).deadlineDate !== undefined ? { deadline_date: (input as any).deadlineDate } : {},
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input as any).progress !== undefined ? { progress: (input as any).progress } : {},
    ...(input.totalCost !== undefined ? { total_cost: input.totalCost } : {}),
    ...(input.amountPaid !== undefined ? { amount_paid: input.amountPaid } : {}),
    ...(input.paymentStatus !== undefined ? { payment_status: input.paymentStatus } : {}),
    ...(input.bookingStatus !== undefined ? { booking_status: input.bookingStatus } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.accommodation !== undefined ? { accommodation: input.accommodation } : {}),
    ...(input.driveLink !== undefined ? { drive_link: input.driveLink } : {}),
    ...(input as any).clientDriveLink !== undefined ? { client_drive_link: (input as any).clientDriveLink } : {},
    ...(input as any).finalDriveLink !== undefined ? { final_drive_link: (input as any).finalDriveLink } : {},
    ...(input as any).startTime !== undefined ? { start_time: (input as any).startTime } : {},
    ...(input as any).endTime !== undefined ? { end_time: (input as any).endTime } : {},
    ...(input.discountAmount !== undefined ? { discount_amount: input.discountAmount } : {}),
    ...(input as any).printingDetails !== undefined ? { printing_details: (input as any).printingDetails } : {},
    ...(input.printingCost !== undefined ? { printing_cost: input.printingCost } : {}),
    ...(input.transportCost !== undefined ? { transport_cost: input.transportCost } : {}),
    ...(input as any).transportPaid !== undefined ? { transport_paid: (input as any).transportPaid } : {},
    ...(input as any).transportNote !== undefined ? { transport_note: (input as any).transportNote } : {},
    ...(input as any).printingCardId !== undefined ? { printing_card_id: (input as any).printingCardId } : {},
    ...(input as any).transportCardId !== undefined ? { transport_card_id: (input as any).transportCardId } : {},
    ...(input.completedDigitalItems !== undefined ? { completed_digital_items: input.completedDigitalItems } : {}),
    ...(input.dpProofUrl !== undefined ? { dp_proof_url: input.dpProofUrl } : {}),
    ...(promoCodeId !== undefined ? { promo_code_id: promoCodeId } : {}),
    ...(input as any).shippingDetails !== undefined ? { shipping_details: (input as any).shippingDetails } : {},
    ...(input as any).activeSubStatuses !== undefined ? { active_sub_statuses: (input as any).activeSubStatuses } : {},
    ...(input as any).customSubStatuses !== undefined ? { custom_sub_statuses: (input as any).customSubStatuses } : {},
    ...(input as any).confirmedSubStatuses !== undefined ? { confirmed_sub_statuses: (input as any).confirmedSubStatuses } : {},
    ...(input as any).clientSubStatusNotes !== undefined ? { client_sub_status_notes: (input as any).clientSubStatusNotes } : {},
    ...(input as any).subStatusConfirmationSentAt !== undefined ? { sub_status_confirmation_sent_at: (input as any).subStatusConfirmationSentAt } : {},
    ...(input as any).invoiceSignature !== undefined ? { invoice_signature: (input as any).invoiceSignature } : {},
    ...(input as any).isEditingConfirmedByClient !== undefined ? { is_editing_confirmed_by_client: (input as any).isEditingConfirmedByClient } : {},
    ...(input as any).isPrintingConfirmedByClient !== undefined ? { is_printing_confirmed_by_client: (input as any).isPrintingConfirmedByClient } : {},
    ...(input as any).isDeliveryConfirmedByClient !== undefined ? { is_delivery_confirmed_by_client: (input as any).isDeliveryConfirmedByClient } : {},
  };

  if (Object.keys(payload).length > 0) {
    const { error: updErr } = await supabase.from(PROJECTS).update(payload).eq('id', projectId);
    if (updErr) throw updErr;
  }

  // Sync add-ons
  if (input.addOns) {
    // delete existing links
    const { error: delErr } = await supabase.from(PROJECT_ADD_ONS).delete().eq('project_id', projectId);
    if (delErr) throw delErr;
    // resolve add-on ids by name
    const addOnNames = input.addOns.map(a => a.name);
    if (addOnNames.length > 0) {
      const { data: addOnRows, error: addOnErr } = await supabase
        .from(ADD_ONS)
        .select('id, name')
        .in('name', addOnNames);
      if (addOnErr) throw addOnErr;
      const addOnIdByName: Record<string, string> = Object.fromEntries((addOnRows || []).map(r => [r.name, r.id]));
      const toInsert = input.addOns
        .map(a => addOnIdByName[a.name])
        .filter(Boolean)
        .map(add_on_id => ({ project_id: projectId, add_on_id }));
      if (toInsert.length > 0) {
        const { error: linkErr } = await supabase.from(PROJECT_ADD_ONS).insert(toInsert);
        if (linkErr) throw linkErr;
      }
    }
  }

  // Return updated project
  const { data, error } = await supabase.from(PROJECTS).select('*').eq('id', projectId).single();
  if (error) throw error;
  return normalizeProject(data);
}

export async function deleteProject(projectId: string): Promise<void> {
  // delete joins first to avoid FK issues
  await supabase.from(PROJECT_ADD_ONS).delete().eq('project_id', projectId);
  const { error } = await supabase.from(PROJECTS).delete().eq('id', projectId);
  if (error) throw error;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  // Resolve package_id by package name (optional)
  let packageId: string | null = null;
  // Sanitize promo code id: UI may pass local id, ensure UUID or null
  const isUuid = (v?: string) => !!v && /^[0-9a-fA-F-]{36}$/.test(v);
  const promoCodeId = isUuid(input.promoCodeId as any) ? (input.promoCodeId as any) : null;
  if (input.packageName) {
    const { data: pkg } = await supabase
      .from(PACKAGES)
      .select('id')
      .eq('name', input.packageName)
      .maybeSingle();
    packageId = pkg?.id ?? null;
  }

  // Insert project
  const { data: inserted, error } = await supabase
    .from(PROJECTS)
    .insert([
      {
        project_name: input.projectName,
        client_name: input.clientName,
        client_id: input.clientId,
        project_type: input.projectType,
        package_name: input.packageName,
        package_id: packageId,
        date: input.date,
        deadline_date: (input as any).deadlineDate ?? null,
        location: input.location,
        progress: (input as any).progress ?? 0,
        status: input.status,
        total_cost: input.totalCost,
        amount_paid: input.amountPaid,
        payment_status: input.paymentStatus,
        booking_status: input.bookingStatus ?? null,
        notes: input.notes ?? null,
        accommodation: input.accommodation ?? null,
        drive_link: input.driveLink ?? null,
        client_drive_link: (input as any).clientDriveLink ?? null,
        final_drive_link: (input as any).finalDriveLink ?? null,
        start_time: (input as any).startTime ?? null,
        end_time: (input as any).endTime ?? null,
        promo_code_id: promoCodeId,
        discount_amount: input.discountAmount ?? null,
        printing_details: (input as any).printingDetails ?? null,
        printing_cost: input.printingCost ?? null,
        transport_cost: input.transportCost ?? null,
        transport_paid: (input as any).transportPaid ?? false,
        transport_note: (input as any).transportNote ?? null,
        printing_card_id: (input as any).printingCardId ?? null,
        transport_card_id: (input as any).transportCardId ?? null,
        dp_proof_url: input.dpProofUrl ?? null,
        completed_digital_items: input.completedDigitalItems ?? [],
        shipping_details: (input as any).shippingDetails ?? null
      },
    ])
    .select('*')
    .single();
  if (error) throw error;

  const projectId = inserted.id as string;

  // Map add-ons by name to IDs, then insert into project_add_ons
  const addOnNames = input.addOns.map(a => a.name);
  if (addOnNames.length > 0) {
    const { data: addOnRows, error: addOnErr } = await supabase
      .from(ADD_ONS)
      .select('id, name')
      .in('name', addOnNames);
    if (addOnErr) throw addOnErr;
    const addOnIdByName: Record<string, string> = Object.fromEntries((addOnRows || []).map(r => [r.name, r.id]));
    const toInsert = input.addOns
      .map(a => addOnIdByName[a.name])
      .filter(Boolean)
      .map(add_on_id => ({ project_id: projectId, add_on_id }));
    if (toInsert.length > 0) {
      const { error: linkErr } = await supabase
        .from(PROJECT_ADD_ONS)
        .insert(toInsert);
      if (linkErr) throw linkErr;
    }
  }

  return normalizeProject(inserted);
}

// Enhanced function to create project with all related data in a single transaction
export async function createProjectWithRelations(input: CreateProjectInput & {
  team?: Array<{
    memberId: string;
    name: string;
    role: string;
    fee: number;
    reward?: number;
    subJob?: string;
  }>;
  activeSubStatuses?: string[];
  customSubStatuses?: Array<{ name: string; note: string }>;
}): Promise<Project> {
  // First create the project
  const project = await createProject(input);
  
  // Then handle team assignments if provided
  if (input.team && input.team.length > 0) {
    const assignments = input.team.map(t => ({
      memberId: t.memberId,
      name: t.name,
      role: t.role,
      fee: t.fee,
      reward: t.reward,
      subJob: t.subJob,
    }));
    
    await upsertAssignmentsForProject(project.id, assignments);
  }
  
  // Update project with sub-statuses if provided
  if (input.activeSubStatuses || input.customSubStatuses) {
    const updateData: any = {};
    if (input.activeSubStatuses) updateData.activeSubStatuses = input.activeSubStatuses;
    if (input.customSubStatuses) updateData.customSubStatuses = input.customSubStatuses;
    
    if (Object.keys(updateData).length > 0) {
      await updateProject(project.id, updateData);
    }
  }
  
  // Return the complete project
  const { data, error } = await supabase.from(PROJECTS).select('*').eq('id', project.id).single();
  if (error) throw error;
  
  const completeProject = normalizeProject(data);
  
  // Fetch and attach team data
  if (input.team && input.team.length > 0) {
    // `projectTeamAssignments` is statically imported at the top of this file.
    // Use the already-imported `listAssignmentsByProject` to avoid dynamic/static import
    // conflicts that prevent Rollup from code-splitting.
    completeProject.team = await listAssignmentsByProject(project.id);
  }
  
  return completeProject;
}

// Enhanced function to get project with all related data
export async function getProjectWithRelations(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase.from(PROJECTS).select('*').eq('id', projectId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  
  const project = normalizeProject(data);
  
  // Fetch team assignments
  try {
    project.team = await listAssignmentsByProject(projectId);
  } catch (e) {
    console.warn('Failed to fetch team assignments:', e);
    project.team = [];
  }
  
  // Fetch add-ons
  try {
    const { data: addOnData, error: addOnError } = await supabase
      .from(PROJECT_ADD_ONS)
      .select(`
        add_ons (
          id,
          name,
          price
        )
      `)
      .eq('project_id', projectId);
    
    if (!addOnError && addOnData) {
      project.addOns = addOnData.map((item: any) => item.add_ons).filter(Boolean);
    }
  } catch (e) {
    console.warn('Failed to fetch add-ons:', e);
    project.addOns = [];
  }
  
  return project;
}

// Enhanced function to list projects with all related data
export async function listProjectsWithRelations(): Promise<Project[]> {
  const { data, error } = await supabase.from(PROJECTS).select('*').order('date', { ascending: false });
  if (error) throw error;
  
  const projects = (data || []).map(normalizeProject);
  
  // Fetch team assignments for all projects
  try {
    const { data: teamData, error: teamError } = await supabase
      .from('project_team')
      .select('*');
    
    if (!teamError && teamData) {
      const teamByProject = teamData.reduce((acc, row) => {
        if (!acc[row.project_id]) acc[row.project_id] = [];
        acc[row.project_id].push({
          memberId: row.member_id,
          name: row.member_name,
          role: row.member_role,
          fee: Number(row.fee || 0),
          reward: Number(row.reward || 0),
          subJob: row.sub_job || undefined,
        });
        return acc;
      }, {} as Record<string, any[]>);
      
      projects.forEach(project => {
        project.team = teamByProject[project.id] || [];
      });
    }
  } catch (e) {
    console.warn('Failed to fetch team assignments:', e);
  }
  
  // Fetch add-ons for all projects
  try {
    const { data: addOnData, error: addOnError } = await supabase
      .from(PROJECT_ADD_ONS)
      .select(`
        project_id,
        add_ons (
          id,
          name,
          price
        )
      `);
    
    if (!addOnError && addOnData) {
      const addOnsByProject = addOnData.reduce((acc, item) => {
        if (!acc[item.project_id]) acc[item.project_id] = [];
        if (item.add_ons) acc[item.project_id].push(item.add_ons);
        return acc;
      }, {} as Record<string, any[]>);
      
      projects.forEach(project => {
        project.addOns = addOnsByProject[project.id] || [];
      });
    }
  } catch (e) {
    console.warn('Failed to fetch add-ons:', e);
  }
  
  return projects;
}

// Utility function to validate project data before persistence
export function validateProjectData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.projectName || data.projectName.trim() === '') {
    errors.push('Nama proyek tidak boleh kosong');
  }
  
  if (!data.clientName || data.clientName.trim() === '') {
    errors.push('Nama klien tidak boleh kosong');
  }
  
  if (!data.clientId || data.clientId.trim() === '') {
    errors.push('ID klien tidak boleh kosong');
  }
  
  if (!data.date || !data.date.match(/^\d{4}-\d{2}-\d{2}/)) {
    errors.push('Tanggal acara tidak valid');
  }
  
  if (!data.status || data.status.trim() === '') {
    errors.push('Status proyek tidak boleh kosong');
  }
  
  if (data.deadlineDate && !data.deadlineDate.match(/^\d{4}-\d{2}-\d{2}/)) {
    errors.push('Tanggal deadline tidak valid');
  }
  
  if (data.totalCost !== undefined && (isNaN(data.totalCost) || data.totalCost < 0)) {
    errors.push('Total biaya harus berupa angka positif');
  }
  
  if (data.amountPaid !== undefined && (isNaN(data.amountPaid) || data.amountPaid < 0)) {
    errors.push('Jumlah yang dibayar harus berupa angka positif');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Utility function to sanitize project data
export function sanitizeProjectData(data: any): any {
  return {
    ...data,
    projectName: data.projectName?.trim() || '',
    clientName: data.clientName?.trim() || '',
    location: data.location?.trim() || '',
    notes: data.notes?.trim() || undefined,
    driveLink: data.driveLink?.trim() || undefined,
    clientDriveLink: data.clientDriveLink?.trim() || undefined,
    finalDriveLink: data.finalDriveLink?.trim() || undefined,
    shippingDetails: data.shippingDetails?.trim() || undefined,
    totalCost: data.totalCost ? Number(data.totalCost) : 0,
    amountPaid: data.amountPaid ? Number(data.amountPaid) : 0,
    printingCost: data.printingCost ? Number(data.printingCost) : 0,
    transportCost: data.transportCost ? Number(data.transportCost) : 0,
    transportPaid: Boolean((data as any).transportPaid),
    transportNote: (data as any).transportNote ? String((data as any).transportNote).trim() : undefined,
    printingCardId: (data as any).printingCardId || undefined,
    transportCardId: (data as any).transportCardId || undefined,
    activeSubStatuses: Array.isArray(data.activeSubStatuses) ? data.activeSubStatuses : [],
    customSubStatuses: Array.isArray(data.customSubStatuses) ? data.customSubStatuses : [],
    completedDigitalItems: Array.isArray(data.completedDigitalItems) ? data.completedDigitalItems : [],
    printingDetails: Array.isArray(data.printingDetails) ? data.printingDetails : (Array.isArray((data as any).printing_details) ? (data as any).printing_details : []),
    team: Array.isArray(data.team) ? data.team : [],
    isEditingConfirmedByClient: Boolean(data.isEditingConfirmedByClient),
    isPrintingConfirmedByClient: Boolean(data.isPrintingConfirmedByClient),
    isDeliveryConfirmedByClient: Boolean(data.isDeliveryConfirmedByClient),
  };
}
