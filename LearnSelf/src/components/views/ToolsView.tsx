export function ToolsView() {
  const cards = [
    ['study-card blue-soft', 'Pomodoro Timer', 'Stay focused with timed study sessions.'],
    ['study-card yellow-soft', 'Calendar Sync', 'Export your due dates to your calendar.'],
    ['study-card green-soft', 'Grade Tracker', 'Track scores and estimate your GPA.'],
    ['study-card red-soft', 'Quick Notes', 'Jot down thoughts for any assignment.']
  ];

  return (
    <div className="view active">
      <div className="simple-view-card">
        <div className="view-title">Tools</div>
        <div className="view-sub">Helpful resources and quick tools for students.</div>
        <div className="card-grid">
          {cards.map(([className, title, text]) => (
            <div key={title} className={className}>
              <div className="study-card-title">{title}</div>
              <div className="study-card-copy">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
