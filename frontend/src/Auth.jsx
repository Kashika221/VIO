import { useNavigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';

const AuthButton = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-3">
        {/* User Profile */}
        <div className="flex items-center gap-2">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'}
              className="h-8 w-8 rounded-full border-2 border-[#17153B]"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-medium text-sm">
              {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden md:block text-sm font-medium text-[#17153B]">
            {user.displayName || user.email?.split('@')[0] || 'User'}
          </span>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={() => logout()}
          className="px-4 py-2 rounded-full text-sm font-medium bg-slate-200 hover:bg-slate-300 text-[#17153B] transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => navigate('/login')} 
      className="px-4 py-2 rounded-full text-sm font-medium bg-[#17153B] hover:bg-[#26235A] text-white transition-colors"
    >
      Log In
    </button>
  );
};

export default AuthButton;