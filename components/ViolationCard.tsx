import React, { useState } from 'react';
import { Violation, Severity } from '../types';
import { AlertTriangle, Code, Eye, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface Props {
  violation: Violation;
}

const severityColor = (s: Severity) => {
  switch (s) {
    case Severity.CRITICAL: return 'border-l-red-500 bg-red-950/20';
    case Severity.HIGH: return 'border-l-orange-500 bg-orange-950/20';
    case Severity.MEDIUM: return 'border-l-yellow-500 bg-yellow-950/20';
    case Severity.LOW: return 'border-l-blue-500 bg-blue-950/20';
    default: return 'border-l-slate-500';
  }
};

const severityBadge = (s: Severity) => {
  switch (s) {
    case Severity.CRITICAL: return 'text-red-400 bg-red-950/50 border-red-900';
    case Severity.HIGH: return 'text-orange-400 bg-orange-950/50 border-orange-900';
    case Severity.MEDIUM: return 'text-yellow-400 bg-yellow-950/50 border-yellow-900';
    case Severity.LOW: return 'text-blue-400 bg-blue-950/50 border-blue-900';
  }
};

const ViolationCard: React.FC<Props> = ({ violation }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(violation.suggested_fix.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`border-l-4 rounded-r-lg mb-4 p-4 bg-slate-800/50 border-slate-700 transition-all ${severityColor(violation.severity)}`}>
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 text-xs font-bold uppercase rounded border ${severityBadge(violation.severity)}`}>
              {violation.severity}
            </span>
            <span className="text-slate-400 text-xs font-mono">{violation.wcag_criterion}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-100">{violation.title}</h3>
          <p className="text-slate-400 text-sm mt-1">{violation.description}</p>
        </div>
        <button className="text-slate-400 hover:text-white p-1">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-6 space-y-6 animate-fadeIn">
          {/* Visual Evidence */}
          {violation.visual_evidence && (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-300 mb-2">
                <Eye size={16} /> Visual Evidence
              </h4>
              <p className="text-sm text-slate-300">
                <span className="text-slate-500 font-mono mr-2">[{violation.visual_evidence.frame_timestamp}]</span>
                {violation.visual_evidence.description}
              </p>
            </div>
          )}

          {/* Code Evidence */}
          {violation.code_evidence && (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-300 mb-2">
                <Code size={16} /> Code Source
              </h4>
              <div className="font-mono text-xs text-slate-400 mb-2">
                {violation.code_evidence.file}:{violation.code_evidence.line}
              </div>
              <pre className="bg-black/30 p-3 rounded text-sm text-slate-200 overflow-x-auto border border-slate-800">
                <code>{violation.code_evidence.snippet}</code>
              </pre>
            </div>
          )}

          {/* Reasoning */}
          <div className="relative pl-4 border-l-2 border-indigo-500/30">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Gemini Analysis</h4>
            <p className="text-sm text-slate-300 italic leading-relaxed">"{violation.reasoning}"</p>
          </div>

          {/* Suggested Fix */}
          <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold text-emerald-400">Suggested Fix</h4>
              <button 
                onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                className="text-xs flex items-center gap-1 text-emerald-400/70 hover:text-emerald-400 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
            <pre className="bg-black/30 p-3 rounded text-sm text-emerald-100/90 overflow-x-auto border border-emerald-900/30 font-mono">
              <code>{violation.suggested_fix.code}</code>
            </pre>
            <p className="text-xs text-emerald-400/60 mt-2">{violation.suggested_fix.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationCard;