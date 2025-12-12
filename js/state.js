// Global state
let detailedData = [];
let summaryData = [];
let patientMetadata = {};
let evaluations = {};
let currentCaseIndex = 0;
let currentGeneIndex = 0;
let patients = [];

// File content storage (for session creation)
let detailedContent = '';
let summaryContent = '';
let uploadedFilenames = {
  detailed: null,
  summary: null,
  metadata: null
};

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const icon = toast.querySelector('.toast-icon');
  const msg = toast.querySelector('.toast-message');

  icon.textContent = type === 'success' ? '✓' : 'ℹ';
  msg.textContent = message;
  toast.className = `toast ${type}`;

  // Show
  setTimeout(() => toast.classList.add('show'), 10);

  // Hide after 2.5s
  setTimeout(() => toast.classList.remove('show'), 2500);
}
