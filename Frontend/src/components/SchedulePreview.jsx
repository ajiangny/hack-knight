import { Link } from 'react-router-dom';            // Link for navigating to /schedule
import { scheduleEvents } from '../data/schedule';  // import schedule data from the data folder

export default function SchedulePreview() {
  return (
    <section className="section-wrapper py-24">                                       {/* section wrapper for this block */}
      <h2 className="section-title text-center">Schedule Preview</h2>                             {/* section heading */}
      <p className="section-subtitle text-center">October 17th - 19th, 2026</p>             {/* event date range */}

      <div className="schedule-grid-wrapper max-w-4xl mx-auto my-10 bg-surface/40">                                         {/* grid container — teammate adds CSS grid styling */}
        <div className="flex flex-col gap-2 p-6">
          {/* Loop over schedule events and render a row for each */}
          {scheduleEvents.map((event, index) => (     // .map() loops over the array; event = current item, index = its position
            <div key={index} className="flex justify-between p-4 border border-border rounded-card bg-surface hover:bg-surface/80 transition-colors">                         {/* key is required by React when rendering a list */}
              <span className="font-mono text-ultraviolet font-bold">{event.day}</span>                {/* which day the event falls on */}
              <span className="font-body text-text-primary">{event.label}</span>              {/* the event name */}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link to="/schedule" className="btn-outline">View Full Schedule</Link> {/* navigates to the dedicated /schedule page */}
      </div>
    </section>
  );
}