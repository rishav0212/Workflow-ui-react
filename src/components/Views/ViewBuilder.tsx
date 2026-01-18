import React, { useCallback } from "react";
import { Form } from "@formio/react";
import { toast } from "react-hot-toast"; // Using your existing toaster
import api from "../../api"; // Adjust path to src/api.ts

import "formiojs/dist/formio.full.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

// The Schema remains exactly the same, with 'as const' to fix TypeScript
const VIEW_BUILDER_SCHEMA: any = {
  display: "wizard",
  components: [
    {
      title: "Basic Settings",
      label: "Basic Settings",
      type: "panel",
      key: "page1",
      components: [
        {
          label: "View Title",
          key: "title",
          type: "textfield",
          validate: { required: true },
          description: "The name displayed at the top of the page",
          input: true,
        },
        {
          label: "Unique View ID",
          key: "viewId",
          type: "textfield",
          validate: {
            required: true,
            pattern: "^[a-z0-9_]+$",
            customMessage: "Lowercase & underscores only",
          },
          description: "Unique system ID (e.g. 'view_hr_requests')",
          input: true,
        },
        {
          label: "View Type",
          key: "viewType",
          type: "select",
          data: {
            values: [
              { label: "Data Grid (Table)", value: "GRID" },
              { label: "Kanban Board", value: "KANBAN" },
              { label: "Calendar", value: "CALENDAR" },
              { label: "Detail Card", value: "CARD" },
            ],
          },
          defaultValue: "GRID",
          validate: { required: true },
          input: true,
        },
        {
          label: "Data Source (Table)",
          key: "dataSource",
          type: "select",
          data: {
            values: [
              { label: "Employees", value: "t_employees" },
              { label: "Leave Requests", value: "t_leave_requests" },
              { label: "Invoices", value: "t_invoices" },
              { label: "Workflow History", value: "act_hi_procinst" },
            ],
          },
          validate: { required: true },
          input: true,
        },
      ],
    },
    {
      title: "Columns & Layout",
      label: "Columns",
      type: "panel",
      key: "page2",
      components: [
        {
          label: "Columns Configuration",
          key: "columns",
          type: "datagrid",
          description: "Define the columns for your grid.",
          reorder: true,
          addAnother: "Add Column",
          components: [
            {
              label: "Header Title",
              key: "header",
              type: "textfield",
              validate: { required: true },
              input: true,
            },
            {
              label: "Field Key (DB Column)",
              key: "key",
              type: "textfield",
              validate: { required: true },
              input: true,
            },
            {
              label: "Data Type",
              key: "dataType",
              type: "select",
              data: {
                values: [
                  { label: "Text", value: "text" },
                  { label: "Number", value: "number" },
                  { label: "Date/Time", value: "date" },
                  { label: "Status Badge", value: "status" },
                  { label: "Currency", value: "currency" },
                  { label: "Action Buttons", value: "actions" },
                ],
              },
              defaultValue: "text",
              input: true,
            },
            {
              label: "Width (px)",
              key: "width",
              type: "number",
              input: true,
            },
            {
              label: "Sortable?",
              key: "sortable",
              type: "checkbox",
              defaultValue: true,
              input: true,
            },
          ],
          input: true,
        },
      ],
    },
    {
      title: "Interactions",
      label: "Actions & Filters",
      type: "panel",
      key: "page3",
      components: [
        {
          type: "fieldset",
          title: "Default Filters (Hidden)",
          components: [
            {
              label: "Pre-set Filters",
              key: "filters",
              type: "datagrid",
              addAnother: "Add Filter",
              components: [
                {
                  label: "Field",
                  key: "field",
                  type: "textfield",
                  input: true,
                },
                {
                  label: "Operator",
                  key: "operator",
                  type: "select",
                  data: {
                    values: [
                      { label: "Equals", value: "eq" },
                      { label: "Contains", value: "like" },
                      { label: ">", value: "gt" },
                    ],
                  },
                  input: true,
                },
                {
                  label: "Value",
                  key: "value",
                  type: "textfield",
                  input: true,
                },
              ],
              input: true,
            },
          ],
        },
        {
          type: "fieldset",
          title: "Row Actions (Buttons)",
          components: [
            {
              label: "Action Buttons",
              key: "actionConfig",
              type: "datagrid",
              description: "Define buttons for the 'Actions' column.",
              addAnother: "Add Button",
              components: [
                {
                  label: "Label",
                  key: "label",
                  type: "textfield",
                  input: true,
                },
                {
                  label: "Icon Class",
                  key: "icon",
                  type: "textfield",
                  placeholder: "fas fa-edit",
                  input: true,
                },
                {
                  label: "Color",
                  key: "color",
                  type: "select",
                  data: {
                    values: [
                      { label: "Blue (Primary)", value: "primary" },
                      { label: "Red (Danger)", value: "danger" },
                      { label: "Green (Success)", value: "success" },
                    ],
                  },
                  input: true,
                },
                {
                  label: "Action Type",
                  key: "type",
                  type: "select",
                  data: {
                    values: [
                      { label: "Navigate (URL)", value: "NAVIGATE" },
                      { label: "Trigger Process", value: "TRIGGER_PROCESS" },
                      { label: "Open Modal Form", value: "OPEN_MODAL" },
                    ],
                  },
                  input: true,
                },
                {
                  label: "Payload",
                  key: "payload",
                  type: "textfield",
                  description: "e.g. '/users/:id' or 'process_key'",
                  input: true,
                },
              ],
              input: true,
            },
          ],
        },
      ],
    },
  ],
};

export const ViewBuilder = ({
  onSaveSuccess,
}: {
  onSaveSuccess?: () => void;
}) => {
  const handleSubmit = useCallback(
    async (submission: any) => {
      // 1. Extract Config
      const viewConfig = submission.data;
      const cleanConfig = {
        viewId: viewConfig.viewId,
        title: viewConfig.title,
        viewType: viewConfig.viewType,
        dataSource: viewConfig.dataSource,
        columns: viewConfig.columns,
        filters: viewConfig.filters,
        actionsConfig: viewConfig.actionConfig,
      };

      try {
        console.log("Saving View Config:", cleanConfig);

        // 2. Send to API
        await api.post("/api/admin/views", cleanConfig);

        // 3. Success Notification (using React Hot Toast)
        toast.success("View created successfully!");

        if (onSaveSuccess) onSaveSuccess();
      } catch (err: any) {
        console.error(err);
        // 4. Error Notification
        toast.error(err.message || "Failed to save view configuration.");
      }
    },
    [onSaveSuccess]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
      {/* Container: Matches your App's 'Card' style using Tailwind */}
      <div className="bg-surface rounded-xl shadow-premium border border-canvas-subtle">
        {/* Header Section */}
        <div className="px-6 py-4 border-b border-canvas-subtle bg-canvas-subtle/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center shadow-sm">
            <i className="fas fa-magic text-lg"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink-primary">
              Create New View
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              Design your data grid layout
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <Form
            src={""}
            form={VIEW_BUILDER_SCHEMA}
            onSubmit={handleSubmit}
            options={{
              noAlerts: true, // Disable Form.io's default ugly alerts
              breadcrumbSettings: { clickable: false },
            }}
          />
        </div>
      </div>
    </div>
  );
};
