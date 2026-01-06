// src/admin/ElementInspector.tsx
import React from 'react';

export default function ElementInspector({ element }: { element: any }) {
  if (!element) return null;

  const bo = element.businessObject;

  // 🟢 AUTOMATION: Extract all technical attributes automatically
  const getProperties = () => {
    const props: Record<string, any> = {
      "ID": bo.id,
      "Name": bo.name || "Unnamed",
      "Type": element.type.split(':')[1],
    };

    // Pull standard attributes (Documentation, etc)
    if (bo.documentation?.length) {
      props["Documentation"] = bo.documentation[0].text;
    }

    // 🟢 AUTOMATION: Pull all 'flowable:' prefixed attributes automatically
    // flowable-bpmn-moddle makes these accessible via '$attrs' or direct keys
    const flowableAttrs = bo.$attrs || {};
    Object.keys(flowableAttrs).forEach(key => {
      const cleanKey = key.replace('flowable:', '');
      props[cleanKey] = flowableAttrs[key];
    });

    // Handle Form Key specifically if present
    if (bo.get("flowable:formKey")) props["Form Key"] = bo.get("flowable:formKey");
    if (bo.get("flowable:assignee")) props["Assignee"] = bo.get("flowable:assignee");

    return props;
  };

  const properties = getProperties();

  return (
    <div className="absolute top-6 right-6 w-80 bg-surface/95 backdrop-blur-md rounded-2xl shadow-premium border border-canvas-active p-6 animate-slideInRight z-20 max-h-[80vh] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase text-brand-600 tracking-widest">Metadata Inspector</h3>
          <p className="text-xs text-ink-tertiary mt-1 font-mono">{element.id}</p>
        </div>
        <button className="text-ink-tertiary hover:text-ink-primary transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="space-y-5">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="group">
            <span className="text-[9px] font-black uppercase text-ink-tertiary tracking-tighter block mb-1 group-hover:text-brand-500 transition-colors">
              {key}
            </span>
            <div className="bg-canvas-subtle/50 p-2 rounded-lg border border-transparent group-hover:border-canvas-active transition-all">
              <p className="text-sm font-bold text-ink-primary break-all leading-tight">
                {String(value)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}