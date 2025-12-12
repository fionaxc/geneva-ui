// Authentication module
let currentUser = null;
let currentSession = null;

// Check if user is logged in (stored in sessionStorage)
function checkAuth() {
  const storedUser = sessionStorage.getItem('geneva_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    return true;
  }
  return false;
}

// Login function
async function login(evaluatorId, name, email) {
  try {
    // Check if server is reachable first
    try {
      await fetch(window.location.origin + '/api/health');
    } catch (e) {
      console.error('Server not reachable:', e);
      showToast('Cannot connect to server. Please start the server first.', 'error');
      return false;
    }

    const response = await api.login(evaluatorId, name, email);

    if (response.success) {
      currentUser = response.evaluator;
      sessionStorage.setItem('geneva_user', JSON.stringify(currentUser));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Login error details:', error);
    showToast(`Login failed: ${error.message}`, 'error');
    return false;
  }
}

// Logout function
function logout() {
  currentUser = null;
  currentSession = null;
  sessionStorage.removeItem('geneva_user');
  sessionStorage.removeItem('geneva_session');

  // Show login screen
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('uploadScreen').style.display = 'none';
  document.getElementById('app').classList.remove('active');
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Set current session
function setCurrentSession(session) {
  currentSession = session;
  sessionStorage.setItem('geneva_session', JSON.stringify(session));
}

// Get current session
function getCurrentSession() {
  if (currentSession) return currentSession;

  const storedSession = sessionStorage.getItem('geneva_session');
  if (storedSession) {
    currentSession = JSON.parse(storedSession);
  }
  return currentSession;
}
