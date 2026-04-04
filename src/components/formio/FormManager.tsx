import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config"; // Adjust your import path as needed

interface FormDef {
  _id: string;
  title: string;
  path: string;
  name: string;
  tags?: string[];
  modified?: string;
}

// ──────────────────────────────────────────────────────────
// 🛡️ Robust Error Boundary to prevent React app crashes
// WHY WE DO THIS: If the embedded iframe or internal logic throws a fatal error,
// this prevents the entire React tree from unmounting and breaking the UI.
// ──────────────────────────────────────────────────────────
class FormErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-canvas p-10">
          <div className="w-16 h-16 bg-status-error/10 text-status-error flex items-center justify-center rounded-full mb-4">
            <i className="fas fa-exclamation-triangle text-2xl"></i>
          </div>
          <h2 className="text-xl font-bold text-ink-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-ink-secondary mb-6 text-center max-w-md">
            The form builder encountered an unexpected error.
            <br />
            <code className="text-xs bg-canvas-active p-1 rounded mt-2 block">
              {this.state.errorMsg}
            </code>
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand-500 text-white rounded-lg font-bold hover:bg-brand-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ──────────────────────────────────────────────────────────
// Builder Container — Renders inline with dynamic loading
// ──────────────────────────────────────────────────────────
function FormBuilderContainer({
  formPath,
  onClose,
  onSaved,
}: {
  formPath?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const token = localStorage.getItem("jwt_token") || "";
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const src =
    `${API_BASE_URL}/form-builder.html` +
    `?token=${encodeURIComponent(token)}` +
    `&api=${encodeURIComponent(API_BASE_URL + "/api")}` +
    (formPath ? `&formPath=${encodeURIComponent(formPath)}` : "");

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "FORMIO_FORM_SAVED") {
        onSaved();
      }
      if (e.data?.type === "FORMIO_BUILDER_CLOSED") {
        onClose();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onClose, onSaved]);

  return (
    <div className="h-[calc(100vh-80px)] w-full flex flex-col animate-fadeIn bg-canvas rounded-panel border border-canvas-active overflow-hidden shadow-soft relative">
      {/* Loading Skeleton while Iframe downloads Form.io dependencies */}
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-canvas backdrop-blur-sm animate-pulse-soft">
          <i className="fas fa-circle-notch fa-spin text-brand-500 text-3xl mb-4"></i>
          <p className="text-sm font-semibold text-ink-secondary tracking-widest uppercase">
            Loading Workspace...
          </p>
        </div>
      )}
      <iframe
        src={src}
        onLoad={() => setIframeLoaded(true)}
        className={`flex-1 border-none w-full h-full transition-opacity duration-300 ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
        title="Form Builder"
        allow="clipboard-write"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Route View: Form Builder
// WHY WE DO THIS: Extracts the dynamic :formPath from the URL to drive the builder.
// ──────────────────────────────────────────────────────────
function FormBuilderView() {
  const { formPath } = useParams(); // Retrieves dynamic segment (e.g., /forms/my-form)
  const navigate = useNavigate();

  // "new" is our reserved path for creating forms
  const isNew = formPath === "new";
  const pathProp = isNew ? undefined : formPath;

  const handleClose = () => {
    // Navigate strictly back to the parent forms index route
    navigate("..");
  };

  const handleSaved = () => {
    // Optionally trigger a toast notification here
    console.log("Form saved via iframe event.");
  };

  return (
    <div className="h-full p-4 md:p-6 bg-canvas">
      <FormBuilderContainer
        formPath={pathProp}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </div>
  );
}

type SortOption = "newest" | "oldest" | "az" | "za";

// ──────────────────────────────────────────────────────────
// Route View: Form List (The Grid)
// ──────────────────────────────────────────────────────────
function FormListView() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteConfirm, setDeleteConfirm] = useState<FormDef | null>(null);
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem("jwt_token") || "";

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/forms/form?type=form&limit=1000&select=_id,title,path,name,tags,modified`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load forms");

      let data = await res.json();
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (parseError) {
          console.error("Double JSON parse failed:", parseError);
        }
      }

      setForms(Array.isArray(data) ? data : data.forms || []);
    } catch (e) {
      console.error("Failed to load forms:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleDelete = async (form: FormDef) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forms/${form.path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setDeleteConfirm(null);
      await loadForms();
    } catch (e) {
      alert("Failed to delete form. Please check your connection.");
    } finally {
      setDeleting(false);
    }
  };

  // WHY WE DO THIS: useMemo caches the heavily calculated sorting/filtering list
  // so React doesn't rebuild it on every single keystroke, improving dashboard performance.
  const processedForms = useMemo(() => {
    let result = forms.filter(
      (f) =>
        f.title?.toLowerCase().includes(search.toLowerCase()) ||
        f.path?.toLowerCase().includes(search.toLowerCase()),
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case "az":
          return a.title.localeCompare(b.title);
        case "za":
          return b.title.localeCompare(a.title);
        case "oldest":
          return (
            new Date(a.modified || 0).getTime() -
            new Date(b.modified || 0).getTime()
          );
        case "newest":
        default:
          return (
            new Date(b.modified || 0).getTime() -
            new Date(a.modified || 0).getTime()
          );
      }
    });

    return result;
  }, [forms, search, sortBy]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-canvas p-6 md:p-10 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink-primary tracking-tight">
            Form Manager
          </h1>
          <p className="text-xs text-ink-tertiary mt-1 font-medium">
            Build and manage forms for your workflows.
          </p>
        </div>
        <button
          onClick={() => navigate("new")} // Native React Router relative link
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-brand-sm transition-all"
        >
          <i className="fas fa-plus"></i> New Form
        </button>
      </div>

      {/* Controls (Search & Sort) */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs"></i>
          <input
            type="text"
            placeholder="Search by title or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-canvas-active rounded-xl text-sm text-ink-primary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-all shadow-soft"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none pl-4 pr-10 py-2.5 bg-surface border border-canvas-active rounded-xl text-sm font-medium text-ink-secondary outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition-all shadow-soft cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">A to Z</option>
            <option value="za">Z to A</option>
          </select>
          <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 text-xs pointer-events-none"></i>
        </div>
      </div>

      {/* Form Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 bg-surface rounded-card border border-canvas-active animate-pulse"
            />
          ))}
        </div>
      ) : processedForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 bg-canvas-subtle rounded-2xl flex items-center justify-center mb-5 shadow-soft border border-canvas-active">
            <i className="fas fa-wpforms text-3xl text-neutral-400"></i>
          </div>
          <h3 className="text-lg font-bold text-ink-primary mb-2">
            {search ? "No matching forms" : "No forms yet"}
          </h3>
          <p className="text-sm text-ink-tertiary mb-6">
            {search
              ? "Try a different search term or clear filters."
              : "Create your first form to use in your workflows."}
          </p>
          {!search && (
            <button
              onClick={() => navigate("new")}
              className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold shadow-brand-sm hover:bg-brand-600 transition-all"
            >
              <i className="fas fa-plus mr-2"></i>Create First Form
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {processedForms.map((form) => (
            <FormCard
              key={form._id}
              form={form}
              onEdit={() => navigate(form.path)} // Pushes the form ID to the URL!
              onDelete={() => setDeleteConfirm(form)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-primary/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface rounded-panel shadow-premium p-7 max-w-sm w-full border border-canvas-active animate-slideUp">
            <div className="w-14 h-14 bg-status-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash text-status-error text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-ink-primary text-center mb-2">
              Delete Form?
            </h3>
            <p className="text-sm text-ink-secondary text-center mb-6">
              This will permanently delete{" "}
              <strong>"{deleteConfirm.title}"</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-canvas-subtle border border-canvas-active text-ink-secondary font-bold rounded-xl text-sm hover:bg-canvas-active transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-status-error text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50 shadow-soft"
              >
                {deleting ? (
                  <i className="fas fa-circle-notch fa-spin"></i>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Form card component
// ──────────────────────────────────────────────────────────
function FormCard({
  form,
  onEdit,
  onDelete,
}: {
  form: FormDef;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const modified = form.modified
    ? new Date(form.modified).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const displayTags = (form.tags || []).filter((t) => !t.startsWith("tenant:"));

  return (
    <div
      className="bg-surface border border-canvas-active rounded-card p-5 hover:border-brand-300 hover:shadow-lifted transition-all group flex flex-col cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-sm">
          <i className="fas fa-wpforms text-lg"></i>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-ink-primary truncate group-hover:text-brand-600 transition-colors">
            {form.title}
          </h3>
          <code className="text-[10px] text-accent-600 font-mono bg-accent-50 border border-accent-200 px-1.5 py-0.5 rounded mt-1 inline-block">
            {form.path}
          </code>
        </div>
      </div>

      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold px-2 py-0.5 bg-canvas-subtle text-ink-secondary rounded-full border border-canvas-active"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-canvas-active flex items-center justify-between">
        {modified && (
          <span className="text-[10px] text-ink-tertiary font-medium">
            <i className="far fa-clock mr-1.5"></i>
            {modified}
          </span>
        )}
        <div className="flex gap-1 ml-auto">
          {/* Stop propagation on delete to prevent triggering the card's onClick */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-neutral-400 hover:text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
            title="Delete form"
          >
            <i className="fas fa-trash text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Main Export: The Forms Router
// WHY WE DO THIS: Allows the parent React app to simply mount <FormManager />
// and all the internal sub-routing (list vs edit) works automatically!
// ──────────────────────────────────────────────────────────
export default function FormManager() {
  return (
    <FormErrorBoundary>
      <Routes>
        <Route index element={<FormListView />} />
        {/* Dynamic route matching /forms/new OR /forms/my-custom-form */}
        <Route path=":formPath" element={<FormBuilderView />} />
      </Routes>
    </FormErrorBoundary>
  );
}
