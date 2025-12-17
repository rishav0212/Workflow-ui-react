import { User, CheckCircle, Clock, PlayCircle } from "lucide-react";

interface HistoryEvent {
  taskId: string;
  taskName: string;
  status: string; // "COMPLETED" | "ACTIVE"
  startTime: string;
  endTime?: string;
  assignee?: string;
}

interface TimelineProps {
    events: HistoryEvent[];
}

export const HistoryTimeline = ({ events }: TimelineProps) => {
  if (!events || events.length === 0) {
      return <div className="text-center text-ink-muted py-8">No history available.</div>;
  }

  return (
    <div className="flow-root py-6">
      <ul role="list" className="-mb-8">
        {events.map((event, idx) => {
          const isCompleted = event.status === "COMPLETED";
          const Icon = isCompleted ? CheckCircle : PlayCircle;
          const colorClass = isCompleted ? "bg-emerald-500" : "bg-blue-500";
          
          return (
            <li key={idx}>
                <div className="relative pb-8">
                {idx !== events.length - 1 ? (
                    <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-stone-200" aria-hidden="true" />
                ) : null}
                <div className="relative flex space-x-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ring-8 ring-white ${colorClass}`}>
                    <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                        <p className="text-sm text-ink-secondary">
                        <span className="font-semibold text-ink-primary">{event.taskName}</span>
                        {' '} was {isCompleted ? 'completed' : 'started'}
                        </p>
                        {event.assignee && (
                            <p className="text-xs text-ink-muted flex items-center mt-1">
                                <User className="w-3 h-3 mr-1"/> {event.assignee}
                            </p>
                        )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-ink-muted">
                        <time dateTime={event.startTime}>{new Date(event.startTime).toLocaleDateString()}</time>
                        <div className="mt-1">{new Date(event.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                    </div>
                </div>
                </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};