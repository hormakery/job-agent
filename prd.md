Incorporating the **$\ge 50\%$ match score threshold** creates a practical design: instead of attempting to tailor every posting, the system scores jobs upfront to filter out weak leads, saving API tokens and preventing false resume tailoring.

An updated, end-to-end architectural plan and implementation roadmap is outlined below, using **Google Gemini** as the core LLM engine.

---

## 1. System Architecture Overview

The system is organized into **4 specialized micro-agents** coordinated by a central orchestrator state graph (such as **LangGraph**).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LangGraph Orchestrator                          │
└──────┬────────────────────┬────────────────────┬────────────────────┬──┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Agent 1:    │    │  Agent 2:    │    │  Agent 3:    │    │  Agent 4:    │
│  Scraper &   │───►│ Match Evalu  │───►│ Inbox & ATS  │───►│  Calendar &  │
│  Sourcing    │    │ & Tailor     │    │ Monitoring   │    │  Human-Loop  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │                     ▲
                           ▼                     │
                 ┌───────────────────────────────────┐
                 │     Google Sheets (Source of      │
                 │      Truth & State Tracking)      │
                 └───────────────────────────────────┘

```

---

## 2. Agent Responsibilities & Workflow

### Agent 1: Sourcing & Pre-Filtering Agent

* **Role:** Fetches raw listings across target roles (*Software, Mobile, Frontend, Deployment/DevOps*).
* **Execution:** Queries APIs like JSearch or SerpAPI. Passes raw HTML/text into `gemini-2.5-flash` with a Pydantic schema to extract:
* `company_name`, `role_title`, `location`, `is_remote` (bool), `sponsorship_explicitly_mentioned` (bool), `job_url`.



---

### Agent 2: Score Evaluator & Resume Tailor Agent

* **Role:** Evaluates the fit between your base resume and the job description, applying your threshold rule before generating a final application.
* **Logic Flow:**
1. **Pre-Assessment Step:** `gemini-2.5-flash` calculates an upfront match percentage ($0-100\%$) based on hard skills ($50\%$), role alignment ($30\%$), and domain knowledge ($20\%$).
2. **Threshold Gate Check:**
* **If Match Score $< 50\%$:** Skip tailoring. Log to Google Sheets with status `Skipped (<50% Match)` and record the reason (e.g., "Missing required language: Swift").
* **If Match Score $\ge 50\%$:** Pass to `gemini-2.5-pro` to rewrite bullet points using impact metrics (Star method), generate a tailored Markdown/PDF resume, and set status to `Tailored & Ready`.





---

### Agent 3: Inbox Monitor & Response Agent

* **Role:** Monitors your inbox for replies, updates application history, and routes interview requests.
* **Execution:**
* Uses the **Gmail API** to check for unread threads matching companies in the Google Sheet.
* Sends thread text to `gemini-2.5-flash` for classification: `[Interview Invite, Rejection, Assessment Request, Neutral]`.
* If **Rejection / Assessment**: Updates the row status in Google Sheets automatically.
* If **Interview Invite**: Updates status to `Interview Requested` and triggers Agent 4.



---

### Agent 4: Interview & Calendar Coordinator (Human-in-the-Loop)

* **Role:** Interfaces with you to pick interview slots and manages calendar scheduling.
* **Execution:**
* Uses the **Google Calendar API** to find open slots on your calendar.
* Sends an alert to your preferred communication channel (Slack Bot, Telegram, or Web UI) with options:
> *"Company X wants to schedule an interview! Your available slots: Option A (Tue 10 AM), Option B (Wed 2 PM). Which would you like?"*


* Once you select a date, Agent 4 adds the event to Google Calendar, creates reminders, and drafts an email response for Agent 3 to send upon final approval.



---

## 3. Google Sheets State Schema

The Google Sheet functions as the centralized relational database for all 4 agents (`gspread` library):

| Column Name | Modifying Agent | Description / Sample Value |
| --- | --- | --- |
| `Job ID` | Agent 1 | Unique MD5 Hash of `Company_Role` |
| `Company Name` | Agent 1 | Stripe |
| `Role Title` | Agent 1 | Senior Mobile Engineer |
| `Initial Match Score` | Agent 2 | `58%` |
| `Passed Gate (>=50%)` | Agent 2 | `TRUE` |
| `Gap Analysis` | Agent 2 | "Missing Swift UI experience; strong in React Native" |
| `Status` | Agent 2 / 3 / 4 | `Skipped` | `Applied` | `Interview Requested` | `Scheduled` |
| `Tailored Resume Link` | Agent 2 | Drive / PDF Link |
| `Interview Date` | Agent 4 | `2026-11-04 10:00:00` |

---

## 4. Complete Implementation Code (Agent 2 Gatekeeper)

Below is a complete Python script demonstrating how **Agent 2** scores a job description, enforces the $\ge 50\%$ threshold gatekeeper, and conditionally generates a tailored resume using the official `google-genai` SDK.

```python
import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# 1. Structured Schema for Pre-Assessment
class MatchEvaluation(BaseModel):
    match_score: int = Field(description="Percentage match from 0 to 100 based on core skills and requirements.")
    missing_critical_skills: list[str] = Field(description="Key skills required in JD but missing in master resume.")
    passed_threshold: bool = Field(description="True if match_score is >= 50, otherwise False.")
    reasoning: str = Field(description="Brief explanation of the score.")

