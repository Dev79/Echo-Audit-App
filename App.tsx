import React from 'react';
import { User, Project, AuditRecord } from './types';
import { getCurrentUser, logout, saveAudit, deleteAudit } from './services/storage';
import { LoginView, SignupView } from './components/Auth';
import { ProjectsListView, ProjectDetailView } from './components/Dashboard';
import AuditWorkspace from './components/AuditWorkspace';
import { AuditDetailView } from './components/AuditDetail';
import { Activity, LogOut } from 'lucide-react';

type AppView = 'login' | 'signup' | 'projects' | 'project-detail' | 'audit' | 'audit-detail';

const App: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<AppView>('login');
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);
  const [selectedAudit, setSelectedAudit] = React.useState<AuditRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  // Inject global styles for animations
  React.useEffect(() => {
    const globalStyles = `
      @keyframes spin-slow {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      .animate-spin-slow {
        animation: spin-slow 3s linear infinite;
      }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = globalStyles;
    document.head.appendChild(styleElement);
    return () => {
        if(document.head.contains(styleElement)) {
            document.head.removeChild(styleElement);
        }
    };
  }, []);
  
  React.useEffect(() => {
    checkAuth();
  }, []);
  
  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setCurrentView('projects');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleLogout() {
    await logout();
    setCurrentUser(null);
    setSelectedProject(null);
    setSelectedAudit(null);
    setCurrentView('login');
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
        </div>
      </div>
    );
  }
  
  // Auth screens
  if (!currentUser) {
    if (currentView === 'signup') {
      return (
        <SignupView 
          onSuccess={(user) => {
            setCurrentUser(user);
            setCurrentView('projects');
          }}
          onSwitch={() => setCurrentView('login')}
        />
      );
    }
    
    return (
      <LoginView 
        onSuccess={(user) => {
          setCurrentUser(user);
          setCurrentView('projects');
        }}
        onSwitch={() => setCurrentView('signup')}
      />
    );
  }
  
  // Main app layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedProject(null); setCurrentView('projects'); }}>
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="text-white" size={18} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              Echo-Audit
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden md:inline">
                {currentUser.displayName}
            </span>
            
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            
            <button
              onClick={() => {
                setSelectedProject(null);
                setCurrentView('projects');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'projects' || (currentView === 'project-detail' && !selectedProject)
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Projects
            </button>
            
            <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 rounded-lg text-sm font-medium transition-colors"
                title="Logout"
            >
              <LogOut size={16} /> <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full flex-grow">
        {currentView === 'projects' && (
          <ProjectsListView 
            userId={currentUser.userId}
            onSelectProject={(project) => {
              setSelectedProject(project);
              setCurrentView('project-detail');
            }}
          />
        )}
        
        {currentView === 'project-detail' && selectedProject && (
          <ProjectDetailView 
            project={selectedProject}
            onBack={() => setCurrentView('projects')}
            onStartAudit={() => setCurrentView('audit')}
            onSelectAudit={(audit) => {
              setSelectedAudit(audit);
              setCurrentView('audit-detail');
            }}
          />
        )}
        
        {currentView === 'audit' && selectedProject && (
          <AuditWorkspace 
            project={selectedProject}
            userId={currentUser.userId}
            onComplete={async (auditReport) => {
              await saveAudit(selectedProject.projectId, currentUser.userId, auditReport);
              setCurrentView('project-detail');
            }}
            onCancel={() => setCurrentView('project-detail')}
          />
        )}

        {currentView === 'audit-detail' && selectedAudit && selectedProject && (
          <AuditDetailView
            audit={selectedAudit}
            project={selectedProject}
            onBack={() => setCurrentView('project-detail')}
            onDelete={async () => {
              await deleteAudit(selectedAudit.auditId, selectedProject.projectId);
              setCurrentView('project-detail');
            }}
          />
        )}
      </main>
      
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-slate-600 text-sm">
        <p>© 2025 Echo-Audit. Powered by Gemini 3.0 Pro.</p>
      </footer>
    </div>
  );
};

export default App;