import React from 'react';
import { Project, AuditRecord } from '../types';
import { getUserProjects, createProject, getProjectAudits, deleteProject } from '../services/storage';
import { Plus, Layout, Globe, Activity, ArrowLeft, Play, Calendar, Trash2 } from 'lucide-react';

interface ProjectsListProps {
  userId: string;
  onSelectProject: (project: Project) => void;
}

export function ProjectsListView({ userId, onSelectProject }: ProjectsListProps) {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  
  React.useEffect(() => {
    loadProjects();
  }, []);
  
  async function loadProjects() {
    const userProjects = await getUserProjects(userId);
    setProjects(userProjects);
    setLoading(false);
  }
  
  if (loading) return (
    <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-white">My Projects</h1>
            <p className="text-slate-400 mt-1">Manage and track accessibility audits</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-white transition-colors shadow-lg shadow-indigo-900/20"
        >
          <Plus size={18} /> New Project
        </button>
      </div>
      
      {projects.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
             <Layout size={32} className="text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-200 mb-2">No projects yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">Create your first project to start auditing your applications for accessibility compliance.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-white transition-colors"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <button
              key={project.projectId}
              onClick={() => onSelectProject(project)}
              className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-6 text-left transition-all hover:shadow-xl hover:shadow-indigo-900/10 flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4 w-full">
                 <div className="p-3 bg-slate-900 rounded-lg text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-900/20 transition-colors">
                    <Globe size={24} />
                 </div>
                 {project.auditCount > 0 ? (
                    <div className={`px-2 py-1 rounded text-xs font-bold border ${project.latestScore >= 80 ? 'bg-green-950/30 text-green-400 border-green-900' : project.latestScore >= 50 ? 'bg-yellow-950/30 text-yellow-400 border-yellow-900' : 'bg-red-950/30 text-red-400 border-red-900'}`}>
                        Score: {project.latestScore}
                    </div>
                 ) : (
                    <div className="px-2 py-1 rounded text-xs font-bold border bg-slate-800 text-slate-500 border-slate-700">
                        New
                    </div>
                 )}
              </div>
              
              <h3 className="font-bold text-xl text-slate-100 mb-1 group-hover:text-indigo-200 transition-colors line-clamp-1">{project.projectName}</h3>
              {project.websiteUrl ? (
                 <p className="text-sm text-slate-400 mb-4 truncate w-full">{project.websiteUrl}</p>
              ) : (
                 <p className="text-sm text-slate-500 mb-4 italic">No URL provided</p>
              )}
              
              <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center w-full">
                <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Activity size={12} /> {project.auditCount} Audits
                </span>
                <span className="text-xs text-slate-500">
                    Updated {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {showCreate && (
        <CreateProjectDialog
          onClose={() => setShowCreate(false)}
          onCreate={async (name, url, desc) => {
            const project = await createProject(userId, name, url, desc);
            setProjects([project, ...projects]);
            setShowCreate(false);
            onSelectProject(project);
          }}
        />
      )}
    </div>
  );
}

interface CreateProjectDialogProps {
    onClose: () => void;
    onCreate: (name: string, url?: string, desc?: string) => void;
}

function CreateProjectDialog({ onClose, onCreate }: CreateProjectDialogProps) {
  const [projectName, setProjectName] = React.useState('');
  const [websiteUrl, setWebsiteUrl] = React.useState('');
  const [description, setDescription] = React.useState('');
  
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;
    onCreate(projectName.trim(), websiteUrl.trim() || undefined, description.trim() || undefined);
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg w-full shadow-2xl">
        <h3 className="text-2xl font-bold mb-6 text-white">Create New Project</h3>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. My Portfolio Website"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white transition-colors"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Website URL (Optional)</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white transition-colors"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white resize-none transition-colors"
            />
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
                type="submit" 
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ProjectDetailProps {
    project: Project;
    onBack: () => void;
    onStartAudit: () => void;
    onSelectAudit: (audit: AuditRecord) => void;
}

export function ProjectDetailView({ project, onBack, onStartAudit, onSelectAudit }: ProjectDetailProps) {
  const [audits, setAudits] = React.useState<AuditRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  React.useEffect(() => {
    loadAudits();
  }, [project.projectId]);
  
  async function loadAudits() {
    const projectAudits = await getProjectAudits(project.projectId);
    setAudits(projectAudits);
    setLoading(false);
  }
  
  const latestAudit = audits[0];
  const previousAudit = audits[1];
  const scoreImprovement = previousAudit && latestAudit
    ? latestAudit.accessibilityScore - previousAudit.accessibilityScore
    : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-white mb-3 transition-colors text-sm font-medium">
             <ArrowLeft size={16} /> Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-white mb-1">{project.projectName}</h1>
          {project.websiteUrl && (
             <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1">
                <Globe size={14} /> {project.websiteUrl}
             </a>
          )}
        </div>
        <button 
            onClick={onStartAudit} 
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white transition-colors shadow-lg shadow-indigo-900/20"
        >
          <Play size={20} fill="currentColor" /> Run New Audit
        </button>
      </div>
      
      {audits.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-6 shadow-lg border border-indigo-500/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
            <div>
              <p className="text-indigo-200 text-sm mb-1 font-medium">Latest Score</p>
              <p className="text-4xl font-bold text-white">{latestAudit.accessibilityScore}</p>
            </div>
            {previousAudit && (
              <div>
                <p className="text-indigo-200 text-sm mb-1 font-medium">Score Change</p>
                <p className={`text-4xl font-bold ${
                  scoreImprovement > 0 ? 'text-green-400' : 
                  scoreImprovement < 0 ? 'text-red-400' : 'text-slate-200'
                }`}>
                  {scoreImprovement > 0 ? '+' : ''}{scoreImprovement}
                </p>
              </div>
            )}
            <div>
              <p className="text-indigo-200 text-sm mb-1 font-medium">Total Audits</p>
              <p className="text-4xl font-bold text-white">{audits.length}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-sm mb-1 font-medium">Current Violations</p>
              <p className="text-4xl font-bold text-white">{latestAudit.totalViolations}</p>
            </div>
          </div>
        </div>
      )}
      
      {audits.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-12 text-center mt-8">
          <p className="text-slate-400 mb-4">No audits recorded for this project yet.</p>
          <button onClick={onStartAudit} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors">
            Run First Audit
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-indigo-400" /> Audit History
          </h2>
          <div className="space-y-4">
            {audits.map((audit) => {
               const isLatest = audit.auditId === latestAudit.auditId;
               return (
                <button 
                  key={audit.auditId} 
                  onClick={() => onSelectAudit(audit)}
                  className={`w-full bg-slate-800 rounded-xl border overflow-hidden transition-all hover:shadow-lg text-left group
                    ${isLatest ? 'border-indigo-500/50 hover:border-indigo-500' : 'border-slate-700 hover:border-slate-500'}`}
                >
                   <div className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center shrink-0 font-bold border border-slate-700">
                                  <span className={`${audit.accessibilityScore >= 80 ? 'text-green-400' : audit.accessibilityScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                      {audit.accessibilityScore}
                                  </span>
                              </div>
                              <div>
                                  <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-lg text-slate-200 group-hover:text-white transition-colors">Version {audit.auditVersion}</h4>
                                      {isLatest && <span className="text-[10px] font-bold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">Latest</span>}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-slate-400">
                                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(audit.timestamp).toLocaleString()}</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-6 w-full md:w-auto mt-2 md:mt-0 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                              <div className="text-center px-2">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Violations</div>
                                  <div className="text-white font-mono font-medium">{audit.totalViolations}</div>
                              </div>
                              <div className="w-px h-8 bg-slate-700"></div>
                              <div className="text-center px-2">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Critical</div>
                                  <div className="text-red-400 font-mono font-medium">{audit.violationsBySeverity.critical}</div>
                              </div>
                              <div className="w-px h-8 bg-slate-700"></div>
                              <div className="text-center px-2">
                                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pass Rate</div>
                                  <div className="text-slate-300 font-mono text-xs mt-1">
                                      {audit.wcagCompliance.levelA ? 'A' : '-'}/{audit.wcagCompliance.levelAA ? 'AA' : '-'}
                                  </div>
                              </div>
                          </div>
                      </div>
                   </div>
                </button>
               );
            })}
          </div>
        </div>
      )}
      
      <div className="pt-8 border-t border-slate-800">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg transition-colors text-sm font-medium"
        >
          <Trash2 size={16} /> Delete Project
        </button>
      </div>
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-red-400">Delete Project?</h3>
            <p className="text-slate-300 mb-8">
              This will permanently delete "{project.projectName}" and all {audits.length} audit(s). 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteProject(project.projectId, project.userId);
                  onBack(); // Go back to list
                }}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}