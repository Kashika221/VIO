// src/pages/PhysioProgress.jsx
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";

const PHYSIO_HTTP_BASE = "https://raiselegexercise.onrender.com";

export default function PhysioProgress() {
  const { user, isAuthenticated, loginWithRedirect } = useAuth0();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const authUserId = isAuthenticated ? user.sub : null;

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        if (!isAuthenticated) {
          await loginWithRedirect();
          return;
        }

        setLoading(true);
        setError("");

        const res = await axios.post(
          `${PHYSIO_HTTP_BASE}/progress_report`,
          {},
          { params: { user_id: authUserId } }
        );
        console.log("physio progress:", res.data);
        setProgress(res.data);
      } catch (err) {
        console.error("progress error:", err);
        if (err.response && err.response.status === 404) {
          setError("No physio sessions found for this user yet.");
        } else {
          setError("Could not load physio progress. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authUserId]);

  const totalReps = progress?.total_reps ?? 0;
  const totalDuration = progress?.total_duration ?? 0;
  const sessionHistory = progress?.session_history ?? [];

  const formatDateTime = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8E7FF] to-[#C9D4FF] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-[32px] shadow-2xl bg-white/80 backdrop-blur-md border border-[#E6E2FF] px-6 py-8 md:px-10 md:py-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#4B3BCB] shadow-sm">
              Physiotherapy Progress
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-[#17153B]">
              Your Raise‑Leg Exercise Report
            </h1>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-slate-600">Loading your physio progress...</p>
        )}

        {error && !loading && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && progress && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Summary + session history */}
            <div className="space-y-5">
              <div className="rounded-2xl bg-white/80 border border-[#E6E2FF] p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#17153B]">
                  Summary
                </h2>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Total repetitions</span>
                    <span className="font-semibold">{totalReps}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total duration</span>
                    <span className="font-semibold">
                      {totalDuration.toFixed(1)} s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sessions completed</span>
                    <span className="font-semibold">
                      {sessionHistory.length}
                    </span>
                  </div>
                  {progress.last_updated && (
                    <div className="flex items-center justify-between">
                      <span>Last updated</span>
                      <span className="font-semibold">
                        {formatDateTime(progress.last_updated)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white/80 border border-[#E6E2FF] p-6 space-y-3">
                <h2 className="text-lg font-semibold text-[#17153B]">
                  Session history
                </h2>

                {sessionHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No sessions saved yet. Complete a physio session and stop it
                    with “Stop &amp; Save Session” to see your history here.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto pr-1 text-sm">
                    {sessionHistory
                      .slice()
                      .reverse()
                      .map((s, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-[#F6F5FF] px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-[#17153B]">
                              {formatDateTime(s.date)}
                            </span>
                            <span className="text-xs text-slate-500">
                              Duration: {s.duration.toFixed(1)} s
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 block">
                              Reps
                            </span>
                            <span className="text-base font-semibold">
                              {s.reps}
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Raw JSON for debugging */}
            <div className="rounded-2xl bg-[#17153B] text-white/90 p-6 text-sm">
              <h2 className="text-lg font-semibold mb-3">Raw report</h2>
              <pre className="whitespace-pre-wrap break-words text-xs md:text-sm max-h-[380px] overflow-y-auto">
                {JSON.stringify(progress, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
