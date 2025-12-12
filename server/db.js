const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

// Database setup
const dbPath = path.join(__dirname, 'geneva_evaluations.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  db.serialize(() => {
    // Evaluators table
    db.run(`
      CREATE TABLE IF NOT EXISTS evaluators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evaluator_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sessions table (tracks different CSV upload sessions)
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE NOT NULL,
        evaluator_id TEXT NOT NULL,
        files_hash TEXT NOT NULL,
        detailed_filename TEXT,
        summary_filename TEXT,
        metadata_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (evaluator_id) REFERENCES evaluators(evaluator_id)
      )
    `);

    // Evaluations table
    db.run(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        gene_name TEXT NOT NULL,
        is_causal BOOLEAN,
        final_rank INTEGER,
        traceability TEXT,
        phenotype_match TEXT,
        factuality TEXT,
        actionability TEXT,
        confidence INTEGER,
        interpretability INTEGER,
        preferred_source TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id),
        UNIQUE(session_id, patient_id, gene_name)
      )
    `);

    console.log('Database schema initialized');
  });
}

// Hash function for creating session IDs
function hashFiles(detailedContent, summaryContent) {
  const hash = crypto.createHash('sha256');
  hash.update(detailedContent + summaryContent);
  return hash.digest('hex').substring(0, 16);
}

// Database queries
const queries = {
  // Evaluator operations
  createEvaluator: (evaluatorId, name, email = null) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO evaluators (evaluator_id, name, email) VALUES (?, ?, ?)',
        [evaluatorId, name, email],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, evaluatorId });
        }
      );
    });
  },

  getEvaluator: (evaluatorId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM evaluators WHERE evaluator_id = ?',
        [evaluatorId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Session operations
  createSession: (sessionId, evaluatorId, filesHash, filenames) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sessions (session_id, evaluator_id, files_hash, detailed_filename, summary_filename, metadata_filename)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, evaluatorId, filesHash, filenames.detailed, filenames.summary, filenames.metadata],
        function(err) {
          if (err) reject(err);
          else resolve({ sessionId, id: this.lastID });
        }
      );
    });
  },

  getSession: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM sessions WHERE session_id = ?',
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  findSessionByHash: (evaluatorId, filesHash) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM sessions WHERE evaluator_id = ? AND files_hash = ? ORDER BY created_at DESC LIMIT 1',
        [evaluatorId, filesHash],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  getEvaluatorSessions: (evaluatorId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM sessions WHERE evaluator_id = ? ORDER BY created_at DESC',
        [evaluatorId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Evaluation operations
  saveEvaluation: (sessionId, evaluation) => {
    return new Promise((resolve, reject) => {
      const {
        patient_id, gene_name, is_causal, final_rank,
        traceability, phenotype_match, factuality, actionability,
        confidence, interpretability, preferred_source, notes
      } = evaluation;

      db.run(
        `INSERT INTO evaluations
         (session_id, patient_id, gene_name, is_causal, final_rank,
          traceability, phenotype_match, factuality, actionability,
          confidence, interpretability, preferred_source, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(session_id, patient_id, gene_name)
         DO UPDATE SET
           is_causal=excluded.is_causal,
           final_rank=excluded.final_rank,
           traceability=excluded.traceability,
           phenotype_match=excluded.phenotype_match,
           factuality=excluded.factuality,
           actionability=excluded.actionability,
           confidence=excluded.confidence,
           interpretability=excluded.interpretability,
           preferred_source=excluded.preferred_source,
           notes=excluded.notes,
           updated_at=CURRENT_TIMESTAMP`,
        [sessionId, patient_id, gene_name, is_causal, final_rank,
         traceability, phenotype_match, factuality, actionability,
         confidence, interpretability, preferred_source, notes],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getSessionEvaluations: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM evaluations WHERE session_id = ?',
        [sessionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getEvaluatorEvaluations: (evaluatorId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT e.* FROM evaluations e
         JOIN sessions s ON e.session_id = s.session_id
         WHERE s.evaluator_id = ?
         ORDER BY e.updated_at DESC`,
        [evaluatorId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getAllEvaluations: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT e.*, s.evaluator_id, s.detailed_filename, s.summary_filename
         FROM evaluations e
         JOIN sessions s ON e.session_id = s.session_id
         ORDER BY e.updated_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  getEvaluationStats: (sessionId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as total FROM evaluations WHERE session_id = ?',
        [sessionId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
};

module.exports = {
  db,
  queries,
  hashFiles
};
