import { getDifficultyClassName, calcPriority, formatDate, abbreviateClass } from '../../lib/assignment';
import type { Assignment } from '../../types';

interface DashboardViewProps {
  assignments: Assignment[];
  selectedIds: string[];
  onToggleSelected: (id: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onOpenAddModal: () => void;
  onOpenDetails: (assignment: Assignment) => void;
  onBulkFinish: () => void;
  onBulkDelete: () => void;
}

export function DashboardView(props: DashboardViewProps) {
  const allChecked = props.assignments.length > 0 && props.selectedIds.length === props.assignments.length;
  const hasAssignments = props.assignments.length > 0;

  return (
    <div className="view active" id="view-dashboard">
      <div className="dash-top">
        <div className={`bulk-actions ${props.selectedIds.length ? 'show' : ''}`}>
          <button className="action-pill finish" type="button" onClick={props.onBulkFinish}>Mark Finished</button>
          <button className="action-pill del" type="button" onClick={props.onBulkDelete}>Delete</button>
        </div>
        <button className="add-btn" type="button" title="Add assignment" aria-label="Add assignment" onClick={props.onOpenAddModal}>
          <span className="add-btn-glyph" aria-hidden="true">+</span>
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" className="cb" checked={allChecked} onChange={(e) => props.onToggleSelectAll(e.target.checked)} /></th>
              <th>Priority</th>
              <th>Class</th>
              <th>Name</th>
              <th>Description</th>
              <th>AD</th>
              <th>Due</th>
              <th>Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {props.assignments.map((assignment) => {
              const priority = calcPriority(assignment);
              return (
                <tr key={assignment.id} onClick={() => props.onOpenDetails(assignment)}>
                  <td onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" className="cb" checked={props.selectedIds.includes(assignment.id)} onChange={(e) => props.onToggleSelected(assignment.id, e.target.checked)} />
                  </td>
                  <td><span className={`prio-badge prio-${priority.color}`}>{priority.score}</span></td>
                  <td style={{ fontWeight: 500 }}>{abbreviateClass(assignment.cls)}</td>
                  <td className="name-cell" title={assignment.name}>{assignment.name}</td>
                  <td className="desc-cell" title={assignment.desc}>{assignment.desc || '-'}</td>
                  <td>{formatDate(assignment.ad)}</td>
                  <td className="due-cell">{formatDate(assignment.due)}</td>
                  <td><span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>{assignment.difficulty}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!hasAssignments ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect x="8" y="6" width="32" height="38" rx="4" stroke="#2E2C28" strokeWidth="2" />
              <line x1="15" y1="16" x2="33" y2="16" stroke="#2E2C28" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="22" x2="33" y2="22" stroke="#2E2C28" strokeWidth="2" strokeLinecap="round" />
              <line x1="15" y1="28" x2="26" y2="28" stroke="#2E2C28" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p>No assignments yet - hit <strong>+</strong> to add one.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