# 2. Master Function for Agent 2 Gatekeeper
def process_job_application(master_resume: str, job_description: str) -> dict:
    
    # STEP A: Evaluate Match Percentage with gemini-2.5-flash
    eval_prompt = f"""
    Compare the following Master Resume against the Job Description.
    Calculate an honest match score from 0 to 100%. 
    Rule: Set 'passed_threshold' to True ONLY if match_score >= 50.
    
    Master Resume:
    {master_resume}
    
    Job Description:
    {job_description}
    """
    
    eval_response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=eval_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=MatchEvaluation,
            temperature=0.1
        )
    )
    
    evaluation = json.loads(eval_response.text)
    
    # STEP B: Check Gate Threshold (<50% Match Logic)
    if not evaluation["passed_threshold"]:
        return {
            "status": "SKIPPED",
            "match_score": evaluation["match_score"],
            "reason": f"Match score {evaluation['match_score']}% is below 50% cutoff.",
            "missing_skills": evaluation["missing_critical_skills"],
            "tailored_resume": None
        }

    # STEP C: Tailor Resume with gemini-2.5-pro if Match >= 50%
    tailor_prompt = f"""
    You are an expert resume editor. The candidate has passed the initial 50% match cutoff ({evaluation['match_score']}% match).
    Tailor the Master Resume for this Job Description by emphasizing relevant experience and aligning terminology.
    DO NOT fabricate false experience or fake projects. Rephrase real accomplishments using high-impact metrics.
    
    Master Resume:
    {master_resume}
    
    Job Description:
    {job_description}
    """
    
    tailor_response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=tailor_prompt,
        config=types.GenerateContentConfig(
            temperature=0.3
        )
    )
    
    return {
        "status": "READY_TO_APPLY",
        "match_score": evaluation["match_score"],
        "reason": evaluation["reasoning"],
        "missing_skills": evaluation["missing_critical_skills"],
        "tailored_resume": tailor_response.text
    }

```

---

## 5. Execution Roadmap

1. **Phase 1 (Data & Storage Setup):** Build the Google Sheet using `gspread` and prepare your Master Resume in structured Markdown or JSON format.
2. **Phase 2 (Scraper & Evaluator Agent):** Implement Agent 1 and Agent 2 using the snippet above. Run a test batch on 20 raw job listings to verify that the $\ge 50\%$ match score gate operates properly.
3. **Phase 3 (Inbox & Google Calendar Integrations):** Set up OAuth credentials for Gmail API and Google Calendar API. Build Agent 3's inbox parsing loop and Agent 4's notification trigger.
4. **Phase 4 (Orchestration):** Connect all agents into a unified workflow using LangGraph or a lightweight Python scheduler script.