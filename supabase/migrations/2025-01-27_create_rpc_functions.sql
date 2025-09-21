-- Create RPC functions for Edge Functions to reduce egress

-- Dashboard stats function (simplified for current schema)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalProjects', (
            SELECT COUNT(*) FROM projects
        ),
        'activeProjects', (
            SELECT COUNT(*) FROM projects 
            WHERE status NOT IN ('Selesai', 'Dibatalkan')
        ),
        'completedProjects', (
            SELECT COUNT(*) FROM projects 
            WHERE status = 'Selesai'
        ),
        'totalRevenue', (
            SELECT COALESCE(SUM(amount_paid), 0) FROM projects
        ),
        'pendingPayments', (
            SELECT COALESCE(SUM(total_cost - amount_paid), 0) FROM projects 
            WHERE payment_status != 'Lunas'
        ),
        'monthlyStats', (
            SELECT json_agg(
                json_build_object(
                    'month', TO_CHAR(date_trunc('month', date), 'YYYY-MM'),
                    'projects', COUNT(*),
                    'revenue', COALESCE(SUM(amount_paid), 0)
                )
            )
            FROM projects 
            WHERE date >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY date_trunc('month', date)
            ORDER BY date_trunc('month', date)
        ),
        'statusBreakdown', (
            SELECT json_agg(
                json_build_object(
                    'status', status,
                    'count', COUNT(*),
                    'totalValue', COALESCE(SUM(total_cost), 0)
                )
            )
            FROM projects 
            GROUP BY status
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Project analytics function (simplified for current schema)
CREATE OR REPLACE FUNCTION get_project_analytics(
    days_back INTEGER DEFAULT 30,
    project_type_filter TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'projectsByType', (
            SELECT json_agg(
                json_build_object(
                    'type', project_type,
                    'count', COUNT(*),
                    'avgCost', ROUND(AVG(total_cost), 0),
                    'totalRevenue', COALESCE(SUM(amount_paid), 0)
                )
            )
            FROM projects 
            WHERE date >= CURRENT_DATE - INTERVAL '1 day' * days_back
            AND (project_type_filter IS NULL OR project_type = project_type_filter)
            GROUP BY project_type
        ),
        'paymentTrends', (
            SELECT json_agg(
                json_build_object(
                    'date', date,
                    'totalPaid', COALESCE(SUM(amount_paid), 0),
                    'projectCount', COUNT(*)
                )
            )
            FROM projects 
            WHERE date >= CURRENT_DATE - INTERVAL '1 day' * days_back
            AND (project_type_filter IS NULL OR project_type = project_type_filter)
            GROUP BY date
            ORDER BY date
        ),
        'teamPerformance', (
            SELECT json_agg(
                json_build_object(
                    'teamMemberId', pt.member_id,
                    'memberName', tm.name,
                    'projectCount', COUNT(DISTINCT pt.project_id),
                    'totalEarnings', COALESCE(SUM(tpp.amount), 0)
                )
            )
            FROM project_team pt
            JOIN team_members tm ON tm.id = pt.member_id
            LEFT JOIN team_project_payments tpp ON tpp.project_id = pt.project_id 
                AND tpp.team_member_id = pt.member_id
            JOIN projects p ON p.id = pt.project_id
            WHERE p.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
            AND (project_type_filter IS NULL OR p.project_type = project_type_filter)
            GROUP BY pt.member_id, tm.name
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Financial summary function (simplified for current schema)
CREATE OR REPLACE FUNCTION get_financial_summary(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    calc_start_date DATE;
    calc_end_date DATE;
BEGIN
    calc_start_date := COALESCE(start_date, CURRENT_DATE - INTERVAL '30 days');
    calc_end_date := COALESCE(end_date, CURRENT_DATE);
    
    SELECT json_build_object(
        'totalIncome', (
            SELECT COALESCE(SUM(amount), 0) FROM transactions 
            WHERE type = 'Pemasukan'
            AND date BETWEEN calc_start_date AND calc_end_date
        ),
        'totalExpense', (
            SELECT COALESCE(SUM(amount), 0) FROM transactions 
            WHERE type = 'Pengeluaran'
            AND date BETWEEN calc_start_date AND calc_end_date
        ),
        'netProfit', (
            SELECT COALESCE(
                SUM(CASE WHEN type = 'Pemasukan' THEN amount ELSE -amount END), 0
            ) FROM transactions 
            WHERE date BETWEEN calc_start_date AND calc_end_date
        ),
        'categoryBreakdown', (
            SELECT json_agg(
                json_build_object(
                    'category', category,
                    'type', type,
                    'total', COALESCE(SUM(amount), 0),
                    'count', COUNT(*)
                )
            )
            FROM transactions 
            WHERE date BETWEEN calc_start_date AND calc_end_date
            GROUP BY category, type
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;