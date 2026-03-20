import { formatDate, abbreviateClass, getDifficultyClassName } from '../../lib/assignment';
import type { Assignment } from '../../types';

interface SimpleTableViewProps {
  id: string;
  title: string;
  subtitle: string;
  accentClass: string;
  assignments: Assignment[];
  showDifficulty?: boolean;
  emptyMessage: string;
}

export function SimpleTableView(props: SimpleTableViewProps) {
  return (
    <div className="view active">
      <div className="simple-view-card">
        <div className="view-title">{props.title}</div>
        <div className="view-sub">{props.subtitle}</div>
        <div className="ft-table-wrap">
          <table id={props.id}>
            <thead>
              <tr className={props.accentClass}>
                <th>Class</th>
                <th>Name</th>
                <th>Due</th>
                {props.showDifficulty ? <th>Difficulty</th> : null}
              </tr>
            </thead>
            <tbody>
              {props.assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{abbreviateClass(assignment.cls)}</td>
                  <td>{assignment.name}</td>
                  <td>{formatDate(assignment.due)}</td>
                  {props.showDifficulty ? <td><span className={`diff-badge ${getDifficultyClassName(assignment.difficulty)}`}>{assignment.difficulty}</span></td> : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!props.assignments.length ? <div className="simple-empty">{props.emptyMessage}</div> : null}
        </div>
      </div>
    </div>
  );
}
