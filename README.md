# 🧠 RecallLoop — 1-4-7 Spaced Repetition System

A full-stack web app that schedules your revisions automatically using the **1-4-7 rule**:
- **Revision 1** → Study Date + 1 day
- **Revision 2** → Study Date + 4 days
- **Revision 3** → Study Date + 7 days

Revision dates are **never stored** — they are always computed dynamically.

---

## 📁 Folder Structure

```
spaced-rep/
│
├── backend/
│   ├── server.js       ← Express app + all API routes
│   ├── db.js           ← SQLite database setup (topics + completions tables)
│   ├── dateUtils.js    ← All date calculation logic (1-4-7 rule)
│   ├── package.json    ← Node dependencies
│   └── topics.db       ← Auto-created SQLite file (don't edit manually)
│
└── frontend/
    └── index.html      ← Complete single-file UI (HTML + CSS + JS)
```

---

## ⚙️ Setup Instructions (Node.js)

### Prerequisites
- Node.js v16 or higher → https://nodejs.org
- npm (comes with Node.js)

### Step 1 — Install dependencies
```bash
cd spaced-rep/backend
npm install
```

### Step 2 — Start the backend server
```bash
node server.js
```
You should see:
```
🧠 Spaced Repetition Server running at http://localhost:3000
```

### Step 3 — Open the frontend
Open `frontend/index.html` in your browser directly, **or** visit:
```
http://localhost:3000
```
(The backend serves the frontend automatically via `express.static`)

---

## 📡 API Reference

| Method | Endpoint        | Description                          |
|--------|-----------------|--------------------------------------|
| POST   | /add-topic      | Add a new topic with a study date    |
| GET    | /reminders      | Get today's due/overdue revisions    |
| GET    | /topics         | Get all topics + computed rev dates  |
| POST   | /complete       | Mark a revision as completed         |
| DELETE | /topic/:id      | Delete a topic                       |

### POST /add-topic
```json
{ "topic_name": "Operating Systems", "study_date": "2025-04-20" }
```

### POST /complete
```json
{ "topic_id": 1, "revision_number": 1 }
```

---

## 🧪 Sample Test Data

To quickly populate with test data, run this in your terminal:

```bash
# Replace YYYY-MM-DD with today's date and yesterday/3-days-ago etc.

# Topic due for Revision 1 today (study date = yesterday)
curl -X POST http://localhost:3000/add-topic \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "Binary Search Trees", "study_date": "YESTERDAY_DATE"}'

# Topic due for Revision 2 today (study date = 4 days ago)
curl -X POST http://localhost:3000/add-topic \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "TCP/IP Stack", "study_date": "4_DAYS_AGO_DATE"}'

# Topic with future revisions (study date = today)
curl -X POST http://localhost:3000/add-topic \
  -H "Content-Type: application/json" \
  -d '{"topic_name": "Dijkstra Algorithm", "study_date": "TODAY_DATE"}'
```

---

## 🗃️ Database Schema

```sql
CREATE TABLE topics (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_name  TEXT    NOT NULL,
  study_date  TEXT    NOT NULL   -- YYYY-MM-DD only, NO revision dates stored
);

CREATE TABLE completions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id        INTEGER NOT NULL,
  revision_number INTEGER NOT NULL,  -- 1, 2, or 3
  completed_at    TEXT    NOT NULL,
  UNIQUE(topic_id, revision_number)
);
```

---

## ✨ Features

- ✅ Add topics with study dates
- ✅ Auto-calculates revision dates (never stored in DB)
- ✅ Shows today's reminders on page load
- ✅ Highlights overdue revisions
- ✅ Mark revisions as completed
- ✅ Delete topics
- ✅ Visual revision status dots for each topic
- ✅ Responsive mobile-friendly design
- ✅ Dark theme with polished UI

---

## 💡 How It Works

```
User adds topic "Arrays" with study date 2025-04-20
         ↓
Backend stores: { topic_name: "Arrays", study_date: "2025-04-20" }
         ↓
When GET /reminders is called on 2025-04-21:
  revision1 = 2025-04-20 + 1 = 2025-04-21  ← MATCHES TODAY → show reminder
  revision2 = 2025-04-20 + 4 = 2025-04-24  ← future, skip
  revision3 = 2025-04-20 + 7 = 2025-04-27  ← future, skip
```
# 1-4-7-recaller
