export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface ComplianceLevel {
  pass: boolean;
  violations: number;
}

export interface WcagCompliance {
  level_a: ComplianceLevel;
  level_aa: ComplianceLevel;
  level_aaa: { not_tested: boolean };
}

export interface VisualEvidence {
  frame_timestamp: string;
  description: string;
  frame_image_url?: string;
}

export interface CodeEvidence {
  file: string;
  line: number;
  snippet: string;
}

export interface SuggestedFix {
  code: string;
  explanation: string;
}

export interface Violation {
  id?: string;
  severity: Severity;
  wcag_criterion: string;
  title: string;
  description: string;
  visual_evidence?: VisualEvidence;
  code_evidence?: CodeEvidence;
  reasoning?: string;
  user_impact: string;
  suggested_fix: SuggestedFix;
}

export interface AuditSummary {
  total_violations: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AuditReport {
  overall_score: number;
  wcag_compliance: WcagCompliance;
  violations: Violation[];
  summary: AuditSummary;
  analyzed_at?: string;
}

export type AnalysisStatus = 'idle' | 'extracting' | 'analyzing' | 'complete' | 'error';

// --- Auth & Project Types ---

export interface User {
  userId: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Project {
  projectId: string;
  userId: string;
  projectName: string;
  websiteUrl?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  auditCount: number;
  latestScore: number;
}

export interface AuditRecord {
  auditId: string;
  projectId: string;
  userId: string;
  auditVersion: number;
  timestamp: string;
  accessibilityScore: number;
  wcagCompliance: {
    levelA: boolean;
    levelAA: boolean;
    levelAAA: boolean;
  };
  totalViolations: number;
  violationsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  fullReport: AuditReport;
  notes?: string;
}