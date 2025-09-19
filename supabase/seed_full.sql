-- Seed data for Vena Pictures Dashboard
-- Run after schema_full.sql

-- USERS
insert into public.users (email, password, full_name, company_name, role, permissions)
values
  ('admin@venapictures.test', 'admin123', 'Admin Vena', 'Vena Pictures', 'Admin', '{Dashboard,Manajemen Klien,Proyek,Freelancer,Keuangan,Kalender,Laporan Klien,Input Package,Kode Promo,Manajemen Aset,Kontrak Kerja,Perencana Media Sosial,Marketing,SOP,Pengaturan}')
on conflict (email) do nothing;

-- PROFILE (linked to user)
insert into public.profile (admin_user_id, full_name, email, phone, company_name, website, address, bank_account, authorized_signer, bio, income_categories, expense_categories, project_types, event_types, asset_categories, sop_categories, package_categories, brand_color, public_page_title, public_page_introduction)
values (
  (select id from public.users where email='admin@venapictures.test'),
  'Admin Vena','admin@venapictures.test','+62 812-0000-0000','Vena Pictures','https://venapictures.test','Jalan Mawar No. 1, Jakarta','BCA 123456789 a.n Vena','Admin Vena','Vendor fotografi pernikahan.',
  '{Pelunasan Proyek,DP Proyek,Penjualan Aset}','{Transportasi,Perlengkapan,Operasional}','{Pernikahan,Prewedding,Engagement}','{Indoor,Outdoor}','{Kamera,Lensa,Lighting}','{Produksi,Delivery}','{Basic,Premium,Exclusive}','#3b82f6','Vena Pictures','Portofolio dan layanan terbaik kami.'
) on conflict do nothing;

-- PACKAGES
insert into public.packages (name, price, category, digital_items, processing_time, default_printing_cost, default_transport_cost, photographers, videographers)
values
  ('Basic Wedding', 5000000, 'Pernikahan', '{100 Edited Photos,All Raw Photos}', '30 hari', 500000, 300000, '2', '1'),
  ('Premium Wedding', 9000000, 'Pernikahan', '{150 Edited Photos,All Raw Photos,1 Minute Teaser}', '45 hari', 750000, 400000, '3', '2')
returning id;

-- ADD ONS
insert into public.add_ons (name, price) values
  ('Drone Footage', 1500000),
  ('Extra Photographer', 1000000)
returning id;

-- PROMO CODES
insert into public.promo_codes (code, discount_type, discount_value, is_active)
values ('VENA10', 'percentage', 10, true)
on conflict (code) do nothing;

-- CLIENTS
insert into public.clients (name, email, phone, whatsapp, instagram, status, client_type, portal_access_id)
values
  ('Budi Santoso', 'budi@example.com', '+62 812-1111-1111', '+62 812-1111-1111', '@budi', 'Aktif', 'Langsung', 'portal-budi-001'),
  ('Sinta Lestari', 'sinta@example.com', '+62 812-2222-2222', '+62 812-2222-2222', '@sinta', 'Aktif', 'Vendor', 'portal-sinta-001')
returning id;

-- CARDS
insert into public.cards (card_holder_name, bank_name, card_type, last_four_digits, balance, color_gradient)
values
  ('Vena Pictures','BCA','Debit','3090', 10000000, 'from-blue-500 to-sky-400'),
  ('Vena Pictures','CASH','Tunai','CASH', 2000000, 'from-amber-500 to-yellow-400');

-- POCKETS
insert into public.pockets (name, description, icon, type, amount)
values
  ('Nabung & Bayar','Dana operasional utama','piggy-bank','Nabung & Bayar', 5000000),
  ('Terkunci','Dana cadangan','lock','Terkunci', 3000000),
  ('Tabungan Hadiah Freelancer','Pool reward','star','Tabungan Hadiah Freelancer', 1000000);

-- PROJECTS (reference clients and packages)
insert into public.projects (project_name, client_name, client_id, project_type, package_name, package_id, date, location, progress, status, total_cost, amount_paid, payment_status, notes)
values
  (
    'Pernikahan Budi & Sinta',
    'Budi Santoso',
    (select id from public.clients where email='budi@example.com'),
    'Pernikahan',
    'Premium Wedding',
    (select id from public.packages where name='Premium Wedding'),
    current_date + interval '30 days',
    'Jakarta',
    0,
    'Dikonfirmasi',
    9000000,
    3000000,
    'DP Terbayar',
    'Catatan awal proyek'
  ),
  (
    'Prewedding Sinta',
    'Sinta Lestari',
    (select id from public.clients where email='sinta@example.com'),
    'Prewedding',
    'Basic Wedding',
    (select id from public.packages where name='Basic Wedding'),
    current_date + interval '14 days',
    'Bandung',
    0,
    'Dikonfirmasi',
    5000000,
    0,
    'Belum Bayar',
    'Prefer outdoor'
  );

-- PROJECT ADD ONS
insert into public.project_add_ons (project_id, add_on_id)
select p.id, a.id from public.projects p, public.add_ons a
where p.project_name='Pernikahan Budi & Sinta' and a.name in ('Drone Footage');

