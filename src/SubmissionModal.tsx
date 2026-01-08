// src/SubmissionModal.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
// @ts-ignore
import { Form } from "@formio/react";
import { fetchFormSchema, fetchSubmissionData, parseApiError } from "./api"; 
import { FORM_IO_API_URL } from "./config";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formKey: string;
  submissionId?: string;
  initialData?: any;
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
  const [error, setError] = useState<string | null>(null);

  // 1. Memoize options
  const memoizedOptions = useMemo(() => {
    return { noAlerts: true, readOnly: isReadOnly };
  }, [isReadOnly]);

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
          
          // 🟢 CHECK BOTH: selectOptions (Formio) and choices (Choices.js)
          const options = comp.selectOptions || comp.choices || [];

          if (options && options.length > 0) {
            
            // If exactly 1 option exists
            if (options.length === 1) {
              const firstOption = options[0];
              const newValue = firstOption.value;

              // 🛑 STOP POLLING immediately so we don't trigger multiple times
              clearInterval(intervalId);

              // 🟢 FIX 1: YIELD TO EVENT LOOP
              // Even if data is ready, wait 50ms to let the component finish its 'init' cycle
              // This prevents the "cleanup" phase from wiping our value.
              setTimeout(() => {
                  
                  // 1. Set Value Internally
                  if (!comp.dataValue) {
                      console.log(`[AutoSelect] Setting initial value for ${comp.key}`);
                      comp.setValue(newValue);
                      comp.triggerChange();
                  }

                  // 2. Set Submission State (React)
                  setSubmission((prev: any) => {
                    const prevData = prev?.data || {};
                    if (prevData[comp.key] === newValue) return prev;
                    return {
                      ...prev,
                      data: { ...prevData, [comp.key]: newValue },
                    };
                  });

                  // 🟢 FIX 2: PERSISTENCE CHECK (The "Safety Net")
                  // Check back in 1 second. If the value is gone (reset by cache refresh), force it back.
                  setTimeout(() => {
                      if (comp.dataValue !== newValue) {
                          console.log(`[AutoSelect] Value lost! Re-applying for ${comp.key}`);
                          comp.setValue(newValue);
                          comp.triggerChange();
                      }
                  }, 1000);

              }, 50); // Small delay to escape the init cycle
            } else {
                // If we found options but it's not length 1, stop polling
                clearInterval(intervalId);
            }
          }

          if (elapsedTime >= maxWait) clearInterval(intervalId);
        }, pollInterval);
      });
    },
    [] 
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
      setError(null);
      const fetchData = async () => {
        try {
          const schemaData = await fetchFormSchema(formKey);
          fixUrls(schemaData.components);
          setSchema(schemaData);

          if (submissionId) {
            const subData = await fetchSubmissionData(formKey, submissionId);
            setSubmission(subData.data ? subData : { data: subData });
          } else {
            setSubmission(initialData || { data: {} });
          }
        } catch (err: any) {
          console.error("Modal Data Fetch Error:", err);
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
              key={submissionId }
              form={schema}
              src={""}
              submission={submission}
              onFormReady={onFormReady}
              onSubmit={onSubmit}
              options={memoizedOptions}
            />
          )}
        </div>
      </div>
    </div>
  );
}