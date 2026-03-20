import { DIFFICULTIES } from '../../constants';
import type { AssignmentFormValues } from '../../types';

interface AddAssignmentModalProps {
  open: boolean;
  values: AssignmentFormValues;
  errors: Partial<Record<keyof AssignmentFormValues, string>>;
  loading: boolean;
  onClose: () => void;
  onChange: <K extends keyof AssignmentFormValues>(field: K, value: AssignmentFormValues[K]) => void;
  onSubmit: () => void;
}

export function AddAssignmentModal(props: AddAssignmentModalProps) {
  if (!props.open) return null;

  return (
    <div className="overlay show" onClick={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">New Assignment</div>
          <button className="modal-close" type="button" onClick={props.onClose}>x</button>
        </div>

        <div className="modal-field">
          <label className="modal-label" htmlFor="f-name">Name *</label>
          <input className="modal-input" id="f-name" type="text" placeholder="e.g. Chapter 5 Summary" value={props.values.name} onChange={(e) => props.onChange('name', e.target.value)} />
          {props.errors.name ? <div className="field-error show">{props.errors.name}</div> : null}
        </div>

        <div className="modal-row">
          <div className="modal-field">
            <label className="modal-label" htmlFor="f-class">Class</label>
            <input className="modal-input" id="f-class" type="text" placeholder="e.g. Study Skills" value={props.values.cls} onChange={(e) => props.onChange('cls', e.target.value)} />
          </div>
          <div className="modal-field">
            <label className="modal-label" htmlFor="f-diff">Difficulty *</label>
            <select className="modal-select" id="f-diff" value={props.values.difficulty} onChange={(e) => props.onChange('difficulty', e.target.value as AssignmentFormValues['difficulty'])}>
              <option value="">- Select -</option>
              {DIFFICULTIES.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
            </select>
            {props.errors.difficulty ? <div className="field-error show">{props.errors.difficulty}</div> : null}
          </div>
        </div>

        <div className="modal-row">
          <div className="modal-field">
            <label className="modal-label" htmlFor="f-ad">Assign Date</label>
            <input className="modal-input" id="f-ad" type="date" value={props.values.ad} onChange={(e) => props.onChange('ad', e.target.value)} />
          </div>
          <div className="modal-field">
            <label className="modal-label" htmlFor="f-due">Due Date *</label>
            <input className="modal-input" id="f-due" type="date" value={props.values.due} onChange={(e) => props.onChange('due', e.target.value)} />
            {props.errors.due ? <div className="field-error show">{props.errors.due}</div> : null}
          </div>
        </div>

        <div className="modal-field">
          <label className="modal-label" htmlFor="f-desc">Description</label>
          <textarea className="modal-textarea" id="f-desc" placeholder="Optional notes about this assignment..." value={props.values.desc} onChange={(e) => props.onChange('desc', e.target.value)} />
        </div>

        <button className={`modal-submit ${props.loading ? 'btn-loading' : ''}`} type="button" onClick={props.onSubmit} disabled={props.loading}>
          {props.loading ? 'Saving assignment...' : 'Add Assignment'}
        </button>
      </div>
    </div>
  );
}
