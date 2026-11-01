# AURA — AI Search Intelligence Platform

An enterprise-grade AI Search Visibility and Answer Engine Optimization (AEO) intelligence platform. AURA measures, diagnoses, forecasts, and optimizes brand citations and visibility across next-generation generative search engines powered by Google Gemini.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Overview](#database-overview)
5. [Environment Variables](#environment-variables)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [How to Start Backend](#how-to-start-backend)
9. [How to Start Frontend](#how-to-start-frontend)
10. [How to Obtain & Configure Gemini API Key](#how-to-obtain--configure-gemini-api-key)
11. [Main API & User Workflow](#main-api--user-workflow)
12. [Main Project Features](#main-project-features)
13. [Important Limitations](#important-limitations)

---

## 1. Project Overview

As traditional search results are increasingly supplanted by AI-generated conversational answers, brands lose traditional SEO signals. **AURA** provides complete transparency into generative search behavior:
- **Tracks** whether and how AI models cite your brand compared to competitors.
- **Analyzes** entity ranking, sentiment, and grounded web sources.
- **Calculates** mathematical metrics (Visibility Score, Average Position, Perceived Sentiment, Share of Voice, Mention Counts).
- **Diagnoses** root causes of organic invisibility and topic/source gaps.
- **Forecasts** visibility trajectory using linear regression.
- **Synthesizes** evidence-based optimization recommendations powered by Gemini.

---

## 2. Architecture

AURA follows a decoupled, service-oriented architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 Client                      │
│       (Dashboard, Visualizations, Workspaces, Prompts)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (port 3000 -> 8000)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Engine                   │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────┐  │
│  │ Company / Project │ │ Metrics & Forecast│ │ Diagnosis │  │
│  │ Management        │ │ Services          │ │ Service   │  │
│  └───────────────────┘ └───────────────────┘ └───────────┘  │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
┌───────────────▼─────────────┐ ┌─────────────▼───────────────┐
│     PostgreSQL Database     │ │   Google Gemini 2.5 Flash   │
│ (12 Core Application Tables)│ │     (Search Grounding)      │
└─────────────────────────────┘ └─────────────────────────────┘
```

- **Backend Core**: FastAPI async Python service with SQLAlchemy 2.0 ORM and Pydantic schemas.
- **Frontend Core**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Lucide icons, and Recharts.
- **Database**: PostgreSQL with strict foreign keys, cascade protections, and unique constraints.
- **AI Provider**: Google Gemini API exclusively (`google-genai` SDK) with Google Search grounding enabled.

---

## 3. Technology Stack

### Backend
- **Python**: 3.11+
- **Framework**: FastAPI 0.115+
- **ASGI Server**: Uvicorn
- **ORM & DB**: SQLAlchemy 2.0 + Psycopg 3
- **Migrations**: Alembic
- **AI Engine**: `google-genai` (Gemini API with Google Search Grounding)
- **Validation**: Pydantic v2

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5+
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 2.15
- **Icons**: Lucide React

---

## 4. Database Overview

The PostgreSQL database contains exactly 12 core application tables plus Alembic version tracking:

1. **`users`**: Platform administrators and workspace owners.
2. **`companies`**: Top-level client or business entities.
3. **`brands`**: Target brands belonging to a company with industry classifications.
4. **`projects`**: Workspace contexts linking a company, target brand, and monitoring objective.
5. **`prompts`**: Test prompts categorized by intent (awareness, consideration, comparison, purchase).
6. **`search_runs`**: Execution log of prompt queries sent to Gemini.
7. **`ai_responses`**: Raw LLM output and structured response metadata.
8. **`entities`**: Extracted brand entities, mention positions, and target brand flags.
9. **`sources`**: Grounded web domains and URLs cited in responses.
10. **`citations`**: Mappings connecting search runs and specific URL sources.
11. **`metrics`**: Daily aggregated project metrics (enforced by `uq_metrics_project_date`).
12. **`recommendations`**: Evidence-backed recommendations prioritized by impact.
- **`alembic_version`**: Migration revision state tracking.

---

## 5. Environment Variables

### Backend (`backend/.env`)
```bash
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database Configuration (SQLAlchemy 2.0 with Psycopg 3)
DATABASE_URL=postgresql+psycopg://postgres:<PASSWORD>@localhost:5432/ai_search_intelligence

# Gemini AI Configuration (Single Provider)
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
GEMINI_MODEL=gemini-robotics-er-2-preview
GEMINI_SEARCH_GROUNDING_ENABLED=true
```

### Frontend (`frontend/.env.local`)
```bash
# FastAPI Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 6. Backend Setup

1. Navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials and Gemini API Key
   ```
5. Apply database migrations:
   ```bash
   alembic upgrade head
   ```

---

## 7. Frontend Setup

1. Navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Configure environment file `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Verify production build:
   ```bash
   npm run build
   ```

---

## 8. How to Start Backend

From the `backend/` folder (with virtual environment active):
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be accessible at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/api/v1/health`

---

## 9. How to Start Frontend

From the `frontend/` folder:
```bash
npm run dev -- -p 3000
```
Open your browser at `http://127.0.0.1:3000`.

---

## 10. How to Obtain & Configure Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Click **Get API key** and generate a new key.
4. Open `backend/.env` and paste:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeneratedKeyHere
   ```
5. Restart the FastAPI backend server.

> **Security Note**: Never commit `backend/.env` to Git. It is listed in `.gitignore`. The Gemini API key is accessed exclusively on the server side and is never exposed to the frontend.

---

## 11. Main API & User Workflow

The platform operates through an end-to-end intelligence cycle:

1. **Create Company & Target Brand**: Define the business and target identity.
2. **Create Project Workspace**: Configure a brand intelligence project.
3. **Register Search Prompts**: Seed prompts spanning *awareness*, *consideration*, and *purchase*.
4. **Execute AI Search Runs**: Query Gemini with Google Search Grounding enabled.
5. **Analyze AI Responses**: Extract brand mentions, position rank, and sentiment.
6. **Extract Grounding Sources**: Parse citations and referenced web domains.
7. **Calculate Project Metrics**: Compute deterministic visibility, SOV, and sentiment.
8. **Diagnose Root Causes**: Benchmark against competitors and detect content/source gaps.
9. **Synthesize Recommendations**: Generate strategic, evidence-backed next steps.
10. **View Visual Analytics**: Explore interactive charts and trends in the dashboard.

---

## 12. Main Project Features

- **Executive KPI Cards**: Real-time display of AI Visibility (%), Average Position (#), Sentiment (-1 to +1), Share of Voice (%), and Total Mentions.
- **Visibility & Sentiment Trend Lines**: Historical multi-day tracking of brand presence and sentiment trajectory.
- **Share of Voice Donut**: Proportional breakdown of mentions among market competitors.
- **Competitor Benchmark Bar Chart**: Head-to-head visibility ranking of detected rival brands.
- **7-Day Linear Regression Forecast**: Algorithmic projection of visibility trajectory with confidence indicators.
- **Root-Cause Diagnostic Engine**: Evidence-backed explanations identifying topic deficiencies and source absence.
- **Grounded Source Gap Analyzer**: Clear inventory of authoritative domains citing competitors but missing the target brand.
- **Actionable AI Recommendations**: Structured, prioritized tasks (content, PR, SEO, technical) linked to empirical metrics.
- **End-to-End Workflow UI**: Interactive modals for project creation, prompt CRUD, search execution, and metric refreshes.

---

## 13. Important Limitations

1. **AI Provider Scope**: Google Gemini (`gemini-robotics-er-2-preview` or `gemini-1.5-flash`) is the single AI engine utilized. Other search engines (OpenAI SearchGPT, Perplexity) are not part of the schema.
2. **Search Grounding Latency**: Live Google Search grounding queries via Gemini require approximately 2–5 seconds per prompt execution.
3. **Historical Forecast Threshold**: A minimum of 3 distinct metric dates is required to compute the linear regression forecast. Workspaces with fewer points display an explanatory placeholder.
4. **Authentication & Multi-tenancy**: The database schema includes a `users` table for architecture compliance, but full authentication/session middleware is intentionally out of scope for this demo release.
