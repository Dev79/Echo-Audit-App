import { Violation, Severity, WcagCompliance, AuditReport, AuditSummary } from '../types';

export function calculateAccessibilityScore(violations: Violation[]): number {
  // WCAG-based scoring algorithm (deterministic)
  const weights = {
    [Severity.CRITICAL]: 15,
    [Severity.HIGH]: 8,
    [Severity.MEDIUM]: 4,
    [Severity.LOW]: 2
  };
  
  // Start with perfect score
  let score = 100;
  
  // Deduct points for each violation
  violations.forEach(violation => {
    score -= weights[violation.severity] || 0;
  });
  
  // Floor at 0 (can't go negative)
  return Math.max(0, Math.round(score));
}

export function determineWCAGCompliance(violations: Violation[]): WcagCompliance {
  const checkLevel = (regex: RegExp) => violations.filter(v => regex.test(v.wcag_criterion));

  // Level A violations (most critical - fundamental accessibility)
  const levelAViolations = checkLevel(
    /^1\.1\.1|^1\.2\.[1-3]|^1\.3\.[1-3]|^1\.4\.1|^2\.1\.[1-2]|^2\.2\.[1-2]|^2\.3\.1|^2\.4\.[1-4]|^3\.1\.1|^3\.2\.[1-2]|^3\.3\.[1-2]|^4\.1\.[1-2]/
  );
  
  // Level AA violations
  const levelAAViolations = checkLevel(
    /^1\.2\.[4-5]|^1\.4\.[3-5]|^2\.4\.[5-7]|^3\.1\.2|^3\.2\.[3-4]|^3\.3\.[3-4]/
  );
  
  // Level AAA (aspirational)
  // Not exhaustively testing AAA in this automation usually, but if present:
  const levelAAAViolations = checkLevel(
    /^1\.2\.[6-9]|^1\.4\.[6-9]|^2\.2\.[3-6]|^2\.3\.[2-3]|^2\.4\.8|^2\.4\.9|^2\.4\.10|^3\.1\.[3-6]|^3\.2\.5|^3\.3\.[5-6]/
  );

  return {
    level_a: {
      pass: levelAViolations.length === 0,
      violations: levelAViolations.length
    },
    level_aa: {
      pass: levelAViolations.length === 0 && levelAAViolations.length === 0,
      violations: levelAAViolations.length
    },
    level_aaa: {
      not_tested: true // Generally considered not fully automated
    }
  };
}

export function generateAuditReport(violations: Violation[]): AuditReport {
  const overall_score = calculateAccessibilityScore(violations);
  const wcag_compliance = determineWCAGCompliance(violations);
  
  const summary: AuditSummary = {
    total_violations: violations.length,
    critical: violations.filter(v => v.severity === Severity.CRITICAL).length,
    high: violations.filter(v => v.severity === Severity.HIGH).length,
    medium: violations.filter(v => v.severity === Severity.MEDIUM).length,
    low: violations.filter(v => v.severity === Severity.LOW).length
  };

  return {
    overall_score,
    wcag_compliance,
    violations,
    summary,
    analyzed_at: new Date().toISOString()
  };
}