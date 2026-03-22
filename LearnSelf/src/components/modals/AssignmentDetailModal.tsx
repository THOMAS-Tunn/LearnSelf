import {
  formatDate,
  formatRepeatSummary,
  getDifficultyClassName,
  isPastDueDate,
  type AssignmentPriority
} from '../../lib/assignment';
import type { Assignment } from '../../types';

interface AssignmentDetailModalProps {
  assignment: Assignment | null;
  priority: AssignmentPriority | null;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AssignmentDetailModal({ assignment, priority, onClose }: AssignmentDetailModalProps) {
  if (!assignment) return null;
  const isPastDue = isPastDueDate(assignment.due);

  return (
    <div className="overlay show" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-head">
          <div className="modal-title">{assignment.name}</div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="detail-row"><span className="detail-key">Class</span><span className="detail-val">{assignment.cls || '-'}</span></div>
        <div className="detail-row"><span className="detail-key">Description</span><span className="detail-val detail-pre">{assignment.desc || 'No description'}</span></div>
        <div className="detail-row"><span className="detail-key">Assign Date</span><span className="detail-val">{formatDate(assignment.ad)}</span></div>
        <div className="detail-row"><span className="detail-key">Due Date</span><span className={`detail-val emphasis ${isPastDue ? 'is-overdue' : ''}`}>{formatDate(assignment.due)}</span></div>
        <div className="detail-row"><span className="detail-key">Difficulty</span><span className="detail-val"><span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>{assignment.difficulty}</span></span></div>
        {assignment.repeatEnabled ? (
          <div className="detail-row"><span className="detail-key">Repeat</span><span className="detail-val detail-pre">{formatRepeatSummary(assignment)}{assignment.repeatTimezone ? ` (${assignment.repeatTimezone})` : ''}</span></div>
        ) : null}
        <div className="detail-row"><span className="detail-key">Priority</span><span className="detail-val">{priority ? <span className={`prio-badge prio-${priority.color}`}>{priority.score}</span> : '-'}</span></div>
      </div>
    </div>
  );
}
