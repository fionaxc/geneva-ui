const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { queries, hashFiles } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from parent directory
app.use(express.static('..'));

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GENEVA Evaluation API is running' });
});

// Authentication - Simple login/register
app.post('/api/auth/login', async (req, res) => {
  try {
    const { evaluatorId, name, email } = req.body;

    if (!evaluatorId || !name) {
      return res.status(400).json({ error: 'Evaluator ID and name are required' });
    }

    // Check if evaluator exists
    let evaluator = await queries.getEvaluator(evaluatorId);

    if (!evaluator) {
      // Create new evaluator
      await queries.createEvaluator(evaluatorId, name, email);
      evaluator = await queries.getEvaluator(evaluatorId);
    }

    res.json({
      success: true,
      evaluator: {
        id: evaluator.id,
        evaluatorId: evaluator.evaluator_id,
        name: evaluator.name,
        email: evaluator.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Session management - Create or retrieve session
app.post('/api/session', async (req, res) => {
  try {
    const { evaluatorId, detailedContent, summaryContent, filenames } = req.body;

    if (!evaluatorId || !detailedContent || !summaryContent) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if evaluator exists
    const evaluator = await queries.getEvaluator(evaluatorId);
    if (!evaluator) {
      return res.status(404).json({ error: 'Evaluator not found. Please login first.' });
    }

    // Create hash from file contents
    const filesHash = hashFiles(detailedContent, summaryContent);

    // Check if session already exists for this evaluator and these files
    let session = await queries.findSessionByHash(evaluatorId, filesHash);

    if (!session) {
      // Create new session
      const sessionId = `${evaluatorId}_${filesHash}`;
      await queries.createSession(sessionId, evaluatorId, filesHash, filenames);
      session = await queries.getSession(sessionId);
    }

    // Get existing evaluations for this session
    const evaluations = await queries.getSessionEvaluations(session.session_id);

    res.json({
      success: true,
      session: {
        sessionId: session.session_id,
        filesHash: session.files_hash,
        createdAt: session.created_at,
        filenames: {
          detailed: session.detailed_filename,
          summary: session.summary_filename,
          metadata: session.metadata_filename
        }
      },
      evaluations: evaluations
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create/retrieve session', details: error.message });
  }
});

// Get session info
app.get('/api/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await queries.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const evaluations = await queries.getSessionEvaluations(sessionId);
    const stats = await queries.getEvaluationStats(sessionId);

    res.json({
      success: true,
      session: {
        sessionId: session.session_id,
        evaluatorId: session.evaluator_id,
        filesHash: session.files_hash,
        createdAt: session.created_at,
        filenames: {
          detailed: session.detailed_filename,
          summary: session.summary_filename,
          metadata: session.metadata_filename
        }
      },
      evaluationsCount: stats.total,
      evaluations: evaluations
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to retrieve session', details: error.message });
  }
});

// Get all sessions for an evaluator
app.get('/api/sessions/:evaluatorId', async (req, res) => {
  try {
    const { evaluatorId } = req.params;
    const sessions = await queries.getEvaluatorSessions(evaluatorId);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        sessionId: s.session_id,
        filesHash: s.files_hash,
        createdAt: s.created_at,
        filenames: {
          detailed: s.detailed_filename,
          summary: s.summary_filename,
          metadata: s.metadata_filename
        }
      }))
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions', details: error.message });
  }
});

// Save evaluation
app.post('/api/evaluation', async (req, res) => {
  try {
    const { sessionId, evaluation } = req.body;

    if (!sessionId || !evaluation) {
      return res.status(400).json({ error: 'Session ID and evaluation data are required' });
    }

    // Verify session exists
    const session = await queries.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Save evaluation
    const result = await queries.saveEvaluation(sessionId, evaluation);

    res.json({
      success: true,
      evaluationId: result.id,
      message: 'Evaluation saved successfully'
    });
  } catch (error) {
    console.error('Save evaluation error:', error);
    res.status(500).json({ error: 'Failed to save evaluation', details: error.message });
  }
});

// Get evaluations for a session
app.get('/api/evaluations/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const evaluations = await queries.getSessionEvaluations(sessionId);

    res.json({
      success: true,
      count: evaluations.length,
      evaluations: evaluations
    });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ error: 'Failed to retrieve evaluations', details: error.message });
  }
});

// Export evaluations for an evaluator (CSV format)
app.get('/api/export/:evaluatorId', async (req, res) => {
  try {
    const { evaluatorId } = req.params;
    const evaluations = await queries.getEvaluatorEvaluations(evaluatorId);

    // Convert to CSV
    const headers = [
      'session_id', 'patient_id', 'gene_name', 'is_causal', 'final_rank',
      'traceability', 'phenotype_match', 'factuality', 'actionability',
      'confidence', 'interpretability', 'preferred_source', 'notes',
      'created_at', 'updated_at'
    ];

    const rows = [headers.join(',')];

    evaluations.forEach(e => {
      const row = [
        e.session_id,
        e.patient_id,
        e.gene_name,
        e.is_causal,
        e.final_rank,
        e.traceability || '',
        e.phenotype_match || '',
        e.factuality || '',
        e.actionability || '',
        e.confidence || '',
        e.interpretability || '',
        e.preferred_source || '',
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.created_at,
        e.updated_at
      ];
      rows.push(row.join(','));
    });

    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="evaluations_${evaluatorId}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export evaluations', details: error.message });
  }
});

// Admin: Export all evaluations
app.get('/api/export-all', async (req, res) => {
  try {
    const evaluations = await queries.getAllEvaluations();

    // Convert to CSV
    const headers = [
      'evaluator_id', 'session_id', 'patient_id', 'gene_name', 'is_causal', 'final_rank',
      'traceability', 'phenotype_match', 'factuality', 'actionability',
      'confidence', 'interpretability', 'preferred_source', 'notes',
      'detailed_filename', 'summary_filename', 'created_at', 'updated_at'
    ];

    const rows = [headers.join(',')];

    evaluations.forEach(e => {
      const row = [
        e.evaluator_id,
        e.session_id,
        e.patient_id,
        e.gene_name,
        e.is_causal,
        e.final_rank,
        e.traceability || '',
        e.phenotype_match || '',
        e.factuality || '',
        e.actionability || '',
        e.confidence || '',
        e.interpretability || '',
        e.preferred_source || '',
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.detailed_filename || '',
        e.summary_filename || '',
        e.created_at,
        e.updated_at
      ];
      rows.push(row.join(','));
    });

    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="all_evaluations_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: 'Failed to export all evaluations', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`GENEVA Evaluation Server Running`);
  console.log(`========================================`);
  console.log(`Port: ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`UI:  http://localhost:${PORT}/index.html`);
  console.log(`========================================\n`);
});
