# Implementation Plan: Service Request Q&A

This feature allows Professionals to ask clarifying questions on specific Service Requests and allows Homeowners to answer them visibly for all potential bidders.

## 1. Database Schema

We will create a new table `service_request_questions` to store the interaction.

### New Table: `service_request_questions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary Key |
| `request_id` | `bigint` | FK to `service_requests`. The job being discussed. |
| `pro_id` | `uuid` | FK to `profiles`. The professional asking the question. |
| `question` | `text` | The question text. |
| `answer` | `text` | The homeowner's answer (nullable). |
| `created_at` | `timestamp` | When the question was asked. |
| `answered_at` | `timestamp` | When the answer was provided. |

### RLS Policies (Security)
*   **Select (View):** All authenticated users can view questions for an open request.
*   **Insert (Ask):** Only **Professionals** (optionally: only *verified* pros) can insert a new row.
*   **Update (Answer):** Only the **Homeowner** who owns the `request_id` can update the `answer` column.

## 2. Frontend Components

### A. Shared "Q&A List" Component
A reusable component that displays the list of questions and answers for a given request.
*   **Pros see:** A list of existing Q&A. A button to "Post a Question".
*   **Homeowners see:** A list of existing Q&A. Empty answers will have an "Answer This" input box.

### B. Update `ServiceRequestsList.jsx` (Pro View)
*   Add a **"Q&A" button** to the `ServiceRequestCard`.
*   Clicking it expands a section (or opens a modal) showing the **Q&A List**.
*   Include a form for Pros to submit a new question.

### C. Update `HomeownerDashboard.jsx` (Homeowner View)
*   Add a **"Q&A" badge** to the homeowner's request cards (e.g., "3 Questions, 1 Unanswered").
*   Clicking it opens the Q&A management view where they can type and save answers.

## 3. Implementation Steps

1.  **Database Migration:**
    *   Write and run SQL to create the table and policies.
2.  **Context/API Update:**
    *   Add functions to `ServiceContext` or directly use Supabase in components to:
        *   `fetchQuestions(requestId)`
        *   `postQuestion(requestId, text)`
        *   `answerQuestion(questionId, text)`
3.  **UI Construction:**
    *   Create the `RequestQnA` component.
    *   Integrate into `ServiceRequestCard` (Read/Ask mode).
    *   Integrate into `HomeownerDashboard` (Answer mode).
4.  **Testing:**
    *   Verify Pro can ask.
    *   Verify Homeowner can answer.
    *   Verify all Pros can see the Q&A.

## 4. Impact on Existing Functions
*   **No breaking changes.** This is an additive feature.
*   The "Bidding" flow remains separate.
*   Existing data remains untouched.
