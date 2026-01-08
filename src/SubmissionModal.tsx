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

  // 2. Case Insensitive Helper
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

  // 3. Polling Logic (DEEP INSPECTION MODE)
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

        console.log(`🔍 [DEBUG-INIT] Polling started for: ${comp.key}`);

        const intervalId = setInterval(() => {
          elapsedTime += pollInterval;

          if (comp.selectOptions && comp.selectOptions.length > 0) {
            // --- START DEBUG BLOCK ---
            console.groupCollapsed(`🔍 [DEBUG] ${comp.key} Inspection`);

            // 1. Inspect Raw Data Value
            console.log(
              `Current comp.dataValue (Type: ${typeof comp.dataValue}):`
            );
            console.log(JSON.stringify(comp.dataValue, null, 2));

            // 2. Inspect Raw Options
            console.log(`Raw Options (Length: ${comp.selectOptions.length}):`);
            // Only log the first few to avoid spamming, but log structure
            comp.selectOptions.forEach((opt: any, idx: number) => {
              console.log(`Opt ${idx}:`, opt);
              console.log(`Opt ${idx} Value ID:`, opt.value?.id);
            });

            // 🟢 STEP 1: DEDUPLICATION WITH LOGGING
            const uniqueOptionsMap = new Map();
            comp.selectOptions.forEach((opt: any, idx: number) => {
              if (!opt || !opt.value) return;

              // Logic used to generate key
              let valueKey = "UNKNOWN";
              if (opt.value && typeof opt.value === "object") {
                // Prioritize ID, then _id, then stringify
                if (opt.value.id) valueKey = String(opt.value.id);
                else if (opt.value._id) valueKey = String(opt.value._id);
                else valueKey = JSON.stringify(opt.value);
              } else {
                valueKey = String(opt.value);
              }

              console.log(`[Dedupe] Opt ${idx} -> Generated Key: ${valueKey}`);

              if (!uniqueOptionsMap.has(valueKey)) {
                uniqueOptionsMap.set(valueKey, opt);
              } else {
                console.log(
                  `[Dedupe] Opt ${idx} -> Duplicate found! Ignoring.`
                );
              }
            });

            const uniqueOptions = Array.from(uniqueOptionsMap.values());
            console.log(`Final Unique Options Count: ${uniqueOptions.length}`);

            // 🟢 STEP 2: CHECK "EMPTY" STATE WITH LOGGING
            const isUndefined = !comp.dataValue;
            const isEmptyObj =
              typeof comp.dataValue === "object" &&
              comp.dataValue !== null &&
              Object.keys(comp.dataValue).length === 0;
            const isValueEmpty = isUndefined || isEmptyObj;

            console.log(`Is Value Empty Check:`, {
              isUndefined,
              isEmptyObj,
              result: isValueEmpty,
            });

            // 🟢 STEP 3: DECISION
            if (uniqueOptions.length === 1 && isValueEmpty) {
              const firstOption = makeCaseInsensitive(uniqueOptions[0]);
              const newValue = firstOption.value;

              console.log(`✅ [DEBUG] MATCH! Setting value to:`, newValue);

              clearInterval(intervalId);

              setTimeout(() => {
                console.log(`🚀 [DEBUG] Executing setValue for ${comp.key}`);
                comp.setValue(newValue, { modified: true });
                comp.triggerChange();

                setSubmission((prev: any) => {
                  const prevData = prev?.data || {};
                  return {
                    ...prev,
                    data: {
                      ...prevData,
                      [comp.key]: newValue,
                    },
                  };
                });
              }, 100);
            } else {
              console.log("🛑 [DEBUG] Conditions not met.");
              if (uniqueOptions.length !== 1)
                console.log(
                  `   - Unique Count is ${uniqueOptions.length} (Expected 1)`
                );
              if (!isValueEmpty) console.log(`   - Value is NOT empty.`);

              // Prevent infinite logs if we have options but they aren't right
              if (uniqueOptions.length > 0) {
                clearInterval(intervalId);
              }
            }
            console.groupEnd();
            // --- END DEBUG BLOCK ---
          }

          if (elapsedTime >= maxWait) {
            // console.warn(`❌ [DEBUG] ${comp.key} Timed Out`);
            clearInterval(intervalId);
          }
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
              options={memoizedOptions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
