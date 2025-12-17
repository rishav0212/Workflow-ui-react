import { useState, useMemo } from "react";
// @ts-ignore
import { FormBuilder as FormioBuilder } from "react-formio";
import "formiojs/dist/formio.full.min.css";
// import "./FormBuilderOverrides.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";
// import { Form } from "@formio/react";
export default function FormBuilder() {
  // const [formKey, setFormKey] = useState("");
  // // Initial Schema
  // const [formSchema, setFormSchema] = useState<any>({
  //   display: "form",
  //   components: [],
  // });

  // const navigate = useNavigate();
  // const [isSaving, setIsSaving] = useState(false);

  // // --- FIXED BUILDER OPTIONS ---
  // const builderOptions = useMemo(
  //   () => ({
  //     builder: {
  //       // 1. BASIC FIELDS
  //       basic: {
  //         title: "Basic",
  //         weight: 0,
  //         default: true, // This group is open by default
  //         components: {
  //           textfield: true,
  //           textarea: true,
  //           number: true,
  //           checkbox: true,
  //           select: true,
  //           button: true,
  //           radio: true,
  //           datetime: true,
  //         },
  //       },

  //       // 2. ADVANCED FIELDS
  //       advanced: {
  //         title: "Advanced",
  //         weight: 10,
  //         components: {
  //           email: true,
  //           url: true,
  //           phoneNumber: true,
  //           tags: true,
  //           address: true,
  //           currency: true,
  //           day: true,
  //           time: true,
  //           signature: true,
  //         },
  //       },

  //       // 3. LAYOUT COMPONENTS
  //       layout: {
  //         title: "Layout",
  //         weight: 20,
  //         components: {
  //           columns: true,
  //           table: true,
  //           tabs: true,
  //           panel: true,
  //           fieldset: true,
  //           well: true,
  //           content: true, // Used for HTML/Text
  //           htmlelement: true,
  //         },
  //       },

  //       // 4. DATA COMPONENTS
  //       data: {
  //         title: "Data",
  //         weight: 30,
  //         components: {
  //           datagrid: true,
  //           editgrid: true,
  //           container: true,
  //           tree: true,
  //           file: true,
  //         },
  //       },

  //       // 5. DISABLE PREMIUM (Avoids license warnings)
  //       premium: false,
  //     },
  //     scrollable: true,
  //     sanitize: true,
  //   }),
  //   []
  // );

  // const handleSave = async () => {
  //   if (!formKey) return alert("Please enter a unique Form Key");

  //   setIsSaving(true);
  //   try {
  //     const payload = {
  //       formKey: formKey,
  //       description: "Created via Form.io",
  //       schemaJson: formSchema,
  //     };

  //     await axios.post("http://localhost:8080/api/submissions/forms", payload);

  //     setTimeout(() => {
  //       alert("✅ Form Saved Successfully!");
  //       navigate("/");
  //     }, 500);
  //   } catch (err) {
  //     console.error(err);
  //     alert("❌ Failed to save.");
  //   } finally {
  //     setIsSaving(false);
  //   }
  // };

  return (
    <div 
    // className="min-h-screen bg-slate-100 flex flex-col font-sans"
    >
      {/* --- Professional Header --- */}
      {/* <nav className="bg-white border-b border-slate-200 h-16 px-6 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            title="Go Back"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-800 leading-tight">
              Form Designer
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              Drag & Drop Builder
            </span>
          </div>
        </div>

        <div className="flex-1 max-w-lg mx-8">
          <div className="relative group">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
              KEY
            </span>
            <input
              className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-transparent hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-md text-slate-900 font-mono text-sm transition-all outline-none"
              placeholder="e.g. employee_onboarding_v1"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-md font-semibold text-sm shadow-sm transition-all
              ${
                isSaving
                  ? "bg-slate-100 text-slate-400 cursor-wait"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:transform active:scale-95"
              }
            `}
          >
            {isSaving ? "Saving..." : "Save Form"}
          </button>
        </div>
      </nav> */}

      {/* --- Main Workspace --- */}
      {/* <div className="flex-1 p-6 overflow-hidden flex justify-center"> */}
      {/* CSS Override Wrapper */}
      {/* <div
          id="formio-wrapper"
          className="w-full max-w-7xl h-full flex flex-col bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5"
        >
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Canvas
            </span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <Form
              src="http://localhost:3001/"
              onSubmit={(submission) => console.log(submission)}
            />
          </div>
        </div> */}
      {/* </div> */}

      <iframe src="http://localhost:3001/" width="100%" height="1000px"></iframe>
    </div>
  );
}
