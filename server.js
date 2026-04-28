// server.js — Main Express application entry point

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const { createDb }  = require("./db");
const { getTodayUTC, getRevisionDates, getDueRevisions } = require("./dateUtils");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

(async () => {
  const db = await createDb();

  // POST /add-topic
  app.post("/add-topic", (req, res) => {
    const { topic_name, study_date } = req.body;
    if (!topic_name || topic_name.trim() === "")
      return res.status(400).json({ error: "topic_name is required." });
    if (!study_date || !/^\d{4}-\d{2}-\d{2}$/.test(study_date))
      return res.status(400).json({ error: "study_date must be YYYY-MM-DD." });

    const cleanName = topic_name.trim();
    // Only store topic_name + study_date — revision dates are NEVER stored
    const result = db.exec_write(
      "INSERT INTO topics (topic_name, study_date) VALUES (?, ?)",
      [cleanName, study_date]
    );
    const revisionDates = getRevisionDates(study_date);
    res.status(201).json({
      success: true,
      topic: { id: result.lastInsertRowid, topic_name: cleanName, study_date, revisionDates },
    });
  });

  // GET /reminders — dynamically compute which revisions are due today
  app.get("/reminders", (req, res) => {
    const today = req.query.date || getTodayUTC();
    const topics = db.all("SELECT id, topic_name, study_date FROM topics");
    const completedRows = db.all("SELECT topic_id, revision_number FROM completions");

    // Map: topicId → [completed revision numbers]
    const completedMap = {};
    completedRows.forEach(({ topic_id, revision_number }) => {
      if (!completedMap[topic_id]) completedMap[topic_id] = [];
      completedMap[topic_id].push(Number(revision_number));
    });

    const reminders = [];
    topics.forEach((topic) => {
      const dueRevisions = getDueRevisions(topic.study_date, today, completedMap[topic.id] || []);
      dueRevisions.forEach(({ revisionNumber, date, status }) => {
        reminders.push({ topicId: topic.id, topicName: topic.topic_name,
          studyDate: topic.study_date, revisionNumber, revisionDate: date, status });
      });
    });

    // Sort: overdue first, then by revision number ascending
    reminders.sort((a, b) => {
      if (a.status === "overdue" && b.status !== "overdue") return -1;
      if (b.status === "overdue" && a.status !== "overdue") return 1;
      return a.revisionNumber - b.revisionNumber;
    });

    res.json({ today, reminders });
  });

  // GET /topics — all topics with computed revision dates
  app.get("/topics", (req, res) => {
    const topics = db.all("SELECT id, topic_name, study_date FROM topics ORDER BY study_date DESC");
    const enriched = topics.map((t) => ({ ...t, revisionDates: getRevisionDates(t.study_date) }));
    res.json({ topics: enriched });
  });

  // POST /complete — mark a revision done
  app.post("/complete", (req, res) => {
    const { topic_id, revision_number } = req.body;
    if (!topic_id || ![1,2,3].includes(Number(revision_number)))
      return res.status(400).json({ error: "topic_id and revision_number (1-3) required." });
    try {
      db.exec_write(
        "INSERT OR IGNORE INTO completions (topic_id, revision_number, completed_at) VALUES (?, ?, ?)",
        [Number(topic_id), Number(revision_number), getTodayUTC()]
      );
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /topic/:id
  app.delete("/topic/:id", (req, res) => {
    const id = Number(req.params.id);
    db.exec_write("DELETE FROM completions WHERE topic_id = ?", [id]);
    db.exec_write("DELETE FROM topics WHERE id = ?", [id]);
    res.json({ success: true });
  });

  app.listen(PORT, () => {
    console.log(`\n🧠 RecallLoop → http://localhost:${PORT}`);
    console.log(`📅 Today (UTC): ${getTodayUTC()}\n`);
  });
})();
