export type ApplicationStatus =
  | "Skipped (<50% Match)"
  | "Tailored & Ready"
  | "Application Drafted"
  | "Applied"
  | "Assessment Requested"
  | "Rejected"
  | "Interview Requested"
  | "Scheduled";

export type SourcePlatform =
  | "LinkedIn"
  | "Indeed"
  | "Glassdoor"
  | "Direct"
  | "Other";

export type SubmissionMethod = "email_submission" | "portal_submission";

export interface CandidateProfile {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  location: string;
  target_roles: string[];
  years_experience?: number;
}

export interface ApplicationDispatchItem {
  application_id: string;
  job_id: string;
  company_name: string;
  role_title: string;
  source_platform: SourcePlatform;
  submission_method: SubmissionMethod;
  destination_email?: string;
  portal_url?: string;
  candidate_email: string;
  candidate_linkedin: string;
  candidate_portfolio: string;
  email_subject?: string;
  email_body?: string;
  screening_answers?: Record<string, string>;
  resume_pdf_path: string;
  status: "drafted" | "approved" | "sent" | "failed";
  created_at: string;
  dispatched_at?: string;
}

export interface JobSheetRow {
  job_id: string;
  company_name: string;
  role_title: string;
  source_platform: string;
  initial_match_score: number;
  passed_gate: boolean;
  gap_analysis: string;
  status: ApplicationStatus;
  submission_method: string;
  date_applied?: string;
  tailored_resume_link: string;
  interview_date: string;
  job_url: string;
  location: string;
  is_remote: boolean;
  sponsorship_explicitly_mentioned: boolean;
  missing_critical_skills: string[];
  matched_skills: string[];
  raw_description: string;
  tailored_markdown: string;
  local_pdf_path: string;
  updated_at: string;
}

export interface DashboardStats {
  total_jobs_sourced: number;
  passed_gate_count: number;
  skipped_below_threshold_count: number;
  tailored_ready_count: number;
  application_drafted_count: number;
  applied_count: number;
  interview_requested_count: number;
  scheduled_count: number;
  rejected_count: number;
  average_match_score: number;
}

export interface MatchEvaluation {
  match_score: number;
  missing_critical_skills: string[];
  matched_skills: string[];
  passed_threshold: boolean;
  reasoning: string;
  ats_source: string;
}

export interface EmailClassification {
  thread_id: string;
  company_name: string;
  role_title: string;
  job_id?: string;
  category: "Interview Invite" | "Rejection" | "Assessment Request" | "Neutral";
  summary: string;
  proposed_times_raw: string[];
  sender_email: string;
  subject: string;
  received_at: string;
}

export interface CalendarSlot {
  slot_id: string;
  label: string;
  start_iso: string;
  end_iso: string;
}

export interface InterviewCoordinationItem {
  job_id: string;
  thread_id: string;
  company_name: string;
  role_title: string;
  recruiter_email: string;
  subject: string;
  email_summary: string;
  available_slots: CalendarSlot[];
  selected_slot_id?: string;
  draft_reply: string;
  status: "pending_selection" | "scheduled_and_sent";
}

