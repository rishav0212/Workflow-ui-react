# 🔍 Instance Inspector Routing Guide

The **Instance Inspector** is a powerful debugging and visualization tool that provides a **unified view** of:

- 📜 Process history  
- 🧩 BPMN diagrams  
- 🔧 Technical execution traces  

It is accessible through a **single intelligent route** that automatically resolves the correct process instance based on the parameters provided.

---

## 📍 Base Route

    GET /inspect

This route dynamically determines **which process instance to load** using the supplied query parameters.

---

## 🛠️ Routing Strategies

Choose the routing strategy that best matches the data available in your context.

---

## 1️⃣ Track by Business Key (⭐⭐ Recommended)

**Best for:**  
- External systems  
- Email links  
- Order / Application tables  

Use this strategy when you have a **human-readable identifier** (such as an Order ID) but **do not know** the internal Flowable UUID.

### Query Parameters
- **businessKey** (Required)  
  The unique business identifier (e.g., Order ID)
- **processKey** (Highly Recommended)  
  Workflow definition key (ensures uniqueness across workflows)

### Example URL

    /inspect?processKey=order_process&businessKey=ORD-2026-001

---

## 2️⃣ Track by Task ID

**Best for:**  
- User inbox  
- Task lists  
- Notifications  

Use this when a user is interacting with a **specific task**.  
The system automatically resolves the **parent process instance**.

### Query Parameters
- **taskId** (Required)  
  UUID of the active or completed task

### Example URL

    /inspect?taskId=507f1f77-bcf8-11ed-a5c8-0242ac120002

---

## 3️⃣ Track by Instance ID (Direct)

**Best for:**  
- Admin dashboards  
- API responses  
- Internal logs  

Use this when you already have the **internal process instance UUID**.  
This method is the **most performant** since it skips resolution logic.

### Query Parameters
- **instanceId** (Required)  
  Internal process instance UUID

### Example URL

    /inspect?instanceId=12345-abcde-67890-fghij

---

## 📊 Quick Reference Table

| Strategy        | Query Parameters                    | Best Used For                         | Resolution Cost |
|-----------------|-------------------------------------|----------------------------------------|-----------------|
| Business Key    | businessKey + processKey            | External links, customer emails        | Medium (1 lookup) |
| Task ID         | taskId                              | User inbox, task lists                 | Medium (1 lookup) |
| Instance ID     | instanceId                          | Admin panels, API integrations         | Low (Direct) |

---

## 💻 Implementation Guide (React)

When linking **inside the application**, use `useNavigate` from `react-router-dom` to ensure **client-side navigation** without page reloads.

Example usage:

    import { useNavigate } from "react-router-dom";

    export default function ProcessActions({ row, task }) {
      const navigate = useNavigate();

      return (
        <div className="flex gap-3">

          Scenario A: Track by Business Key
          Used for business data tables (Orders, Applications)
          Button navigates to:
          /inspect?processKey=order_workflow&businessKey=<ORDER_ID>

          Scenario B: Track by Task ID
          Used for user inboxes or task-specific actions
          Button navigates to:
          /inspect?taskId=<TASK_ID>

          Scenario C: Track by Instance ID
          Used for admin views and debugging
          Button navigates to:
          /inspect?instanceId=<PROCESS_INSTANCE_ID>

        </div>
      );
    }

---

## ⚙️ Architecture Note: Resolution Priority

When the **Instance Inspector** loads, it resolves the process instance using the following **priority order**:

1️⃣ **Direct Instance ID**  
If `instanceId` is present, it is used immediately.

2️⃣ **Task Resolution**  
If `taskId` is present, the History API is queried to retrieve the associated `processInstanceId`.

3️⃣ **Business Key Resolution**  
If `businessKey` (and optionally `processKey`) is present, the History API retrieves the **most recent matching process instance**.

---

### ⚠️ Important Note

If **multiple parameters** are supplied (e.g., `taskId` and `businessKey`),  
the system **always prioritizes the most specific identifier**:

    instanceId > taskId > businessKey

---

## ✅ Summary

- One route, multiple intelligent resolution strategies  
- Business-key-based routing is recommended for external visibility  
- Task and instance routing provide precision for internal use  
- Resolution logic is deterministic, performant, and debuggable  

✨ This design enables **deep observability**, **clean URLs**, and **developer-friendly debugging** across all workflow contexts.
