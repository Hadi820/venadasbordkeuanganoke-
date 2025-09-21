-- Database Indexing Optimization for Egress Reduction
-- This migration creates optimized indexes for frequently queried data

-- Projects table optimization
CREATE INDEX IF NOT EXISTS idx_projects_client_status ON projects(client_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_date_status ON projects(date DESC, status);
CREATE INDEX IF NOT EXISTS idx_projects_status_progress ON projects(status, progress);
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON projects(payment_status, status);

-- Clients table optimization  
CREATE INDEX IF NOT EXISTS idx_clients_type_status ON clients(client_type, status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Transactions table optimization
CREATE INDEX IF NOT EXISTS idx_transactions_project_date ON transactions(project_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_card_date ON transactions(card_id, date DESC);

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

-- Partial indexes for active records only
CREATE INDEX IF NOT EXISTS idx_active_projects ON projects(id, status, date DESC) 
WHERE status NOT IN ('Selesai', 'Dibatalkan');

CREATE INDEX IF NOT EXISTS idx_unpaid_projects ON projects(id, client_id, payment_status) 
WHERE payment_status != 'Lunas';

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_dashboard ON projects(status, date DESC, payment_status, progress);

-- Index for financial queries
CREATE INDEX IF NOT EXISTS idx_transactions_financial ON transactions(date DESC, type, amount, card_id);

COMMENT ON INDEX idx_projects_client_status IS 'Optimizes client project queries';
COMMENT ON INDEX idx_projects_dashboard IS 'Optimizes dashboard aggregate queries';
COMMENT ON INDEX idx_active_projects IS 'Partial index for active projects only';