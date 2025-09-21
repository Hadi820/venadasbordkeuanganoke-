-- Fixed Database Indexing Optimization for Egress Reduction
-- This migration creates optimized indexes for frequently queried data

-- Projects table optimization
CREATE INDEX IF NOT EXISTS idx_projects_client_status ON projects(client_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_date_status ON projects(date DESC, status);
CREATE INDEX IF NOT EXISTS idx_projects_status_progress ON projects(status, progress);
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON projects(payment_status, status);
CREATE INDEX IF NOT EXISTS idx_projects_type_date ON projects(project_type, date DESC);

-- Clients table optimization  
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);

-- Transactions table optimization
CREATE INDEX IF NOT EXISTS idx_transactions_project_date ON transactions(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_card_date ON transactions(card_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category, type);

-- Team members optimization
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_created_at ON team_members(created_at DESC);

-- Project team assignments optimization
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_member ON project_team(member_id);

-- Team project payments optimization
CREATE INDEX IF NOT EXISTS idx_team_payments_project_member ON team_project_payments(project_id, team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_payments_status ON team_project_payments(payment_status);

-- Project revision submissions optimization
CREATE INDEX IF NOT EXISTS idx_revision_submissions_project ON project_revision_submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_revision_submissions_freelancer ON project_revision_submissions(freelancer_id);

-- Cards and Pockets optimization
CREATE INDEX IF NOT EXISTS idx_cards_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_pockets_type ON pockets(pocket_type);

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_active_projects ON projects(id, status, date DESC) 
WHERE status NOT IN ('Selesai', 'Dibatalkan');

CREATE INDEX IF NOT EXISTS idx_unpaid_projects ON projects(id, client_id, payment_status) 
WHERE payment_status != 'Lunas';

CREATE INDEX IF NOT EXISTS idx_recent_transactions ON transactions(id, date DESC, type, amount)
WHERE date >= CURRENT_DATE - INTERVAL '1 year';

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_dashboard ON projects(status, date DESC, payment_status, progress);

-- Index for financial queries
CREATE INDEX IF NOT EXISTS idx_transactions_financial ON transactions(date DESC, type, amount, card_id);

-- Index for client projects lookup
CREATE INDEX IF NOT EXISTS idx_projects_client_lookup ON projects(client_id, status, date DESC);

-- Index for team performance queries
CREATE INDEX IF NOT EXISTS idx_team_payments_performance ON team_project_payments(team_member_id, payment_status, amount);

COMMENT ON INDEX idx_projects_client_status IS 'Optimizes client project queries';
COMMENT ON INDEX idx_projects_dashboard IS 'Optimizes dashboard aggregate queries';
COMMENT ON INDEX idx_active_projects IS 'Partial index for active projects only';
COMMENT ON INDEX idx_recent_transactions IS 'Partial index for recent transactions only';