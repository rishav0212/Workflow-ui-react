// src/SubmissionModal.tsx
import React, { useCallback, useEffect, useState } from "react";
// @ts-ignore
import { Form } from "@formio/react";
import { fetchFormSchema, fetchSubmissionData, parseApiError } from "./api"; // 🟢 Import helper
import { FORM_IO_API_URL } from "./config";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formKey: string;
  submissionId?: string; // Optional: if provided, it fetches data (View Mode)
  initialData?: any; // Optional: for Action Mode
  isReadOnly?: boolean;
  onSubmit?: (submission: any) => void;
}

export default function SubmissionModal({
  isOpen,
  onClose,
  title,
  formKey,
  submissionId,
  initialData,
  isReadOnly = true,
  onSubmit,
}: SubmissionModalProps) {
  const [schema, setSchema] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // 🟢 New Error State

  // ... (Keep makeCaseInsensitive, onFormReady, fixUrls) ...
  const makeCaseInsensitive = useCallback((item: any) => {
    if (!item || typeof item !== "object") return item;
    return new Proxy(item, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === "string") {
          const lowerProp = prop.toLowerCase();
          const actualKey = Object.keys(target).find(
            (k) => k.toLowerCase() === lowerProp
          );
          if (actualKey) return target[actualKey];
        }
        return undefined;
      },
    });
  }, []);

  // 🟢 UPDATED: Sync Auto-Selected Value back to React State
  const onFormReady = useCallback(
    (instance: any) => {
      const selectComponents: any[] = [];
      instance.everyComponent((comp: any) => {
        if (comp.component.type === "select") selectComponents.push(comp);
      });

      selectComponents.forEach((comp) => {
        const pollInterval = 100;
        const maxWait = 10000;
        let elapsedTime = 0;

        const intervalId = setInterval(() => {
          elapsedTime += pollInterval;

          if (comp.selectOptions && comp.selectOptions.length > 0) {
            comp.selectOptions = comp.selectOptions.map((opt: any) =>
              makeCaseInsensitive(opt)
            );

            if (comp.selectOptions.length === 1 && !comp.dataValue) {
              const firstOption = comp.selectOptions[0];
              const newValue = firstOption.value;

              // 1. Update Form.io Internal State
              comp.setValue(newValue);
              comp.triggerChange();

              // 🟢 2. Update React State to prevent reset on re-render

            }
            clearInterval(intervalId);
          }

          if (elapsedTime >= maxWait) clearInterval(intervalId);
        }, pollInterval);
      });
    },
    [makeCaseInsensitive]
  );

  const fixUrls = (components: any[]) => {
    if (!components) return;
    components.forEach((comp: any) => {
      if (
        comp.type === "select" &&
        comp.dataSrc === "resource" &&
        comp.data?.resource
      ) {
        comp.dataSrc = "url";
        comp.data.url = `${FORM_IO_API_URL}/form/${comp.data.resource}/submission`;
        comp.authenticate = true;
        if (!comp.data) comp.data = {};
        comp.data.authenticate = true;
        delete comp.data.resource;
      }
      if (comp.components) fixUrls(comp.components);
      if (comp.columns)
        comp.columns.forEach((col: any) => fixUrls(col.components));
    });
  };

  useEffect(() => {
    if (isOpen && formKey) {
      setLoading(true);
      setError(null); // Reset error
      const fetchData = async () => {
        try {
          const schemaData = await fetchFormSchema(formKey);
          fixUrls(schemaData.components);
          setSchema(schemaData);

          if (submissionId) {
            // VIEW MODE: Fetch historical data
            const subData = await fetchSubmissionData(formKey, submissionId);
            setSubmission(subData.data ? subData : { data: subData });
          } else {
            // ACTION MODE: Use existing task data
            setSubmission(initialData || { data: {} });
          }
        } catch (err: any) {
          console.error("Modal Data Fetch Error:", err);
          // 🟢 Handle Error Display
          setError(parseApiError(err));
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, formKey, submissionId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-surface rounded-xl shadow-premium w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp border border-canvas-subtle">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-canvas-subtle bg-surface-elevated">
          <h2 className="text-lg font-serif font-bold text-ink-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-canvas-active flex items-center justify-center transition-colors text-ink-secondary"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-canvas-subtle rounded-lg"></div>
              ))}
            </div>
          ) : error ? (
            // 🟢 ERROR STATE
            <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-status-error/30 bg-status-error/5 rounded-xl">
              <i className="fas fa-exclamation-circle text-3xl text-status-error mb-3"></i>
              <h3 className="text-lg font-bold text-status-error">
                Failed to load form
              </h3>
              <p className="text-sm text-ink-secondary mt-1 max-w-sm">
                {error}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-white border border-canvas-active rounded-lg text-sm font-bold text-ink-primary hover:bg-canvas-subtle transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <Form
              key={submissionId}
              form={schema}
              src={""}
              submission={initialData}
              onFormReady={onFormReady}
              onSubmit={onSubmit}
              // options={{ noAlerts: true, readOnly: isReadOnly }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
