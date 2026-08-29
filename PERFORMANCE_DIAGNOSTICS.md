# EcomEdge HRIS Enterprise Performance, Latency & Database Optimization Guide
**Architectural Blueprint & Diagnostic Toolkit (Inspired by HR PLN High-Volume Systems)**

---

## 1. Query Execution Plan Deep Dive: `EXPLAIN (ANALYZE, BUFFERS)`

When auditing database queries in PostgreSQL, never rely on execution time alone. Always run:
```sql
EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE)
SELECT id, user_id, action, resource_type, created_at
FROM system_audit_logs
WHERE resource_type = 'employee' AND created_at >= '2026-08-01'
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

### Execution Plan Checklist & Red Flags:
| Plan Node / Indicator | Status | Root Cause & Resolution |
| :--- | :--- | :--- |
| `Seq Scan on system_audit_logs` | 🔴 Critical | Missing index on `(resource_type, created_at)`. PostgreSQL is scanning every block on disk. |
| `Filter: (created_at >= ...)` | ⚠️ Warning | Filtering is done after fetching rows into memory rather than seeking directly inside the B-Tree index. |
| `Sort Method: external merge Disk` | 🔴 Critical | Work memory (`work_mem`) exceeded. Sort spilled to disk. Increase `work_mem` or utilize an index matching the `ORDER BY` clause. |
| `Buffers: shared read=8420, hit=12` | ⚠️ Warning | Cache miss; query reading cold blocks from slow disk/NVMe rather than RAM (`shared_buffers`). |
| `Index Only Scan using idx_sys_audit_resource` | 🟢 Optimal | Zero table heap fetches needed; all data served directly from index pages in memory. |

---

## 2. Cursor-Based vs. Offset-Based Pagination Benchmark

### The `OFFSET` Bottleneck (Why Offset Fails at Scale):
```sql
-- ❌ BAD: Scans and discards 250,000 rows before returning 50
SELECT * FROM system_audit_logs
ORDER BY created_at DESC, id DESC
LIMIT 50 OFFSET 250000;
```
* **Execution Complexity:** $O(N)$ where $N = \text{OFFSET} + \text{LIMIT}$.
* **Disk I/O:** Reads thousands of buffer pages only to drop them.
* **Latency Profile:** Page 1 = 2ms, Page 5,000 = 1,450ms.

### The Keyset / Cursor Solution (Constant Time $O(\log N)$):
```sql
-- 🟢 OPTIMAL: Seeks directly to the exact B-Tree leaf node in 0.4ms
SELECT id, user_id, username, action, resource_type, resource_id, diff, created_at
FROM system_audit_logs
WHERE (created_at < '2026-08-29 04:12:00+00' 
   OR (created_at = '2026-08-29 04:12:00+00' AND id < 84210))
ORDER BY created_at DESC, id DESC
LIMIT 50;
```
* **Index Utilized:** `CREATE INDEX idx_system_audit_cursor ON system_audit_logs (created_at DESC, id DESC);`
* **Execution Complexity:** $O(\log N)$ via index seek.
* **Latency Profile:** Page 1 = 0.4ms, Page 5,000 = 0.4ms.

---

## 3. PostgreSQL DBA Diagnostic Toolkit: Live Production Queries

Run these step-by-step diagnostic queries to pinpoint real-time database bottlenecks:

### Query 1: Top 10 Slowest Queries in the System (`pg_stat_statements`)
```sql
SELECT 
    query,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
    ROUND((100.0 * total_exec_time / SUM(total_exec_time) OVER())::numeric, 2) AS percentage_overall_time,
    rows
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Query 2: Active Connection Starvation & Long-Running Blocked Queries
```sql
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    usename,
    state,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND (now() - query_start) > INTERVAL '2 seconds'
ORDER BY duration DESC;
```

