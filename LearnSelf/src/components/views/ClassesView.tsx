import { DIFFICULTIES } from '../../constants';
import { formatDate, formatTimeLabel } from '../../lib/assignment';
import type { ClassAssignmentTemplate, ClassRoom, Difficulty, StatusMessage } from '../../types';

interface ClassesViewProps {
  classes: ClassRoom[];
  assignments: ClassAssignmentTemplate[];
  loading: boolean;
  status: StatusMessage | null;
  newClassName: string;
  newClassCode: string;
  newClassDescription: string;
  assignmentClassId: string;
  assignmentName: string;
  assignmentDescription: string;
  assignmentDueDate: string;
  assignmentDueTime: string;
  assignmentDifficulty: '' | Difficulty;
  onNewClassNameChange: (value: string) => void;
  onNewClassCodeChange: (value: string) => void;
  onNewClassDescriptionChange: (value: string) => void;
  onCreateClass: () => void;
  onAssignmentClassIdChange: (value: string) => void;
  onAssignmentNameChange: (value: string) => void;
  onAssignmentDescriptionChange: (value: string) => void;
  onAssignmentDueDateChange: (value: string) => void;
  onAssignmentDueTimeChange: (value: string) => void;
  onAssignmentDifficultyChange: (value: '' | Difficulty) => void;
  onAssign: () => void;
}

export function ClassesView(props: ClassesViewProps) {
  return (
    <div className="view active">
      <div className="simple-view-card classes-card">
        <div className="view-title">Classes</div>
        <div className="view-sub">Teacher workspace: create classes and assign work to every student in one click.</div>

        <div className="classes-grid">
          <div className="classes-panel">
            <div className="view-title profile-edit-title">Create Class</div>
            <div className="modal-field">
              <label className="modal-label">Class Name *</label>
              <input className="modal-input" value={props.newClassName} onChange={(event) => props.onNewClassNameChange(event.target.value)} placeholder="e.g. Math 10A" />
            </div>
            <div className="modal-field">
              <label className="modal-label">Class Code *</label>
              <input className="modal-input" value={props.newClassCode} onChange={(event) => props.onNewClassCodeChange(event.target.value)} placeholder="e.g. MATH10A" />
            </div>
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <textarea className="modal-textarea" value={props.newClassDescription} onChange={(event) => props.onNewClassDescriptionChange(event.target.value)} />
            </div>
            <button className={`modal-submit ${props.loading ? 'btn-loading' : ''}`} type="button" disabled={props.loading} onClick={props.onCreateClass}>
              Create Class
            </button>
          </div>

          <div className="classes-panel">
            <div className="view-title profile-edit-title">Create Class Assignment</div>
            <div className="modal-field">
              <label className="modal-label">Class *</label>
              <select className="modal-select" value={props.assignmentClassId} onChange={(event) => props.onAssignmentClassIdChange(event.target.value)}>
                <option value="">- Select class -</option>
                {props.classes.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>{classItem.name} ({classItem.studentCount} students)</option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label className="modal-label">Assignment Name *</label>
              <input className="modal-input" value={props.assignmentName} onChange={(event) => props.onAssignmentNameChange(event.target.value)} placeholder="e.g. Chapter 3 Worksheet" />
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">Due Date *</label>
                <input className="modal-input" type="date" value={props.assignmentDueDate} onChange={(event) => props.onAssignmentDueDateChange(event.target.value)} />
              </div>
              <div className="modal-field">
                <label className="modal-label">Due Time</label>
                <input className="modal-input" type="time" value={props.assignmentDueTime} onChange={(event) => props.onAssignmentDueTimeChange(event.target.value)} />
              </div>
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">Difficulty *</label>
                <select className="modal-select" value={props.assignmentDifficulty} onChange={(event) => props.onAssignmentDifficultyChange(event.target.value as '' | Difficulty)}>
                  <option value="">- Select -</option>
                  {DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Description</label>
              <textarea className="modal-textarea" value={props.assignmentDescription} onChange={(event) => props.onAssignmentDescriptionChange(event.target.value)} />
            </div>
            <button className={`modal-submit ${props.loading ? 'btn-loading' : ''}`} type="button" disabled={props.loading} onClick={props.onAssign}>
              Assign To Whole Class
            </button>
          </div>
        </div>

        {props.status?.text ? <div className={`status-banner ${props.status.tone}`}>{props.status.text}</div> : null}

        <div className="classes-list-wrap">
          <div className="view-title profile-edit-title">My Classes</div>
          {props.classes.length ? props.classes.map((item) => (
            <div key={item.id} className="classes-list-item">
              <div>
                <strong>{item.name}</strong> <span className="classes-code">({item.code})</span>
                <div className="view-sub">{item.description || 'No class description yet.'}</div>
              </div>
              <div className="classes-students">{item.studentCount} students</div>
            </div>
          )) : <div className="simple-empty">No classes yet.</div>}
        </div>

        <div className="classes-list-wrap">
          <div className="view-title profile-edit-title">Recent Class Assignments</div>
          {props.assignments.length ? props.assignments.map((assignment) => (
            <div key={assignment.id} className="classes-list-item">
              <div>
                <strong>{assignment.name}</strong> <span className="classes-code">({assignment.className})</span>
                <div className="view-sub">Due {formatDate(assignment.due)} at {formatTimeLabel(assignment.dueTime)}</div>
              </div>
              <span className="diff-badge">{assignment.difficulty}</span>
            </div>
          )) : <div className="simple-empty">No class assignments yet.</div>}
        </div>
      </div>
    </div>
  );
}
