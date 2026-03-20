import { calcPriority, formatDate, getDifficultyClassName } from '../../lib/assignment';
import type { Assignment } from '../../types';

interface AssignmentDetailModalProps {
  assignment: Assignment | null;
  onClose: () => void;
}

export function AssignmentDetailModal({ assignment, onClose }: AssignmentDetailModalProps) {
  if (!assignment) return null;
  const priority = calcPriority(assignment);

  return (
    <div className="overlay show" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-head">
          <div className="modal-title">{assignment.name}</div>
          <button className="modal-close" type="button" onClick={onClose}>x</button>
        </div>
        <div className="detail-row"><span className="detail-key">Class</span><span className="detail-val">{assignment.cls || '-'}</span></div>
        <div className="detail-row"><span className="detail-key">Description</span><span className="detail-val detail-pre">{assignment.desc || 'No description'}</span></div>
        <div className="detail-row"><span className="detail-key">Assign Date</span><span className="detail-val">{formatDate(assignment.ad)}</span></div>
        <div className="detail-row"><span className="detail-key">Due Date</span><span className="detail-val emphasis">{formatDate(assignment.due)}</span></div>
        <div className="detail-row"><span className="detail-key">Difficulty</span><span className="detail-val"><span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>{assignment.difficulty}</span></span></div>
        <div className="detail-row"><span className="detail-key">Priority</span><span className="detail-val"><span className={`prio-badge prio-${priority.color}`}>{priority.score}</span></span></div>
      </div>
    </div>
  );
}
