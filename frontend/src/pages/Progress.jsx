import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, Calendar, Target, ArrowLeft, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const Progress = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, getHistory, getProgress, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [scoreData, setScoreData] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageScore: 0,
    currentStreak: 0,
    bestScore: 0,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadProgressData = async () => {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        // Get progress data for chart
        const progressResult = await getProgress(30);
        if (progressResult.success && progressResult.data.length > 0) {
          setScoreData(progressResult.data.slice(-8)); // Last 8 data points
        }

        // Get exercise history
        const historyResult = await getHistory(20);
        if (historyResult.success) {
          setExerciseHistory(historyResult.data);
          
          // Calculate stats from history
          const sessions = historyResult.data;
          const totalSessions = sessions.length;
          const avgScore = sessions.length > 0 
            ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length)
            : 0;
          const bestScore = sessions.length > 0 
            ? Math.max(...sessions.map(s => s.score || 0))
            : 0;
          
          // Calculate streak (consecutive days with sessions)
          let streak = 0;
          if (sessions.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const sessionDates = [...new Set(sessions.map(s => 
              s.timestamp?.toDate?.()?.toISOString()?.split('T')[0] || ''
            ))].filter(d => d).sort().reverse();
            
            let currentDate = today;
            for (const date of sessionDates) {
              if (date === currentDate || isConsecutive(date, currentDate)) {
                streak++;
                currentDate = date;
              } else break;
            }
          }
          
          setStats({
            totalSessions,
            averageScore: avgScore,
            currentStreak: streak,
            bestScore,
          });
        }
      } catch (err) {
        console.error("Failed to load progress:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProgressData();
  }, [isAuthenticated, authLoading, navigate, getHistory, getProgress]);

  const isConsecutive = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  };

  const maxScore = scoreData.length > 0 ? Math.max(...scoreData.map((d) => d.averageScore || 0), 100) : 100;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#7C6CFF] mx-auto mb-4" />
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto h-full">
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">
            Progress Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Track your speech therapy journey
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { 
              label: "Total Sessions", 
              value: stats.totalSessions || userProfile?.totalSessions || 0, 
              icon: "🎯",
              color: "from-blue-400 to-indigo-500",
              bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50"
            },
            { 
              label: "Average Score", 
              value: `${stats.averageScore || userProfile?.averageScore || 0}%`, 
              icon: "📊",
              color: "from-green-400 to-emerald-500",
              bgColor: "bg-gradient-to-br from-green-50 to-emerald-50"
            },
            { 
              label: "Current Streak", 
              value: stats.currentStreak, 
              icon: "🔥",
              color: "from-orange-400 to-red-500",
              bgColor: "bg-gradient-to-br from-orange-50 to-red-50"
            },
            { 
              label: "Best Score", 
              value: `${stats.bestScore}%`, 
              icon: "🏆",
              color: "from-yellow-400 to-orange-500",
              bgColor: "bg-gradient-to-br from-yellow-50 to-orange-50"
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`${item.bgColor} rounded-2xl shadow-md p-4 transform hover:scale-105 transition-all duration-300 border border-white/50`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                <div className={`bg-gradient-to-r ${item.color} w-8 h-8 rounded-full opacity-20`}></div>
              </div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                {item.label}
              </p>
              <p className={`text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Scores Chart */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 border border-white/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  Recent Performance
                </h2>
                <p className="text-xs text-gray-500">Last 8 sessions</p>
              </div>
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                 Scores
              </div>
            </div>

            <div className="flex items-end justify-around gap-2 h-48 bg-gradient-to-t from-indigo-50/50 to-transparent rounded-xl p-3">
              {scoreData.length > 0 ? scoreData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div
                    className="w-full rounded-t-lg relative flex items-start justify-center pt-2 transition-all duration-300 group-hover:scale-105 shadow-md"
                    style={{
                      height: `${(data.averageScore / maxScore) * 100}%`,
                      background: `linear-gradient(180deg, ${
                        data.averageScore >= 90 ? '#10b981' : 
                        data.averageScore >= 80 ? '#3b82f6' : 
                        data.averageScore >= 70 ? '#f59e0b' : '#ef4444'
                      }, ${
                        data.averageScore >= 90 ? '#059669' : 
                        data.averageScore >= 80 ? '#2563eb' : 
                        data.averageScore >= 70 ? '#d97706' : '#dc2626'
                      })`,
                      minHeight: '40px'
                    }}
                  >
                    <span className="text-sm font-bold text-white drop-shadow-lg">
                      {Math.round(data.averageScore)}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-600 mt-2">
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>No session data yet. Complete some exercises to see your progress!</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Excellent (90+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-gray-600">Good (80-89)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-gray-600">Fair (70-79)</span>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 border border-white/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">
                  Recent Sessions
                </h2>
                <p className="text-xs text-gray-500">Your latest practice results</p>
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                History
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {exerciseHistory.length > 0 ? exerciseHistory.slice(0, 10).map((session, index) => (
                <div
                  key={session.id || index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 capitalize">
                      {session.exerciseType || 'General'} Exercise
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">
                      "{session.exerciseText}"
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      (session.score || 0) >= 90 ? 'text-green-600' :
                      (session.score || 0) >= 70 ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {Math.round(session.score || 0)}%
                    </p>
                    <p className="text-xs text-gray-400">
                      {session.timestamp?.toDate?.()?.toLocaleDateString() || 'Recent'}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No sessions yet.</p>
                  <p className="text-sm mt-2">Complete some exercises to see your history!</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Motivational Footer */}
        <div className="mt-6 text-center">
          <div className="inline-block bg-white/80 backdrop-blur-xl rounded-full px-6 py-2 shadow-md border border-white/50">
            <p className="text-sm text-gray-700">
              {stats.currentStreak > 0 
                ? `You're on a ${stats.currentStreak} day streak! Keep going! ` 
                : "Start your journey today! "}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Progress;
