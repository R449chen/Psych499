const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI; 
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 2. Data Schema
const resultSchema = new mongoose.Schema({
  participantId: String,
  entries: Array,
  timestamp: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', resultSchema);

// 3. API Route: Save Results
app.post('/api/save-results', async (req, res) => {
  const { participantId, entries } = req.body;
  try {
    // Upsert: Updates if ID exists, creates if not
    await Result.findOneAndUpdate(
      { participantId },
      { entries, timestamp: Date.now() },
      { upsert: true }
    );
    res.status(200).send({ message: 'Data synced successfully' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// 4. Admin Dashboard (with simple password)
app.get('/admin/results', async (req, res) => {
  const { folder, pw } = req.query;
  const ADMIN_PASSWORD = "R449"; // Change this if you want

  if (pw !== ADMIN_PASSWORD) {
    return res.send('<h1>Access Denied</h1><p>Append ?pw=YOUR_PASSWORD to the URL</p>');
  }

  try {
    let pipeline = [{ $unwind: "$entries" }];
    if (folder) {
      pipeline.push({ $match: { "entries.folder": folder.trim() } });
    }
    pipeline.push({
      $project: {
        _id: 0,
        participantId: 1,
        text: "$entries.text",
        folder: "$entries.folder",
        start: "$entries.start_time_sec",
        end: "$entries.finish_time_sec",
        image: "$entries.image_index"
      }
    });

    const results = await Result.aggregate(pipeline);

    res.send(`
      <html>
        <head>
          <title>Admin View</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: #f8f9fa; }
            table { width: 100%; border-collapse: collapse; background: white; }
            th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
            th { background: #007bff; color: white; }
            .filter { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h2>Research Results (${results.length} total entries)</h2>
          <form class="filter">
            <input type="hidden" name="pw" value="${pw}">
            <input type="text" name="folder" placeholder="Folder Name (e.g. BePi)" value="${folder || ''}">
            <button type="submit">Filter</button>
            <a href="/admin/results?pw=${pw}">Clear</a>
          </form>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Folder</th><th>Img</th><th>Thought</th><th>Timing (s)</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(r => `
                <tr>
                  <td><code>${r.participantId}</code></td>
                  <td><b>${r.folder}</b></td>
                  <td>${r.image}</td>
                  <td>${r.text}</td>
                  <td>${r.start} - ${r.end}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 5. STATIC FILE SERVING (Critical for Deployment)
// This serves the built React app from the 'dist' folder
app.use(express.static(path.join(__dirname, '../dist')));

// Fallback: Send all other requests to React's index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server live at port ${PORT}`);
});