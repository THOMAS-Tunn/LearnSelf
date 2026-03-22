import { useEffect, useRef, useState } from 'react';
import { abbreviateClass, formatDate, getDifficultyClassName } from '../../lib/assignment';
import type { Assignment } from '../../types';

interface SimpleTableViewProps {
  id: string;
  title: string;
  subtitle: string;
  accentClass: string;
  assignments: Assignment[];
  showDifficulty?: boolean;
  emptyMessage: string;
  selectedIds?: string[];
  onToggleSelected?: (id: string, checked: boolean) => void;
  onToggleSelectAll?: (checked: boolean) => void;
  onBulkDelete?: () => void;
  deleteLabel?: string;
}

export function SimpleTableView(props: SimpleTableViewProps) {
  const deleteTimeoutRef = useRef<number | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const canDelete = Boolean(
    props.selectedIds
    && props.onToggleSelected
    && props.onToggleSelectAll
    && props.onBulkDelete
  );
  const visibleSelectedIds = canDelete
    ? props.assignments
      .filter((assignment) => props.selectedIds!.includes(assignment.id))
      .map((assignment) => assignment.id)
    : [];
  const allChecked = props.assignments.length > 0 && visibleSelectedIds.length === props.assignments.length;

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

  function handleBulkDelete() {
    if (!props.onBulkDelete || !visibleSelectedIds.length) {
      return;
    }

    setDeletingIds(new Set(visibleSelectedIds));

    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current);
    }

    deleteTimeoutRef.current = window.setTimeout(() => {
      props.onBulkDelete?.();
      deleteTimeoutRef.current = null;
    }, 420);
  }

  return (
    <div className="view active">
      <div className="simple-view-card">
        {canDelete ? (
          <div className="dash-top">
            <div className={`bulk-actions ${visibleSelectedIds.length ? 'show' : ''}`}>
              <button className="action-pill del" type="button" onClick={handleBulkDelete}>
                {props.deleteLabel || 'Delete'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="view-title">{props.title}</div>
        <div className="view-sub">{props.subtitle}</div>

        <div className="ft-table-wrap">
          <table id={props.id}>
            <thead>
              <tr className={props.accentClass}>
                {canDelete ? (
                  <th>
                    <input
                      type="checkbox"
                      className="cb"
                      checked={allChecked}
                      onChange={(event) => props.onToggleSelectAll?.(event.target.checked)}
                    />
                  </th>
                ) : null}
                <th>Class</th>
                <th>Name</th>
                <th>Due</th>
                {props.showDifficulty ? <th>Difficulty</th> : null}
              </tr>
            </thead>
            <tbody>
              {props.assignments.map((assignment) => (
                <tr
                  key={assignment.id}
                  className={deletingIds.has(assignment.id) ? 'row-anim-delete' : ''}
                >
                  {canDelete ? (
                    <td>
                      <input
                        type="checkbox"
                        className="cb"
                        checked={props.selectedIds?.includes(assignment.id) || false}
                        onChange={(event) => props.onToggleSelected?.(assignment.id, event.target.checked)}
                      />
                    </td>
                  ) : null}
                  <td>{abbreviateClass(assignment.cls)}</td>
                  <td>{assignment.name}</td>
                  <td>{formatDate(assignment.due)}</td>
                  {props.showDifficulty ? (
                    <td>
                      <span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>
                        {assignment.difficulty}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!props.assignments.length ? (
            <div className="simple-empty">{props.emptyMessage}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
