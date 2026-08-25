import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Clock,
  PlayCircle,
  Coffee,
  CheckCircle2,
  StopCircle,
  X,
  Sparkles,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function PunchClockModal({ isOpen, onClose }) {
  const { todayPunch, punchAction, user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedWorkingSeconds, setElapsedWorkingSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live elapsed working time
  useEffect(() => {
    if (!todayPunch || !todayPunch.clock_in || todayPunch.status === 'clocked_out') {
      setElapsedWorkingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const inTime = new Date(todayPunch.clock_in).getTime();
      const now = Date.now();

      let breakMs = 0;
      if (todayPunch.break_start && todayPunch.break_end) {
        breakMs = new Date(todayPunch.break_end).getTime() - new Date(todayPunch.break_start).getTime();
      } else if (todayPunch.break_start && !todayPunch.break_end) {
        breakMs = now - new Date(todayPunch.break_start).getTime();
      }

      const workedMs = Math.max(0, now - inTime - breakMs);
      setElapsedWorkingSeconds(Math.floor(workedMs / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [todayPunch]);

  if (!isOpen) return null;

  const formatElapsed = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleAction = async (action) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await punchAction(action, notes);
      setNotes('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const status = todayPunch ? todayPunch.status : 'clocked_out';

  const formatTimeStr = (iso) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem' }}>Punch Clock & Shift Tracker</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '2rem 1.75rem' }}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem'
            }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Digital Clock Display */}
          <div style={{
            textAlign: 'center',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem 1.25rem',
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}>
              <Calendar size={16} />
              <span>
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="digital-clock-display" style={{ margin: '0.5rem 0' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            {/* Current Status Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
              <div className={`punch-status-badge ${status}`}>
                <span className={`status-dot ${status}`} />
                <span>
                  {status === 'clocked_in' && 'Currently Working (Clocked In)'}
                  {status === 'on_break' && 'On Lunch / Break'}
                  {status === 'clocked_out' && 'Shift Ended (Clocked Out)'}
                </span>
              </div>
            </div>

            {status !== 'clocked_out' && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                fontWeight: '600'
              }}>
                Elapsed Working Time: <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: '700' }}>{formatElapsed(elapsedWorkingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Punch Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.5rem' }}>
            {/* 1. Clock In */}
            <button
              className="btn btn-success"
              disabled={submitting || status === 'clocked_in' || status === 'on_break'}
              onClick={() => handleAction('clock_in')}
              style={{ padding: '1rem', flexDirection: 'column', gap: '0.3rem', opacity: (status === 'clocked_in' || status === 'on_break') ? 0.4 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PlayCircle size={20} />
                <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>Time In</span>
              </div>
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>Start Shift</span>
            </button>

            {/* 2. Start Break / Lunch */}
            <button
              className="btn btn-warning"
              disabled={submitting || status !== 'clocked_in'}
              onClick={() => handleAction('break_start')}
              style={{ padding: '1rem', flexDirection: 'column', gap: '0.3rem', opacity: status !== 'clocked_in' ? 0.4 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Coffee size={20} />
                <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>Lunch / Break</span>
              </div>
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>Pause for Rest</span>
            </button>

            {/* 3. End Break */}
            <button
              className="btn btn-primary"
              disabled={submitting || status !== 'on_break'}
              onClick={() => handleAction('break_end')}
              style={{ padding: '1rem', flexDirection: 'column', gap: '0.3rem', opacity: status !== 'on_break' ? 0.4 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={20} />
                <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>End Break</span>
              </div>
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>Resume Work</span>
            </button>

            {/* 4. Clock Out */}
            <button
              className="btn btn-danger"
              disabled={submitting || status === 'clocked_out'}
              onClick={() => handleAction('clock_out')}
              style={{ padding: '1rem', flexDirection: 'column', gap: '0.3rem', opacity: status === 'clocked_out' ? 0.4 : 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <StopCircle size={20} />
                <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>Time Out</span>
              </div>
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>End of Shift</span>
            </button>
          </div>

          {/* Optional Notes */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Shift Notes / Activity Summary (Optional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Completed inventory audit, team standup..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Today's Timeline Record */}
          {todayPunch && (
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem'
            }}>
              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                Today's Recorded Punches
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Clock In</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--success)' }}>
                    {formatTimeStr(todayPunch.clock_in)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Break Start</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--warning)' }}>
                    {formatTimeStr(todayPunch.break_start)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Break End</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--info)' }}>
                    {formatTimeStr(todayPunch.break_end)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Clock Out</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--danger)' }}>
                    {formatTimeStr(todayPunch.clock_out)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
