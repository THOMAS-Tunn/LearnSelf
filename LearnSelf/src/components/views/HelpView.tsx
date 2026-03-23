export function HelpView() {
  const items = [
    ['blue-soft plain-card', 'Adding an assignment', 'Click the + button on the Dashboard. Name, Due Date, and Difficulty are required. Due Time is optional and defaults to 12:00 AM.'],
    ['yellow-soft plain-card', 'Priority system', 'Pick Newest, Oldest, or Logic (Beta!). Red means overdue or due now, yellow means due soon, and green means there is more time.'],
    ['green-soft plain-card', 'Bulk actions', 'Select rows, then use Mark Finished or Delete above the table.'],
    ['red-soft plain-card', 'Viewing details', 'Click any dashboard row to open the full assignment details.']
  ];

  return (
    <div className="view active">
      <div className="simple-view-card">
        <div className="view-title">Help</div>
        <div className="view-sub">How LearnSelf works.</div>
        <div className="help-stack">
          {items.map(([className, title, text]) => (
            <div key={title} className={className}>
              <div className="help-title">{title}</div>
              <div className="help-copy">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
