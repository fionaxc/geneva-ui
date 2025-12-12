function prevCase() {
  if (currentCaseIndex > 0) {
    loadCase(currentCaseIndex - 1);
  }
}

function nextCase() {
  if (currentCaseIndex < patients.length - 1) {
    loadCase(currentCaseIndex + 1);
  }
}

function saveAndNext() {
  saveCurrentEvaluation();

  const patient = patients[currentCaseIndex];
  const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);

  if (currentGeneIndex < patientGenes.length - 1) {
    loadGene(currentGeneIndex + 1);
  } else if (currentCaseIndex < patients.length - 1) {
    loadCase(currentCaseIndex + 1);
  } else {
    showToast('All genes evaluated!', 'success');
  }
}

function exportEvaluations() {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please login first', 'error');
    return;
  }

  // Use API export endpoint
  api.exportEvaluations(user.evaluatorId);
  showToast('Downloading evaluations...', 'success');
}
