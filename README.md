# Lenggo: Smart Learning & Coding Reflection Assistant

> **Let it go** — Conquer debugging friction, solidify mental models, and transform stack traces into lifelong engineering mastery with Google Cloud Run, Cloud Firestore, Firebase Authentication, and the Gemini API.

[![Google Cloud Run](https://img.shields.io/badge/Deployed%20on-Google%20Cloud%20Run-blue?logo=google-cloud)](https://cloud.google.com/run)
[![Gemini API](https://img.shields.io/badge/AI%20Engine-Gemini%20API%20(@google/genai)-blueviolet)](https://ai.google.dev/)
[![Firestore ABAC](https://img.shields.io/badge/Security-ABAC%20User%20Isolation-emerald)](https://firebase.google.com/docs/firestore)

---

## 🌟 Application Overview

**Lenggo** is an AI-powered developer reflection and study engine tailored for engineers. It moves beyond standard text journaling by ingesting:
- **Code Snippets & Repositories** (TypeScript, Go, Python, SQL, Rust)
- **Raw Error Stack Traces & Diagnostic Logs**
- **Architectural Decision Records (ADRs) & Trade-offs**

Lenggo harnesses the server-side **Gemini API (`@google/genai`)** with a resilient model fallback ladder (`gemini-3.6-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`) to generate:
1. **Root Cause Analysis & Pedagogical Takeaways**
2. **Interactive Active-Recall Flashcards** with real-time AI grading & retention reminders
3. **Weekly Skill Mastery & Velocity Reports** categorized by technology stack

---

## 🛡️ Threat Model & Security Countermeasures

| Threat Zone | Identified Risk Scenario | OWASP Mapping | Lenggo Mitigation |
| :--- | :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection or oversized payload in reflection / stack traces | OWASP A03 / LLM02 | Strict Zod/TypeScript schema deserialization, defensive default object guards, zero client trust |
| **Planning & Reasoning** | Prompt injection attempting to alter system role or leak prompt | OWASP LLM01 | Parameterized structured schemas with strict output formatting |
| **Tool & Secret Execution** | Exposure of `GEMINI_API_KEY` to client browser DevTools | OWASP A01 / LLM05 | Zero client-side API key exposure. Backend proxy in `server.ts` + Google Secret Manager |
| **Memory & State (Firestore)** | Cross-tenant data leakage or unauthorized document writes | OWASP A01 | Strict Attribute-Based Access Control (`isOwner(userId)`) in `firestore.rules` |
| **Inter-System Communication** | SSRF or unauthenticated API access | OWASP A10 | Containerized Cloud Run runtime running as non-root user `nodejs` |

---

## 🏗️ Architecture Diagram

```
+-------------------------------------------------------------------------+
| Browser Client (Vite + React 18 + Tailwind CSS + Lucide Icons)          |
| - Daily Debugger (Multi-Format Technical Input)                         |
| - Active-Recall Flashcard Practice & AI Grading                         |
| - Mastery & Historical Archives Dashboard                               |
+-----------------------------------+-------------------------------------+
                                    |
                    HTTPS / REST API| /api/*
                                    v
+-------------------------------------------------------------------------+
| Google Cloud Run / Express Server (Node 20, Single-Port 3000)          |
| - Deserialization & Payload Sanitization Middleware                     |
| - Resilient Gemini Fallback Ladder (`gemini-3.6-flash`, etc.)           |
| - Safe Undefined-Stripping Persistence Engine                           |
+-------------------+-------------------------------+---------------------+
                    |                               |
                    v                               v
+------------------------------------+   +--------------------------------+
| Google Cloud Secret Manager        |   | Cloud Firestore (Firebase)     |
| - `GEMINI_API_KEY` (Role-Bounded)  |   | - /users/{userId}/reflections  |
+------------------------------------+   | - /users/{userId}/quizzes      |
                                         | - /users/{userId}/mastery      |
                                         | - Strict ABAC Security Rules   |
                                         +--------------------------------+
```

---

## 🔒 Firestore Security Rules (`firestore.rules`)

Owner-isolated security rules ensure each developer only accesses their own study records:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId}/reflections/{reflectionId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/quizzes/{quizId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId}/mastery/{reportId} {
      allow read, write: if isOwner(userId);
    }
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- Node.js `20.x` or higher
- Google Cloud SDK (`gcloud` CLI)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 2. Install & Configure
```bash
# Clone repository
git clone https://github.com/your-org/lenggo.git
cd lenggo

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY
```

### 3. Run Development Server
```bash
npm run dev
# Server listening on http://localhost:3000
```

---

## ☁️ Google Cloud Run Deployment Guide

### Step 1: Enable Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2: Configure Secret Manager for `GEMINI_API_KEY`
```bash
# Create secret in Google Cloud Secret Manager
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run default compute service account permission to read secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 3: Build & Deploy Container to Cloud Run
```bash
# Build and deploy directly with Cloud Run
gcloud run deploy lenggo-app \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels dev-tutorial=cloud-run-ai-challenge
```

---

## 🧪 Functional Verification & Test Walkthrough

| Feature Area | Verification Step | Expected Outcome |
| :--- | :--- | :--- |
| **1. Multi-Format Input** | Select "Stack Trace & Crash" preset or paste an error trace in Daily Debugger. Click **Deep AI Analysis**. | Gemini decomposes root cause, extracts key takeaways, suggests tags, and displays model used. |
| **2. Persistence** | Click **Save to Firestore**. Refresh page or navigate across tabs. | Entry is persisted under user subcollection and reflected in total reflections counter. |
| **3. Active Recall** | Navigate to **Active Recall Quizzes** tab. Choose a technology tag and click **Generate Active-Recall Quiz**. | AI generates 3-5 high-yield question flashcards with optional code snippets. |
| **4. AI Evaluation** | Type an explanation in the flashcard answer box and click **Grade Answer with AI**. | Instant critique returned with 0-100 score, conceptual feedback, and retention rule. |
| **5. Skill Mastery Report**| Navigate to **Mastery & History** tab. Click **Generate Weekly AI Report**. | Multi-dimensional synthesis of skills, proficiency trends, key wins, and next steps. |
| **6. Search & Filter** | Type in the search box on the History view or filter by difficulty/tag. | History instantly filters to matching logs. |
| **7. Export** | Click **Export JSON** on Mastery Dashboard. | Clean JSON archive downloaded with all user reflections and reports. |
