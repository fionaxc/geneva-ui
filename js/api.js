// API client module
// Use environment-based URL (works for both local and production)
const API_BASE_URL = window.location.origin + '/api';

const api = {
  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  },

  // Authentication
  async login(evaluatorId, name, email = null) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluatorId, name, email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return await response.json();
  },

  // Session management
  async createSession(evaluatorId, detailedContent, summaryContent, filenames) {
    const response = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluatorId,
        detailedContent,
        summaryContent,
        filenames
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create session');
    }

    return await response.json();
  },

  async getSession(sessionId) {
    const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get session');
    }

    return await response.json();
  },

  async getSessions(evaluatorId) {
    const response = await fetch(`${API_BASE_URL}/sessions/${evaluatorId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get sessions');
    }

    return await response.json();
  },

  // Evaluation operations
  async saveEvaluation(sessionId, evaluation) {
    const response = await fetch(`${API_BASE_URL}/evaluation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, evaluation })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save evaluation');
    }

    return await response.json();
  },

  async getEvaluations(sessionId) {
    const response = await fetch(`${API_BASE_URL}/evaluations/${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get evaluations');
    }

    return await response.json();
  },

  // Export
  async exportEvaluations(evaluatorId) {
    window.location.href = `${API_BASE_URL}/export/${evaluatorId}`;
  },

  async exportAllEvaluations() {
    window.location.href = `${API_BASE_URL}/export-all`;
  }
};
