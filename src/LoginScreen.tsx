import React from "react";
import { useParams } from "react-router-dom"; // 🟢 1. Import useParams
import { GOOGLE_LOGIN_URL } from "./config";

export default function LoginScreen() {
  // 🟢 2. Logic: Auto-detect Tenant ID from URL
  const { tenantId } = useParams<{ tenantId: string }>();
  const activeWorkspace = tenantId || "default";

  const handleGoogleLogin = () => {
    window.location.href = `${GOOGLE_LOGIN_URL}?tenantId=${activeWorkspace}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Shapes (Bronze Theme) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-40 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-slate-200 rounded-full blur-3xl opacity-50"></div>

      <div className="relative bg-white p-10 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 animate-slide-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-orange-500/30">
            <i className="fas fa-layer-group"></i>
          </div>

          {/* 🟢 4. UI RESTORED: "InfinityPlus" branding is back */}
          <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">
            InfinityPlus
          </h1>
          <p className="text-slate-400 text-sm">Sign in to your dashboard</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-sm group"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5 group-hover:scale-110 transition-transform"
            />
            <span>Continue with Google</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Secure Access
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>
        </div>

        {/* Subtle footer to confirm context (Optional - helpful for debugging) */}
        <p className="mt-8 text-center text-xs text-slate-400">
          Powered by InfinityPlus System
        </p>
      </div>
    </div>
  );
}
