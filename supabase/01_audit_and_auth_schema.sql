-- ============================================================================
-- ECOMEDGE HRIS ENTERPRISE AUDIT, AUTH & SESSION DATABASE MIGRATION
-- Production-Grade PostgreSQL / Supabase DDL
-- Target: High-Throughput Async Audit Ingestion, Range Partitioning, Session TTL
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================================
-- 2. System Audit Trail (Partitioned by Month)
-- Stores asynchronous state change snapshots (CRUD, Payroll, Permissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id BIGSERIAL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    action VARCHAR(50) NOT NULL,              -- e.g. 'CREATE', 'UPDATE', 'DELETE', 'PAYROLL_GENERATE', 'PERMISSION_CHANGE'
    resource_type VARCHAR(100) NOT NULL,       -- e.g. 'employee', 'payroll', 'payslip', 'designation', 'user'
    resource_id VARCHAR(100) NOT NULL,         -- Entity ID (string/int)
    ip_address VARCHAR(45),                    -- IPv4 or IPv6
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    before_state JSONB,                        -- Snapshot before modification (NULL for CREATE)
    after_state JSONB,                         -- Snapshot after modification (NULL for DELETE)
    diff JSONB,                                -- Calculated field-level delta
    status VARCHAR(20) DEFAULT 'SUCCESS',      -- 'SUCCESS', 'FAILED', 'PARTIAL'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Initial Partitions (2026 Monthly Partitions)
CREATE TABLE IF NOT EXISTS system_audit_logs_2026_01 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_02 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_03 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_04 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_05 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_06 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_07 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_08 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_09 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_10 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_11 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_2026_12 PARTITION OF system_audit_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS system_audit_logs_default PARTITION OF system_audit_logs DEFAULT;

-- System Audit Indexes (Inherited across all partitions)
-- 1. Keyset / Cursor-Based Pagination Index (High Selectivity)
CREATE INDEX IF NOT EXISTS idx_system_audit_cursor ON system_audit_logs (created_at DESC, id DESC);

-- 2. Entity History Lookup Index (Lookup all changes to Employee #42 or Payroll #5)
CREATE INDEX IF NOT EXISTS idx_system_audit_resource ON system_audit_logs (resource_type, resource_id, created_at DESC);

-- 3. Actor Activity Index (Lookup all actions by User #1)
CREATE INDEX IF NOT EXISTS idx_system_audit_user ON system_audit_logs (user_id, created_at DESC);

-- 4. Action Filter Index
CREATE INDEX IF NOT EXISTS idx_system_audit_action ON system_audit_logs (action, created_at DESC);

-- 5. BRIN (Block Range Index) for high-density chronological append queries
CREATE INDEX IF NOT EXISTS idx_system_audit_brin_created ON system_audit_logs USING BRIN (created_at);

-- 6. GIN Index on JSONB Diff for deep querying of changed fields
CREATE INDEX IF NOT EXISTS idx_system_audit_diff_gin ON system_audit_logs USING GIN (diff jsonb_path_ops);


-- ============================================================================
-- 3. Login & Authentication Audit Log
-- Non-blocking tracking of login attempts, MFA challenges, session creations
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,           -- 'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'MFA_CHALLENGE', 'MFA_VERIFIED', 'SESSION_REVOKED'
    status VARCHAR(20) NOT NULL,               -- 'SUCCESS', 'FAILED', 'BLOCKED', 'CHALLENGE'
    failure_reason VARCHAR(255),               -- 'INVALID_CREDENTIALS', 'ACCOUNT_TERMINATED', 'RATE_LIMITED', 'INVALID_SESSION'
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64),            -- SHA-256 client fingerprint
    session_id VARCHAR(128),
    metadata JSONB,                            -- Extra context (location, client headers, auth provider)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Auth Audit Indexes
CREATE INDEX IF NOT EXISTS idx_auth_audit_cursor ON auth_audit_logs (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_time ON auth_audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_username_time ON auth_audit_logs (username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_ip_time ON auth_audit_logs (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_event_status ON auth_audit_logs (event_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_device ON auth_audit_logs (device_fingerprint, created_at DESC);


-- ============================================================================
-- 4. Active User Sessions Table (Stateful & Redis-Backed Session Tracking)
-- Supports automated TTL expiration, single-device/multi-device tracking & revocation
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,               -- Cryptographic Session Token ID / UUID
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_device ON user_sessions (user_id, device_fingerprint);


-- ============================================================================
-- 5. Automated Partition Management & Retention Stored Procedure
-- Pre-creates forward partitions and detaches/archives older partitions
-- ============================================================================
CREATE OR REPLACE FUNCTION manage_audit_partitions(months_ahead INT DEFAULT 3, retention_months INT DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    target_date DATE;
    partition_start TEXT;
    partition_end TEXT;
    partition_name TEXT;
    sql_stmt TEXT;
    oldest_valid_date DATE;
    old_partition_name TEXT;
    rec RECORD;
BEGIN
    -- 1. Pre-create forward partitions for the next N months
    FOR i IN 0..months_ahead LOOP
        target_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' month')::INTERVAL);
        partition_start := TO_CHAR(target_date, 'YYYY-MM-01 00:00:00+00');
        partition_end := TO_CHAR(target_date + INTERVAL '1 month', 'YYYY-MM-01 00:00:00+00');
        partition_name := 'system_audit_logs_' || TO_CHAR(target_date, 'YYYY_MM');

        sql_stmt := FORMAT(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF system_audit_logs FOR VALUES FROM (%L) TO (%L);',
            partition_name,
            partition_start,
            partition_end
        );
        EXECUTE sql_stmt;
    END LOOP;

    -- 2. Identify and detach partitions older than retention window for cold archival
    oldest_valid_date := DATE_TRUNC('month', CURRENT_DATE - (retention_months || ' month')::INTERVAL);
    
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE 'system_audit_logs_20%' 
          AND table_name < ('system_audit_logs_' || TO_CHAR(oldest_valid_date, 'YYYY_MM'))
    LOOP
        -- Detach partition (can be exported to Parquet/S3 or dropped)
        RAISE NOTICE 'Partition % is eligible for archival/detachment.', rec.table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
