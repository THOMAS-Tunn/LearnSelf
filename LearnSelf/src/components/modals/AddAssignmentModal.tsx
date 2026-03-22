import {
  DIFFICULTIES,
  MONTH_DAY_PICKER_OPTIONS,
  REPEAT_EVERY_OPTIONS,
  WEEKDAY_PICKER_OPTIONS
} from '../../constants';
import { formatRepeatSummary } from '../../lib/assignment';
import type { AssignmentFormValues } from '../../types';
import { DatePicker } from '../common/DatePicker';

interface AddAssignmentModalProps {
  open: boolean;
  values: AssignmentFormValues;
  errors: Partial<Record<keyof AssignmentFormValues, string>>;
  loading: boolean;
  onClose: () => void;
  onChange: <K extends keyof AssignmentFormValues>(field: K, value: AssignmentFormValues[K]) => void;
  onSubmit: () => void;
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AddAssignmentModal(props: AddAssignmentModalProps) {
  if (!props.open) return null;

  function toggleNumberSelection(field: 'repeatDaysOfWeek' | 'repeatDaysOfMonth', value: number) {
    const currentValues = props.values[field];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    props.onChange(field, nextValues as AssignmentFormValues[typeof field]);
  }

  return (
    <div className="overlay show" onClick={(event) => event.target === event.currentTarget && props.onClose()}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">New Assignment</div>
          <button className="modal-close" type="button" onClick={props.onClose} aria-label="Close">
            <CloseIcon />
          </button>
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
            <DatePicker id="f-ad" value={props.values.ad} onChange={(value) => props.onChange('ad', value)} placeholder="Pick assign date" />
          </div>
          <div className="modal-field">
            <label className="modal-label" htmlFor="f-due">Due Date *</label>
            <DatePicker id="f-due" value={props.values.due} onChange={(value) => props.onChange('due', value)} placeholder="Pick due date" required />
            {props.errors.due ? <div className="field-error show">{props.errors.due}</div> : null}
          </div>
        </div>

        <div className="modal-field">
          <label className="modal-label" htmlFor="f-desc">Description</label>
          <textarea className="modal-textarea" id="f-desc" placeholder="Optional notes about this assignment..." value={props.values.desc} onChange={(e) => props.onChange('desc', e.target.value)} />
        </div>

        <div className="repeat-panel">
          <label className="repeat-toggle" htmlFor="f-repeat">
            <input
              className="repeat-toggle-input"
              id="f-repeat"
              type="checkbox"
              checked={props.values.repeatEnabled}
              onChange={(event) => props.onChange('repeatEnabled', event.target.checked)}
            />
            <span className="repeat-toggle-copy">
              <span className="repeat-toggle-title">Repeat</span>
              <span className="repeat-toggle-note">Create future assignments automatically from this template.</span>
            </span>
          </label>

          {props.values.repeatEnabled ? (
            <div className="repeat-builder">
              <div className="modal-row">
                <div className="modal-field">
                  <label className="modal-label" htmlFor="f-repeat-every">Every *</label>
                  <select
                    className="modal-select"
                    id="f-repeat-every"
                    value={props.values.repeatEvery}
                    onChange={(event) => props.onChange('repeatEvery', event.target.value as AssignmentFormValues['repeatEvery'])}
                  >
                    <option value="">- Select -</option>
                    {REPEAT_EVERY_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                  {props.errors.repeatEvery ? <div className="field-error show">{props.errors.repeatEvery}</div> : null}
                </div>

                <div className="modal-field">
                  <label className="modal-label" htmlFor="f-repeat-time">Time *</label>
                  <input
                    className="modal-input"
                    id="f-repeat-time"
                    type="time"
                    value={props.values.repeatTime}
                    onChange={(event) => props.onChange('repeatTime', event.target.value)}
                  />
                  {props.errors.repeatTime ? <div className="field-error show">{props.errors.repeatTime}</div> : null}
                </div>
              </div>

              {props.values.repeatEvery === 'days-of-week' ? (
                <div className="modal-field">
                  <label className="modal-label">Days of the Week *</label>
                  <div className="repeat-chip-grid">
                    {WEEKDAY_PICKER_OPTIONS.map((option) => {
                      const active = props.values.repeatDaysOfWeek.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          className={`repeat-chip ${active ? 'active' : ''}`}
                          type="button"
                          onClick={() => toggleNumberSelection('repeatDaysOfWeek', option.value)}
                        >
                          {option.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                  {props.errors.repeatDaysOfWeek ? <div className="field-error show">{props.errors.repeatDaysOfWeek}</div> : null}
                </div>
              ) : null}

              {props.values.repeatEvery === 'days-of-month' ? (
                <div className="modal-field">
                  <label className="modal-label">Days of the Month *</label>
                  <div className="repeat-chip-grid repeat-chip-grid-month">
                    {MONTH_DAY_PICKER_OPTIONS.map((day) => {
                      const active = props.values.repeatDaysOfMonth.includes(day);
                      return (
                        <button
                          key={day}
                          className={`repeat-chip ${active ? 'active' : ''}`}
                          type="button"
                          onClick={() => toggleNumberSelection('repeatDaysOfMonth', day)}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  {props.errors.repeatDaysOfMonth ? <div className="field-error show">{props.errors.repeatDaysOfMonth}</div> : null}
                </div>
              ) : null}

              <div className="repeat-summary">
                <div className="repeat-summary-line">{formatRepeatSummary(props.values)}</div>
                <div className="repeat-summary-sub">Runs in {props.values.repeatTimezone || 'your local timezone'} and can keep generating while you are offline.</div>
              </div>
            </div>
          ) : null}
        </div>

        <button className={`modal-submit ${props.loading ? 'btn-loading' : ''}`} type="button" onClick={props.onSubmit} disabled={props.loading}>
          {props.loading ? 'Saving assignment...' : 'Add Assignment'}
        </button>
      </div>
    </div>
  );
}
