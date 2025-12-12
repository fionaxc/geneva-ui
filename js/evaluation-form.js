async function saveCurrentEvaluation() {
  try {
    const patient = patients[currentCaseIndex];
    const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);
    patientGenes.sort((a, b) => parseInt(a.final_rank) - parseInt(b.final_rank));
    const gene = patientGenes[currentGeneIndex];

    const session = getCurrentSession();
    if (!session) {
      showToast('No active session. Please reload.', 'error');
      return;
    }

    const evalKey = `${patient.patient_id}_${gene.gene_name}`;

    const evaluation = {
      patient_id: patient.patient_id,
      gene_name: gene.gene_name,
      is_causal: gene.gene_name === patient.true_gene,
      final_rank: gene.final_rank,
      traceability: getSelectedRadio('traceability'),
      phenotype_match: getSelectedRadio('phenotype_match'),
      factuality: getSelectedRadio('factuality'),
      actionability: getSelectedRadio('actionability'),
      confidence: getSelectedRating('confidence'),
      interpretability: getSelectedRating('interpretability'),
      preferred_source: getSelectedSources().join(','),
      notes: document.getElementById('evalNotes').value
    };

    // Save to backend
    const response = await api.saveEvaluation(session.sessionId, evaluation);

    if (response.success) {
      // Update local cache
      evaluations[evalKey] = evaluation;

      // Update UI
      const geneItems = document.querySelectorAll('.gene-item');
      if (geneItems[currentGeneIndex]) {
        geneItems[currentGeneIndex].querySelector('.gene-status').classList.add('evaluated');
      }

      updateProgressStats();
      showToast(`Saved evaluation for ${gene.gene_name}`, 'success');
    }
  } catch (error) {
    console.error('Failed to save evaluation:', error);
    showToast(`Error saving: ${error.message}`, 'error');
  }
}

function getSelectedRadio(name) {
  const selected = document.querySelector(`.radio-group[data-field="${name}"] .radio-option.selected input`);
  return selected ? selected.value : null;
}

function getSelectedRating(field) {
  const selected = document.querySelector(`[data-field="${field}"] .rating-btn.selected`);
  return selected ? parseInt(selected.textContent) : null;
}

function getSelectedSources() {
  const selected = document.querySelectorAll('#preferredSourceGroup .checkbox-option.selected');
  return Array.from(selected).map(el => el.dataset.value);
}

function selectRadio(option) {
  const group = option.closest('.radio-group');
  group.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
  option.classList.add('selected');
}

function selectRating(btn, field, value) {
  btn.closest('.rating-scale').querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function toggleSource(option) {
  option.classList.toggle('selected');
}
