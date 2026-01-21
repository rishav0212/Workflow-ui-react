🔍 Instance Inspector Routing Guide

The Instance Inspector is a powerful debugging and visualization tool that provides a unified view of process history, BPMN diagrams, and technical traces. It is accessible via a single route (/inspect) that intelligently resolves the correct process instance based on the parameters you provide.

📍 Base Route

GET /inspect

🛠️ Routing Strategies

Choose the strategy that best fits the data available in your current context.

1. Track by Business Key (⭐⭐ Recommended)

Best for: External Systems, Email Links, Order Tables

Use this method when you have a human-readable identifier (like an Order ID) but do not know the internal system UUID.

Query Parameters:

businessKey (Required): The unique business identifier (e.g., Order ID).

processKey (Highly Recommended): The definition key of the workflow (e.g., order_process). This ensures uniqueness if different workflows use the same ID format.

Example URL:

/inspect?processKey=order_process&businessKey=ORD-2026-001

2. Track by Task ID

Best for: User Inbox, Task Lists, Notifications

Use this method when a user is working on a specific task. The system will automatically look up the task's metadata to find its parent Process Instance.

Query Parameters:

taskId (Required): The UUID of the active or completed task.

Example URL:

/inspect?taskId=507f1f77-bcf8-11ed-a5c8-0242ac120002

3. Track by Instance ID (Direct)

Best for: Admin Dashboards, API Responses, Internal Logs

Use this method when you already possess the raw, internal UUID of the process instance. This is the most performant method as it bypasses the resolution logic.

Query Parameters:

instanceId (Required): The internal UUID of the process instance.

Example URL:

/inspect?instanceId=12345-abcde-67890-fghij

📊 Quick Reference Table

Strategy

Query Params

Best Used For

Resolution Cost

Business Key

businessKey + processKey

External links, Customer emails

Medium (1 Lookup)

Task ID

taskId

User Task Lists, Inbox

Medium (1 Lookup)

Instance ID

instanceId

Admin panels, API integrations

Low (Direct)

💻 Implementation Guide (React)

When linking within the application, rely on the useNavigate hook from react-router-dom to ensure a smooth, client-side transition without reloading the page.

import { useNavigate } from "react-router-dom";

export default function ProcessActions({ row, task }) {
const navigate = useNavigate();

return (
<div className="flex gap-3">

      {/* 🟢 Scenario A: Track by Business Key
          Use for business data tables (e.g. Orders, Applications) */}
      <button
        className="btn-primary"
        onClick={() =>
          navigate(
            `/inspect?processKey=order_workflow&businessKey=${row.orderId}`
          )
        }
      >
        <i className="fas fa-search"></i> Track Order
      </button>

      {/* 🔵 Scenario B: Track by Task ID
          Use for user inboxes or task-specific actions */}
      <button
        className="btn-secondary"
        onClick={() => navigate(`/inspect?taskId=${task.id}`)}
      >
        <i className="fas fa-list-check"></i> View Context
      </button>

      {/* 🔴 Scenario C: Track by Instance ID
          Use for technical admin views or debugging */}
      <button
        className="btn-tertiary"
        onClick={() => navigate(`/inspect?instanceId=${row.processInstanceId}`)}
      >
        <i className="fas fa-bug"></i> Debug Instance
      </button>

    </div>

);
}

⚙️ Architecture Note: How Resolution Works

When the Instance Inspector loads, it executes a resolution effect in the following priority order:

Check Direct ID: If instanceId is present in the URL, it is used immediately.

Resolve Task: If taskId is present, the component queries the History API to find the processInstanceId associated with that task.

Resolve Keys: If businessKey (and optionally processKey) are present, the component queries the History API to find the most recent process instance matching those keys.

Note: If multiple parameters are provided (e.g. taskId AND businessKey), the system prioritizes the more specific identifier (Task ID) first.