-- TEAM MEMBERS
insert into public.team_members (name, role, email, phone, standard_fee, reward_balance, rating, portal_access_id)
values
  ('Andi', 'Fotografer', 'andi@vena.test', '+62 812-3333-3333', 750000, 0, 5, 'freelancer-andi-001'),
  ('Rina', 'Videografer', 'rina@vena.test', '+62 812-4444-4444', 800000, 0, 4, 'freelancer-rina-001');

-- PROJECT TEAM
insert into public.project_team (project_id, member_id, member_name, member_role, fee)
values
  ((select id from public.projects where project_name='Pernikahan Budi & Sinta'), (select id from public.team_members where name='Andi'), 'Andi', 'Fotografer', 1000000),
  ((select id from public.projects where project_name='Pernikahan Budi & Sinta'), (select id from public.team_members where name='Rina'), 'Rina', 'Videografer', 1200000);

-- TEAM PROJECT PAYMENTS
insert into public.team_project_payments (project_id, team_member_name, team_member_id, date, status, fee, reward)
values
  ((select id from public.projects where project_name='Pernikahan Budi & Sinta'), 'Andi', (select id from public.team_members where name='Andi'), current_date, 'Unpaid', 1000000, 100000),
  ((select id from public.projects where project_name='Pernikahan Budi & Sinta'), 'Rina', (select id from public.team_members where name='Rina'), current_date, 'Unpaid', 1200000, 150000);

-- TEAM PAYMENT RECORDS
insert into public.team_payment_records (record_number, team_member_id, date, project_payment_ids, total_amount)
values (
  'TPR-0001',
  (select id from public.team_members where name='Andi'),
  current_date,
  array[(select id from public.team_project_payments where team_member_name='Andi' limit 1)],
  1100000
);

-- TRANSACTIONS
insert into public.transactions (date, description, amount, type, project_id, category, method, card_id)
values
  (current_date, 'DP Proyek Pernikahan Budi & Sinta', 3000000, 'Pemasukan', (select id from public.projects where project_name='Pernikahan Budi & Sinta'), 'DP Proyek', 'Transfer Bank', (select id from public.cards where bank_name='BCA')),
  (current_date, 'Sewa Lighting', 500000, 'Pengeluaran', null, 'Perlengkapan', 'Transfer Bank', (select id from public.cards where bank_name='BCA'));

-- ASSETS
insert into public.assets (name, category, purchase_date, purchase_price, serial_number, status, notes)
values ('Camera A7IV', 'Kamera', current_date - interval '180 days', 25000000, 'SN-A7IV-001', 'Tersedia', 'Kamera utama');

-- CONTRACTS
insert into public.contracts (contract_number, client_id, project_id, signing_date, signing_location, client_name1, client_address1, client_phone1, shooting_duration, guaranteed_photos, album_details, digital_files_format, other_items, personnel_count, delivery_timeframe, dp_date, final_payment_date, cancellation_policy, jurisdiction)
values (
  'CTR-2025-0001',
  (select id from public.clients where email='budi@example.com'),
  (select id from public.projects where project_name='Pernikahan Budi & Sinta'),
  current_date,
  'Jakarta',
  'Budi Santoso','Jl. Melati 1','+62 812-1111-1111',
  '8 jam',
  'Min. 150 foto',
  'Album 20x30',
  'JPG + MP4',
  'Flashdisk',
  '5 Orang',
  '45 hari kerja',
  current_date,
  current_date + interval '40 days',
  'DP hangus jika batal',
  'Hukum RI'
);

-- CLIENT FEEDBACK
insert into public.client_feedback (client_name, satisfaction, rating, feedback, date)
values ('Budi Santoso','Puas',5,'Hasil memuaskan, tim profesional.', current_date);

-- NOTIFICATIONS
insert into public.notifications (title, message, icon)
values ('Pembayaran Diterima','Pembayaran DP untuk proyek Budi & Sinta telah diterima.','payment');

-- SOCIAL MEDIA POSTS
insert into public.social_media_posts (project_id, client_name, post_type, platform, scheduled_date, caption, status)
values ((select id from public.projects where project_name='Pernikahan Budi & Sinta'), 'Budi Santoso', 'Instagram Reels', 'Instagram', current_date + interval '7 days', 'Behind the scene!', 'Terjadwal');

-- LEADS
insert into public.leads (name, contact_channel, location, status, date, notes, whatsapp)
values
  ('Dewi', 'Instagram', 'Jakarta', 'Sedang Diskusi', current_date - interval '2 days', 'Tanya paket premium', '+62 812-5555-5555'),
  ('Rudi', 'Referensi', 'Bandung', 'Menunggu Follow Up', current_date - interval '1 days', 'Minta penawaran', '+62 812-6666-6666');

-- SOPs
insert into public.sops (title, category, content, last_updated)
values ('Standar Proses Editing', 'Produksi', 'Langkah-langkah editing standar...', current_date);

-- REWARD LEDGER
insert into public.reward_ledger_entries (team_member_id, date, description, amount, project_id)
values ((select id from public.team_members where name='Andi'), current_date, 'Bonus performa', 100000, (select id from public.projects where project_name='Pernikahan Budi & Sinta'));
