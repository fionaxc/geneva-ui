function toggleSection(sectionId) {
  document.getElementById(sectionId).classList.toggle('collapsed');
}

function updateProgressStats() {
  const patient = patients[currentCaseIndex];
  const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);

  let caseEvaluated = 0;
  patientGenes.forEach(gene => {
    const key = `${patient.patient_id}_${gene.gene_name}`;
    if (evaluations[key]) caseEvaluated++;
  });

  document.getElementById('caseEvalCount').textContent = `${caseEvaluated} / ${patientGenes.length}`;
  document.getElementById('totalEvalCount').textContent = Object.keys(evaluations).length;
}
