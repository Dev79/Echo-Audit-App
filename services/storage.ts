import { User, Project, AuditRecord, AuditReport } from '../types';
import { generateAuditReport } from '../utils/scoring';

// Polyfill for the requested window.storage API behavior using localStorage
const storageAPI = {
  get: async (key: string, _bg: boolean) => {
    const val = localStorage.getItem(key);
    if (val === null) throw new Error("Not found");
    return { value: val };
  },
  set: async (key: string, value: string, _bg: boolean) => {
    localStorage.setItem(key, value);
  },
  delete: async (key: string, _bg: boolean) => {
    localStorage.removeItem(key);
  }
};

// ============= SECURITY UTILS =============

// Rate limiting state (in-memory)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Input sanitization to prevent XSS
function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Generate CSRF token
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============= USER AUTHENTICATION =============

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  // Use PBKDF2 with 100,000 iterations for better security
  const salt = encoder.encode('echo-audit-salt-v1'); // In production, use random salt per user
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  
  const hashArray = Array.from(new Uint8Array(derivedBits));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function createUser(email: string, password: string, displayName: string): Promise<User> {
  const emailKey = `user_email:${email.toLowerCase()}`;
  
  try {
    await storageAPI.get(emailKey, false);
    throw new Error('An account with this email already exists');
  } catch {
    // Email doesn't exist, proceed
  }
  
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const passwordHash = await hashPassword(password);
  
  const user: User = {
    userId,
    email: email.toLowerCase(),
    passwordHash,
    displayName: sanitizeInput(displayName),
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };
  
  await storageAPI.set(`user:${userId}`, JSON.stringify(user), false);
  await storageAPI.set(emailKey, userId, false);
  
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const emailLower = email.toLowerCase();
  const now = Date.now();
  
  // Check rate limiting
  const attempts = loginAttempts.get(emailLower);
  if (attempts) {
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const timeSinceLast = now - attempts.lastAttempt;
      if (timeSinceLast < LOCKOUT_DURATION) {
        const minutesLeft = Math.ceil((LOCKOUT_DURATION - timeSinceLast) / 60000);
        throw new Error(`Too many login attempts. Please try again in ${minutesLeft} minutes.`);
      } else {
        // Reset after lockout period
        loginAttempts.delete(emailLower);
      }
    }
  }

  const emailKey = `user_email:${emailLower}`;
  
  try {
    const userIdResult = await storageAPI.get(emailKey, false);
    const userId = userIdResult.value;
    const userResult = await storageAPI.get(`user:${userId}`, false);
    
    if (!userResult) {
      throw new Error('Invalid email or password');
    }
    
    const user: User = JSON.parse(userResult.value);
    const passwordHash = await hashPassword(password);
    
    if (passwordHash !== user.passwordHash) {
       throw new Error('Invalid email or password');
    }
    
    // Successful login - reset attempts
    loginAttempts.delete(emailLower);
    
    user.lastLoginAt = new Date().toISOString();
    await storageAPI.set(`user:${userId}`, JSON.stringify(user), false);
    
    return user;

  } catch (error: any) {
    // Track failed attempt
    const current = loginAttempts.get(emailLower) || { count: 0, lastAttempt: 0 };
    loginAttempts.set(emailLower, { count: current.count + 1, lastAttempt: now });
    throw new Error('Invalid email or password');
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const sessionResult = await storageAPI.get('current_session', false);
    if (!sessionResult) return null;
    
    // Check if legacy session (string) or new session object
    let userId: string;
    let sessionData: any = null;

    try {
        sessionData = JSON.parse(sessionResult.value);
        if (typeof sessionData === 'string') {
             // Legacy fallback
             userId = sessionData;
        } else {
             userId = sessionData.userId;
             // Check if session has expired
             const timeSinceActivity = Date.now() - (sessionData.lastActivity || 0);
             if (timeSinceActivity > SESSION_TIMEOUT) {
                 await logout();
                 return null;
             }
             // Update last activity
             await setCurrentUser(userId);
        }
    } catch {
        // Plain string fallback
        userId = sessionResult.value;
    }
    
    const userResult = await storageAPI.get(`user:${userId}`, false);
    
    if (!userResult) return null;
    return JSON.parse(userResult.value);
  } catch {
    return null;
  }
}

export async function setCurrentUser(userId: string): Promise<void> {
  const sessionData = {
    userId,
    lastActivity: Date.now(),
    csrfToken: generateCSRFToken()
  };
  await storageAPI.set('current_session', JSON.stringify(sessionData), false);
}

export async function logout(): Promise<void> {
  await storageAPI.delete('current_session', false);
}

// ============= PROJECT MANAGEMENT =============