### Query 3: Table Lock Contention & Deadlock Diagnosis
```sql
SELECT 
    blocked_locks.pid     AS blocked_pid,
    blocked_activity.usename  AS blocked_user,
    blocking_locks.pid    AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query    AS blocked_statement,
    blocking_activity.query   AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### Query 4: Buffer Cache Hit Ratio (Diagnosing RAM / shared_buffers)
*Target: $> 99\%$ hit ratio. If $< 95\%$, queries are bottlenecked by disk reading.*
```sql
SELECT 
    ROUND(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 3) AS table_cache_hit_ratio,
    ROUND(100.0 * sum(idx_blks_hit) / (sum(idx_blks_hit) + sum(idx_blks_read)), 3) AS index_cache_hit_ratio
FROM pg_statio_user_tables;
```

### Query 5: Table Bloat & Dead Tuples (Deadlock & Storage Inefficiency)
```sql
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_ratio,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

### Query 6: Unused & Redundant Indexes (Eliminating Write Overhead)
```sql
SELECT 
    schemaname || '.' || relname AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    idx_scan AS number_of_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique
  AND idx_scan = 0
ORDER BY pg_relation_size(i.indexrelid) DESC;
```

---

## 4. Cache & Session Architecture: Eradicating Cache Stampedes

### The Cache Stampede Problem:
When a popular cache key (e.g. `emp:directory` or `rbac:permissions`) expires under 500 concurrent requests/sec, all 500 requests experience a cache miss simultaneously and flood PostgreSQL with identical expensive SQL queries, resulting in connection pool exhaustion.

### Solution 1: Probabilistic Early Expiration (XFetch Algorithm)
Instead of waiting for hard TTL expiry, client requests probabilistically compute the value in the background:
$$\text{Recompute If: } -\Delta \cdot \beta \cdot \ln(\text{random}()) > \text{Remaining TTL}$$
Where:
- $\Delta$: Time in ms to execute the SQL query.
- $\beta$: Eagerness factor ($\beta = 1.0$).
- $\text{random}()$: Uniform random value $\in (0, 1]$.

### Solution 2: In-Flight Promise Single-Flight Mutex
The `cacheService.js` in this codebase guarantees that even on a cold cache miss, only **1** query is dispatched to the database. All other 499 concurrent requests await the identical Promise resolving simultaneously.

---

## 5. Automated Table Partitioning & Archival Runbook

### Why Range Partitioning by Month?
1. **Partition Pruning:** Queries targeting `WHERE created_at >= '2026-08-01'` completely skip scanning the partition files for `2026-01`, `2026-02`, etc.
2. **Instant Archival:** Detaching a monthly partition with 5,000,000 rows takes **0 milliseconds** (`ALTER TABLE system_audit_logs DETACH PARTITION ...`) compared to a devastating `DELETE FROM system_audit_logs WHERE created_at < ...` which causes catastrophic table locking and transaction log bloat.

### Monthly Maintenance Schedule:
Run via PostgreSQL `pg_cron` or backend scheduler on the 1st of every month:
```sql
-- Creates partitions for the next 3 months ahead and scans for partitions older than 12 months
SELECT manage_audit_partitions(3, 12);
```

---

## 6. Node.js Event Loop & Memory Profiling Checklist

1. **Unref'd Background Timers:** Ensure all periodic cleanup timers (`setInterval`) call `.unref()` so they do not artificially keep Node.js worker threads alive during graceful restarts.
2. **Backpressure in Audit Queue:** The in-memory audit queue caps at `5,000` items with ring buffer trimming to prevent out-of-memory (`OOM`) crashes during prolonged database downtime.
3. **Event Loop Lag Monitoring:**
```javascript
const { monitorEventLoopDelay } = require('perf_hooks');
const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  const lagMs = h.mean / 1e6;
  if (lagMs > 50) {
    console.warn(`⚠️ [High Event Loop Lag]: ${lagMs.toFixed(2)}ms`);
  }
  h.reset();
}, 10000).unref();
```
