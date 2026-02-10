import React, { useState, useRef } from 'react';
import { Play, FileVideo, FileCode, AlertCircle, ShieldCheck, Activity, CheckCircle2, Save, ArrowLeft } from 'lucide-react';
import { extractFramesFromVideo } from '../utils/videoProcessor';
import { runAudit } from '../services/geminiService';
import { generateAuditReport } from '../utils/scoring';
import { AuditReport, AnalysisStatus, Project } from '../types';
import ScoreGauge from './ScoreGauge';
import ViolationCard from './ViolationCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AuditWorkspaceProps {
  project: Project;
  userId: string;
  onComplete: (results: AuditReport) => Promise<void>;
  onCancel: () => void;
}

const AuditWorkspace: React.FC<AuditWorkspaceProps> = ({ project, userId, onComplete, onCancel }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [codeFile, setCodeFile] = useState<File | null>(null);
  const [codeContent, setCodeContent] = useState<string>('');
  
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleCodeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCodeFile(file);
      const text = await file.text();
      setCodeContent(text);
      setError(null);
    }
  };

  const startAudit = async () => {
    if (!videoFile || !codeContent) {
      setError("Please upload both a video recording and source code file.");
      return;
    }

    try {
      setStatus('extracting');
      setProgressMessage('Processing video frames (5 FPS)...');
      
      const frames = await extractFramesFromVideo(videoFile);
      
      setStatus('analyzing');
      setProgressMessage('Gemini 3.0 Pro is analyzing visual + code context...');
      
      // Get raw violations from Gemini
      const { violations } = await runAudit(frames, codeContent);
      
      // Calculate score and generate full report client-side
      const fullReport = generateAuditReport(violations);
      
      setReport(fullReport);
      setStatus('complete');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during analysis.");
      setStatus('error');
    }
  };

  const handleSave = async () => {
    if (!report) return;
    setIsSaving(true);
    try {
        await onComplete(report);
    } catch (err) {
        console.error(err);
        setError("Failed to save audit results.");
        setIsSaving(false);
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Workspace Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-700">
        <div>
           <button onClick={onCancel} className="flex items-center gap-1 text-slate-400 hover:text-white mb-2 transition-colors text-sm font-medium">
               <ArrowLeft size={16} /> Cancel Audit
           </button>
           <h2 className="text-2xl font-bold text-white">New Audit: <span className="text-indigo-400">{project.projectName}</span></h2>
           <p className="text-slate-400 text-sm">Version {project.auditCount + 1}</p>
        </div>
      </div>
      
        {/* Intro Section */}
        {!report && status === 'idle' && (
            <div className="mb-12 text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold mb-4 text-white">Multimodal Inspection</h2>
                <p className="text-slate-400">
                    Upload a screen recording of the user flow and the corresponding component source code.
                    <br/><span className="text-sm text-indigo-400 font-mono mt-2 block">Powered by Gemini 3.0 Pro</span>
                </p>
            </div>
        )}

        {/* Input Section */}
        {status === 'idle' && (
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Video Input */}
            <div 
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group
                ${videoFile ? 'border-indigo-500 bg-indigo-950/10' : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleVideoUpload} 
                className="hidden" 
                accept="video/mp4,video/webm,video/quicktime" 
              />
              <div className={`p-4 rounded-full mb-4 ${videoFile ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                {videoFile ? <CheckCircle2 size={32} /> : <FileVideo size={32} />}
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                {videoFile ? videoFile.name : "Upload Screen Recording"}
              </h3>
              <p className="text-sm text-slate-500 text-center">
                {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(2)} MB` : "Drag & drop .mp4, .mov"}
              </p>
            </div>

            {/* Code Input */}
            <div 
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group
                ${codeFile ? 'border-purple-500 bg-purple-950/10' : 'border-slate-700 hover:border-purple-400 hover:bg-slate-800'}`}
              onClick={() => codeInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={codeInputRef} 
                onChange={handleCodeUpload} 
                className="hidden" 
                accept=".tsx,.jsx,.html,.js,.ts" 
              />
               <div className={`p-4 rounded-full mb-4 ${codeFile ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'}`}>
                {codeFile ? <CheckCircle2 size={32} /> : <FileCode size={32} />}
              </div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                {codeFile ? codeFile.name : "Upload Source Code"}
              </h3>
               <p className="text-sm text-slate-500 text-center">
                {codeFile ? `${codeContent.length} chars` : "Upload .tsx component"}
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center">
             {error && (
                <div className="bg-red-950/50 border border-red-900 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2 mb-6">
                    <AlertCircle size={20} />
                    {error}
                </div>
             )}
            <button
                onClick={startAudit}
                disabled={!videoFile || !codeFile}
                className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105
                ${(!videoFile || !codeFile) 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/50'}`}
            >
                <Play size={24} fill="currentColor" />
                Start Accessibility Audit
            </button>
            <div className="mt-4 flex items-center gap-2 text-slate-500 text-sm">
                <ShieldCheck size={16} />
                <span>Secure client-side frame extraction</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(status === 'extracting' || status === 'analyzing') && (
          <div className="max-w-2xl mx-auto text-center py-20">
             <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                    <Activity size={32} />
                </div>
             </div>
             <h3 className="text-2xl font-bold text-white mb-2">{status === 'extracting' ? 'Preprocessing Video' : 'AI Analysis in Progress'}</h3>
             <p className="text-slate-400 animate-pulse">{progressMessage}</p>
             {status === 'analyzing' && (
                <div className="mt-8 p-4 bg-slate-800/50 rounded border border-slate-700 inline-block text-left max-w-lg">
                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                        Thinking Mode
                    </div>
                    <div className="text-slate-500 font-mono text-sm h-24 overflow-hidden relative">
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-800/50 to-transparent pointer-events-none"></div>
                         &gt; Analyzing visual hierarchy...<br/>
                         &gt; Detecting contrast violations...<br/>
                         &gt; Mapping code sources to UI...<br/>
                         &gt; Evaluating WCAG compliance...
                    </div>
                </div>
             )}
          </div>
        )}

        {/* Results Dashboard */}
        {status === 'complete' && report && (
            <div className="animate-fadeIn">
                <div className="mb-6 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-xl flex items-center justify-between sticky top-20 z-40 backdrop-blur-md">
                     <div className="flex items-center gap-3">
                        <CheckCircle2 className="text-green-400" size={24} />
                        <div>
                            <h3 className="font-bold text-white">Audit Complete</h3>
                            <p className="text-indigo-200 text-sm">Review findings before saving.</p>
                        </div>
                     </div>
                     <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all"
                     >
                        {isSaving ? 'Saving...' : <><Save size={18} /> Save Audit</>}
                     </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Score Card */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity size={100} />
                        </div>
                        <h3 className="text-slate-400 font-medium mb-4">Accessibility Score</h3>
                        <ScoreGauge score={report.overall_score} />
                    </div>

                    {/* Summary Card */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-slate-400 font-medium mb-6">Violations Summary</h3>
                        <div className="h-48">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'Critical', value: report.summary.critical, color: '#f87171' },
                                    { name: 'High', value: report.summary.high, color: '#fb923c' },
                                    { name: 'Med', value: report.summary.medium, color: '#facc15' },
                                    { name: 'Low', value: report.summary.low, color: '#60a5fa' },
                                ]}>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        cursor={{fill: '#1e293b'}}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {
                                            [0,1,2,3].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#3b82f6'][index]} />
                                            ))
                                        }
                                    </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Compliance Card */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col justify-center">
                        <h3 className="text-slate-400 font-medium mb-6">WCAG 2.1 Compliance</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded bg-slate-700/30">
                                <span className="font-semibold text-slate-200">Level A</span>
                                {report.wcag_compliance.level_a.pass ? (
                                    <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={16} /> Pass</span>
                                ) : (
                                    <span className="text-red-400 text-sm">{report.wcag_compliance.level_a.violations} Issues</span>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-3 rounded bg-slate-700/30">
                                <span className="font-semibold text-slate-200">Level AA</span>
                                {report.wcag_compliance.level_aa.pass ? (
                                    <span className="text-green-400 flex items-center gap-1"><CheckCircle2 size={16} /> Pass</span>
                                ) : (
                                    <span className="text-red-400 text-sm">{report.wcag_compliance.level_aa.violations} Issues</span>
                                )}
                            </div>
                             <div className="flex items-center justify-between p-3 rounded bg-slate-700/30">
                                <span className="font-semibold text-slate-200">Level AAA</span>
                                <span className="text-slate-500 text-sm">Not Tested</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Violations List */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white">Detailed Violations</h2>
                </div>

                <div className="space-y-2">
                    {report.violations.map((violation, idx) => (
                        <ViolationCard key={violation.id || idx} violation={violation} />
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default AuditWorkspace;