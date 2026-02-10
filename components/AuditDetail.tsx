import React from 'react';
import { AuditRecord, Project, Violation } from '../types';
import { updateAuditNotes } from '../services/storage';
import ViolationCard from './ViolationCard';

interface AuditDetailProps {
  audit: AuditRecord;
  project: Project;
  onBack: () => void;
  onDelete: () => void;
}

export const AuditDetailView: React.FC<AuditDetailProps> = ({ audit, project, onBack, onDelete }) => {
  const [notes, setNotes] = React.useState(audit.notes || '');
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  
  async function saveNotes() {
    await updateAuditNotes(audit.auditId, notes);
    setEditingNotes(false);
  }
  
  // Safeguard if fullReport is missing
  const violations = audit.fullReport?.violations || [];
  
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const highViolations = violations.filter(v => v.severity === 'high');
  const mediumViolations = violations.filter(v => v.severity === 'medium');
  const lowViolations = violations.filter(v => v.severity === 'low');
  
  const scoreColor = 
    audit.accessibilityScore >= 80 ? 'text-green-400' : 
    audit.accessibilityScore >= 60 ? 'text-yellow-400' : 'text-red-400';
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-slate-400 hover:text-white mb-2 transition-colors flex items-center gap-1">
            ← Back to {project.projectName}
          </button>
          <h1 className="text-3xl font-bold text-white">Audit Version {audit.auditVersion}</h1>
          <p className="text-slate-400">{new Date(audit.timestamp).toLocaleString()}</p>
        </div>
        
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-700 rounded-lg transition-colors"
        >
          Delete Audit
        </button>
      </div>
      
      {/* Score Overview */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-8 shadow-lg border border-indigo-500/30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center md:text-left">
          <div>
            <p className="text-indigo-200 text-sm mb-1 font-medium uppercase tracking-wide">Score</p>
            <p className={`text-5xl font-bold ${scoreColor}`}>{audit.accessibilityScore}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-sm mb-1 font-medium uppercase tracking-wide">Violations</p>
            <p className="text-5xl font-bold text-white">{audit.totalViolations}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-sm mb-1 font-medium uppercase tracking-wide">Level A</p>
            <p className={`text-3xl font-bold ${audit.wcagCompliance.levelA ? 'text-green-400' : 'text-red-400'}`}>
              {audit.wcagCompliance.levelA ? '✓ Pass' : '✗ Fail'}
            </p>
          </div>
          <div>
            <p className="text-indigo-200 text-sm mb-1 font-medium uppercase tracking-wide">Level AA</p>
            <p className={`text-3xl font-bold ${audit.wcagCompliance.levelAA ? 'text-green-400' : 'text-red-400'}`}>
              {audit.wcagCompliance.levelAA ? '✓ Pass' : '✗ Fail'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Notes Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white">Notes</h3>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              {notes ? 'Edit' : 'Add Notes'}
            </button>
          )}
        </div>
        
        {editingNotes ? (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this audit (e.g., 'After fixing contrast issues')"
              rows={3}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:outline-none focus:border-indigo-500 text-white resize-none"
              autoFocus
            />
            <div className="flex space-x-3">
              <button onClick={saveNotes} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-bold text-white transition-colors">
                Save
              </button>
              <button onClick={() => {
                setNotes(audit.notes || '');
                setEditingNotes(false);
              }} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-300 italic">{notes || 'No notes added.'}</p>
        )}
      </div>
      
      {/* Violations by Severity */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold mb-4 text-white">Violations Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 text-center">
            <p className="text-red-400 text-sm mb-1 uppercase font-bold">Critical</p>
            <p className="text-3xl font-bold text-white">{audit.violationsBySeverity.critical}</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-900/50 rounded-lg p-4 text-center">
            <p className="text-orange-400 text-sm mb-1 uppercase font-bold">High</p>
            <p className="text-3xl font-bold text-white">{audit.violationsBySeverity.high}</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-4 text-center">
            <p className="text-yellow-400 text-sm mb-1 uppercase font-bold">Medium</p>
            <p className="text-3xl font-bold text-white">{audit.violationsBySeverity.medium}</p>
          </div>
          <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 text-center">
            <p className="text-blue-400 text-sm mb-1 uppercase font-bold">Low</p>
            <p className="text-3xl font-bold text-white">{audit.violationsBySeverity.low}</p>
          </div>
        </div>
      </div>
      
      {/* Critical Violations */}
      {criticalViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">🔴 Critical Violations</h3>
          {criticalViolations.map((violation, idx) => (
            <ViolationCard key={idx} violation={violation} />
          ))}
        </div>
      )}
      
      {/* High Violations */}
      {highViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-orange-400 flex items-center gap-2">🟠 High Priority Violations</h3>
          {highViolations.map((violation, idx) => (
            <ViolationCard key={idx} violation={violation} />
          ))}
        </div>
      )}
      
      {/* Medium Violations */}
      {mediumViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">🟡 Medium Priority Violations</h3>
          {mediumViolations.map((violation, idx) => (
            <ViolationCard key={idx} violation={violation} />
          ))}
        </div>
      )}
      
      {/* Low Violations */}
      {lowViolations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">🔵 Low Priority Violations</h3>
          {lowViolations.map((violation, idx) => (
            <ViolationCard key={idx} violation={violation} />
          ))}
        </div>
      )}
      
      {violations.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-16 text-center border border-slate-700">
          <div className="text-6xl mb-6">🎉</div>
          <h3 className="text-2xl font-bold mb-2 text-white">Perfect Accessibility!</h3>
          <p className="text-slate-400">No violations detected in this audit.</p>
        </div>
      )}
      
      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4 animate-fadeIn">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-red-400">Delete Audit?</h3>
            <p className="text-slate-300 mb-8">
              This will permanently delete audit version {audit.auditVersion}. 
              This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors">
                Cancel
              </button>
              <button onClick={onDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-colors">
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};