import { useEffect, useRef, useState } from 'react';
import {
  abbreviateClass,
  calcPriority,
  formatDate,
  getDifficultyClassName
} from '../../lib/assignment';
import { InfoTip } from '../common/InfoTip';
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

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M1.5 6L4.5 9L10.5 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardView(props: DashboardViewProps) {
  const finishTimeoutRef = useRef<number | null>(null);
  const deleteTimeoutRef = useRef<number | null>(null);
  const visibleSelectedCount = props.assignments.filter((assignment) => (
    props.selectedIds.includes(assignment.id)
  )).length;
  const allChecked = props.assignments.length > 0 && visibleSelectedCount === props.assignments.length;
  const hasAssignments = props.assignments.length > 0;
  const [finishingIds, setFinishingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        window.clearTimeout(finishTimeoutRef.current);
      }
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  function handleBulkFinish() {
    if (!visibleSelectedCount) {
      return;
    }

    setFinishingIds(new Set(props.selectedIds));

    if (finishTimeoutRef.current) {
      window.clearTimeout(finishTimeoutRef.current);
    }

    finishTimeoutRef.current = window.setTimeout(() => {
      props.onBulkFinish();
      finishTimeoutRef.current = null;
    }, 480);
  }

  function handleBulkDelete() {
    if (!visibleSelectedCount) {
      return;
    }

    setDeletingIds(new Set(props.selectedIds));

    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current);
    }

    deleteTimeoutRef.current = window.setTimeout(() => {
      props.onBulkDelete();
      deleteTimeoutRef.current = null;
    }, 420);
  }

  return (
    <div className="view active" id="view-dashboard">
      <div className="dash-top">
        <div className={`bulk-actions ${visibleSelectedCount ? 'show' : ''}`}>
          <button className="action-pill finish" type="button" onClick={handleBulkFinish}>
            <CheckIcon /> Mark Finished
          </button>
          <button className="action-pill del" type="button" onClick={handleBulkDelete}>
            <CloseIcon /> Delete
          </button>
        </div>
        <button
          className="add-btn"
          type="button"
          title="Add assignment"
          aria-label="Add assignment"
          onClick={props.onOpenAddModal}
        >
          <span className="add-btn-glyph" aria-hidden="true">
            +
          </span>
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  className="cb"
                  checked={allChecked}
                  onChange={(event) => props.onToggleSelectAll(event.target.checked)}
                />
              </th>
              <th>
                Priority
                <InfoTip
                  text="Calculated from due date x difficulty. Red = urgent, yellow = soon, green = on track."
                  placement="bottom"
                />
              </th>
              <th>Class</th>
              <th>Name</th>
              <th>Description</th>
              <th>AD</th>
              <th>
                Due
                <InfoTip text="Due date. Click any row to see full details." placement="bottom" />
              </th>
              <th>Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {props.assignments.map((assignment) => {
              const priority = calcPriority(assignment);
              const isFinishing = finishingIds.has(assignment.id);
              const isDeleting = deletingIds.has(assignment.id);

              return (
                <tr
                  key={assignment.id}
                  className={[
                    isFinishing ? 'row-anim-finish' : '',
                    isDeleting ? 'row-anim-delete' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => props.onOpenDetails(assignment)}
                >
                  <td onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="cb"
                      checked={props.selectedIds.includes(assignment.id)}
                      onChange={(event) => props.onToggleSelected(assignment.id, event.target.checked)}
                    />
                  </td>
                  <td>
                    <span className={`prio-badge prio-${priority.color}`}>{priority.score}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{abbreviateClass(assignment.cls)}</td>
                  <td className="name-cell" title={assignment.name}>
                    {assignment.name}
                  </td>
                  <td className="desc-cell" title={assignment.desc}>
                    {assignment.desc || '-'}
                  </td>
                  <td>{formatDate(assignment.ad)}</td>
                  <td className="due-cell">{formatDate(assignment.due)}</td>
                  <td>
                    <span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>
                      {assignment.difficulty}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!hasAssignments ? (
          <div className="empty-state">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <rect x="8" y="6" width="32" height="38" rx="4" stroke="#2E2C28" strokeWidth="2" />
              <line
                x1="15"
                y1="16"
                x2="33"
                y2="16"
                stroke="#2E2C28"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="15"
                y1="22"
                x2="33"
                y2="22"
                stroke="#2E2C28"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="15"
                y1="28"
                x2="26"
                y2="28"
                stroke="#2E2C28"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <p>
              No assignments yet - hit <strong>+</strong> to add one.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