export async function createProject(
  userId: string, 
  projectName: string, 
  websiteUrl?: string, 
  description?: string
): Promise<Project> {
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const project: Project = {
    projectId,
    userId,
    projectName: sanitizeInput(projectName),
    websiteUrl: websiteUrl ? sanitizeInput(websiteUrl) : undefined,
    description: description ? sanitizeInput(description) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    auditCount: 0,
    latestScore: 0
  };
  
  await storageAPI.set(`project:${projectId}`, JSON.stringify(project), false);
  
  const userProjectsKey = `user_projects:${userId}`;
  try {
    const existing = await storageAPI.get(userProjectsKey, false);
    const projectIds = JSON.parse(existing.value);
    projectIds.push(projectId);
    await storageAPI.set(userProjectsKey, JSON.stringify(projectIds), false);
  } catch {
    await storageAPI.set(userProjectsKey, JSON.stringify([projectId]), false);
  }
  
  return project;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const userProjectsKey = `user_projects:${userId}`;
  
  try {
    const result = await storageAPI.get(userProjectsKey, false);
    const projectIds: string[] = JSON.parse(result.value);
    const projects: Project[] = [];
    
    for (const projectId of projectIds) {
      try {
        const projectResult = await storageAPI.get(`project:${projectId}`, false);
        projects.push(JSON.parse(projectResult.value));
      } catch {
        // Skip missing projects
      }
    }
    
    return projects.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const result = await storageAPI.get(`project:${projectId}`, false);
    return JSON.parse(result.value);
  } catch {
    return null;
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');
  
  // Sanitize updates if they contain strings
  const sanitizedUpdates = { ...updates };
  if (sanitizedUpdates.projectName) sanitizedUpdates.projectName = sanitizeInput(sanitizedUpdates.projectName);
  if (sanitizedUpdates.websiteUrl) sanitizedUpdates.websiteUrl = sanitizeInput(sanitizedUpdates.websiteUrl);
  if (sanitizedUpdates.description) sanitizedUpdates.description = sanitizeInput(sanitizedUpdates.description);

  const updatedProject = {
    ...project,
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString()
  };
  
  await storageAPI.set(`project:${projectId}`, JSON.stringify(updatedProject), false);
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const audits = await getProjectAudits(projectId);
  for (const audit of audits) {
    await storageAPI.delete(`audit:${audit.auditId}`, false);
  }
  
  await storageAPI.delete(`project_audits:${projectId}`, false);
  await storageAPI.delete(`project:${projectId}`, false);
  
  const userProjectsKey = `user_projects:${userId}`;
  try {
    const result = await storageAPI.get(userProjectsKey, false);
    const projectIds: string[] = JSON.parse(result.value);
    const filtered = projectIds.filter(id => id !== projectId);
    await storageAPI.set(userProjectsKey, JSON.stringify(filtered), false);
  } catch {
      // Ignore if key not found
  }
}

// ============= AUDIT MANAGEMENT =============

export async function saveAudit(
  projectId: string, 
  userId: string, 
  auditReport: AuditReport
): Promise<AuditRecord> {
  const project = await getProject(projectId);
  if (!project) throw new Error('Project not found');
  if (project.userId !== userId) throw new Error('Unauthorized');
  
  const auditVersion = project.auditCount + 1;
  const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Recalculate scoring deterministically to ensure data integrity
  const deterministicReport = generateAuditReport(auditReport.violations);
  
  const audit: AuditRecord = {
    auditId,
    projectId,
    userId,
    auditVersion,
    timestamp: new Date().toISOString(),
    accessibilityScore: deterministicReport.overall_score,
    wcagCompliance: {
      levelA: deterministicReport.wcag_compliance.level_a.pass,
      levelAA: deterministicReport.wcag_compliance.level_aa.pass,
      levelAAA: !deterministicReport.wcag_compliance.level_aaa.not_tested,
    },
    totalViolations: deterministicReport.summary.total_violations,
    violationsBySeverity: {
      critical: deterministicReport.summary.critical,
      high: deterministicReport.summary.high,
      medium: deterministicReport.summary.medium,
      low: deterministicReport.summary.low
    },
    fullReport: deterministicReport,
    notes: ''
  };
  
  await storageAPI.set(`audit:${auditId}`, JSON.stringify(audit), false);
  
  const projectAuditsKey = `project_audits:${projectId}`;
  try {
    const existing = await storageAPI.get(projectAuditsKey, false);
    const auditIds = JSON.parse(existing.value);
    auditIds.push(auditId);
    await storageAPI.set(projectAuditsKey, JSON.stringify(auditIds), false);
  } catch {
    await storageAPI.set(projectAuditsKey, JSON.stringify([auditId]), false);
  }
  
  await updateProject(projectId, {
    auditCount: auditVersion,
    latestScore: audit.accessibilityScore
  });
  
  return audit;
}

export async function getProjectAudits(projectId: string): Promise<AuditRecord[]> {
  const projectAuditsKey = `project_audits:${projectId}`;
  
  try {
    const result = await storageAPI.get(projectAuditsKey, false);
    const auditIds: string[] = JSON.parse(result.value);
    const audits: AuditRecord[] = [];
    
    for (const auditId of auditIds) {
      try {
        const auditResult = await storageAPI.get(`audit:${auditId}`, false);
        audits.push(JSON.parse(auditResult.value));
      } catch {
        // Skip missing audits
      }
    }
    
    return audits.sort((a, b) => b.auditVersion - a.auditVersion); // Descending order
  } catch {
    return [];
  }
}

export async function getAudit(auditId: string): Promise<AuditRecord | null> {
  try {
    const result = await storageAPI.get(`audit:${auditId}`, false);
    return JSON.parse(result.value);
  } catch {
    return null;
  }
}

export async function updateAuditNotes(auditId: string, notes: string): Promise<void> {
  const result = await storageAPI.get(`audit:${auditId}`, false);
  const audit: AuditRecord = JSON.parse(result.value);
  audit.notes = sanitizeInput(notes);
  await storageAPI.set(`audit:${auditId}`, JSON.stringify(audit), false);
}

export async function deleteAudit(auditId: string, projectId: string): Promise<void> {
  await storageAPI.delete(`audit:${auditId}`, false);
  
  const projectAuditsKey = `project_audits:${projectId}`;
  try {
    const result = await storageAPI.get(projectAuditsKey, false);
    const auditIds: string[] = JSON.parse(result.value);
    const filtered = auditIds.filter(id => id !== auditId);
    await storageAPI.set(projectAuditsKey, JSON.stringify(filtered), false);
  } catch {
      // Ignore
  }
}