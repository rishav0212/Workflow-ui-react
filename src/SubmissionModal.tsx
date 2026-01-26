// src/SubmissionModal.tsx
import React, { useCallback, useEffect, useState, useMemo } from "react";
// @ts-ignore
import { Form } from "@formio/react";
import { fetchFormSchema, fetchSubmissionData, parseApiError } from "./api";
import { FORM_IO_API_URL } from "./config";

import "formiojs/dist/formio.full.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  formKey: string;
  submissionId?: string;
  initialData?: any;
  isReadOnly?: boolean;
  onSubmit?: (submission: any) => void;
  isSubmitting?: boolean;
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
  isSubmitting = false,
}: SubmissionModalProps) {
  const [schema, setSchema] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Memoize options
  // const memoizedOptions = useMemo(() => {
  //   return { noAlerts: true, readOnly: isReadOnly };
  // }, [isReadOnly]);

  // 2. Case Insensitive Helper
  const makeCaseInsensitive = useCallback((item: any) => {
    if (!item || typeof item !== "object") return item;
    return new Proxy(item, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === "string") {
          const lowerProp = prop.toLowerCase();
          const actualKey = Object.keys(target).find(
            (k) => k.toLowerCase() === lowerProp,
          );
          if (actualKey) return target[actualKey];
        }
        return undefined;
      },
    });
  }, []);

  // 3. Polling Logic (DEEP DEBUG MODE)
const onFormReady = useCallback(
    (instance: any) => {
      const activeIntervals: number[] = [];

      instance.everyComponent((comp: any) => {
        if (comp.component.type === "select") {
          let elapsedTime = 0;
          const pollInterval = 100;
          const maxWait = 8000;

          const intervalId = setInterval(() => {
            elapsedTime += pollInterval;

            if (comp.selectOptions && comp.selectOptions.length > 0) {
              // Deduplicate options
              const uniqueOptionsMap = new Map();
              comp.selectOptions.forEach((opt: any) => {
                if (!opt?.value) return;
                const key = (typeof opt.value === 'object') 
                  ? (opt.value.id || opt.value._id || JSON.stringify(opt.value)) 
                  : String(opt.value);
                if (!uniqueOptionsMap.has(key)) uniqueOptionsMap.set(key, opt);
              });

              const uniqueOptions = Array.from(uniqueOptionsMap.values());

              if (uniqueOptions.length === 1) {
                const newValue = uniqueOptions[0].value;
                const isValueEmpty = !comp.dataValue || 
                  (typeof comp.dataValue === 'object' && Object.keys(comp.dataValue).length === 0);

                if (isValueEmpty) {
                  console.log(`🚀 Auto-filling & Refreshing Logic for: ${comp.key}`);
                  
                  // 1. Set the value
                  comp.setValue(newValue, { modified: true });
                  
                  // 2. IMPORTANT: Manually trigger the component change
                  comp.triggerChange();

                  // 3. THE MAGIC FIX: Tell the ROOT form to re-run all logic/queries
                  // This ensures dependent fields (like data.selectVal) see the new value.
                  instance.onChange({
                    data: instance.data,
                    changed: {
                      component: comp.component,
                      instance: comp,
                      value: newValue
                    }
                  }, { forceUpdate: true });
                }
                clearInterval(intervalId);
              } else if (uniqueOptions.length > 1) {
                clearInterval(intervalId);
              }
            }

            if (elapsedTime >= maxWait) clearInterval(intervalId);
          }, pollInterval);
          
          activeIntervals.push(intervalId as any);
        }
      });

      // Cleanup intervals if user switches tasks before polling finishes
      return () => {
        activeIntervals.forEach(id => clearInterval(id));
      };
    },
    [submission] // Ensure this re-runs every time the submission changes
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

        let baseUrl = `${FORM_IO_API_URL}/form/${comp.data.resource}/submission`;
        if (comp.filter) {
          baseUrl += `?${comp.filter}`;
        }

        comp.data.url = baseUrl;
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

          console.log("Modal Schema Loaded:", schemaData);
          console.log("Modal data:", submission);
          console.log("Initial data:", initialData);
        } catch (err: any) {
          console.error("Modal Data Fetch Error:", err);
          setError(parseApiError(err));
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, formKey, submissionId, initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="absolute inset-0 bg-ink-primary/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="relative bg-surface rounded-xl shadow-premium w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp border border-canvas-subtle">
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn ">
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4 shadow-brand-sm border border-brand-100 animate-bounce-slow">
              <i className="fas fa-circle-notch fa-spin text-2xl text-brand-600"></i>
            </div>
            <h3 className="text-xl font-serif font-bold text-ink-primary mb-1">
              Submitting...
            </h3>
            <p className="text-sm text-neutral-500 font-medium">
              Please wait while we process your request.
            </p>
          </div>
        )}{" "}
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
              key={submissionId || "new-submission"}
              form={schema}
              src={""}
              submission={submission}
              onFormReady={onFormReady}
              onSubmit={onSubmit}
              options={{ noAlerts: true, readOnly: isReadOnly }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
