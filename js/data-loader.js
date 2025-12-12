async function startEvaluation() {
  try {
    // Get evaluator info from form
    const evaluatorId = document.getElementById('evaluatorId').value.trim();
    const evaluatorName = document.getElementById('evaluatorName').value.trim();
    const evaluatorEmail = document.getElementById('evaluatorEmail').value.trim();

    if (!evaluatorId || !evaluatorName) {
      showToast('Please enter Evaluator ID and Name', 'error');
      return;
    }

    // Show loading state
    const btn = document.getElementById('startBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Logging in...';

    // Login or register
    const loginSuccess = await login(evaluatorId, evaluatorName, evaluatorEmail || null);
    if (!loginSuccess) {
      throw new Error('Login failed');
    }

    const user = getCurrentUser();
    document.getElementById('userInfo').textContent = user.name;

    // Update button text
    btn.textContent = 'Creating session...';

    // Create or retrieve session from backend
    const sessionResponse = await api.createSession(
      user.evaluatorId,
      detailedContent,
      summaryContent,
      uploadedFilenames
    );

    if (!sessionResponse.success) {
      throw new Error('Failed to create session');
    }

    // Store session info
    setCurrentSession(sessionResponse.session);

    // Load existing evaluations from backend
    evaluations = {};
    sessionResponse.evaluations.forEach(e => {
      const key = `${e.patient_id}_${e.gene_name}`;
      evaluations[key] = e;
    });

    showToast(`Session created. Loaded ${sessionResponse.evaluations.length} existing evaluations`, 'success');

    // Process patient data
    patients = summaryData.map(row => ({
      patient_id: row.patient_id,
      true_gene: row.true_gene,
      final_rank: row.final_predicted_rank,
      baseline_rank: row.baseline_predicted_rank,
      total_candidates: row.total_candidates,
      causality: row.final_causality_likelihood
    }));

    const seen = new Set();
    patients = patients.filter(p => {
      const key = p.patient_id + '_' + p.true_gene;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const select = document.getElementById('caseSelect');
    patients.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.patient_id;
      select.appendChild(opt);
    });

    document.getElementById('uploadScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');

    loadCase(0);
    updateProgressStats();

    btn.textContent = originalText;
  } catch (error) {
    console.error('Failed to start evaluation:', error);
    showToast(`Error: ${error.message}`, 'error');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').textContent = 'Start Evaluation';
  }
}

function loadCase(index) {
  currentCaseIndex = parseInt(index);
  currentGeneIndex = 0;

  const patient = patients[currentCaseIndex];
  const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);
  patientGenes.sort((a, b) => parseInt(a.final_rank) - parseInt(b.final_rank));

  const meta = patientMetadata[patient.patient_id];

  document.getElementById('patientId').textContent = patient.patient_id;
  document.getElementById('patientMeta').textContent = `${patientGenes.length} candidates${meta ? ` • ${meta.positive_phenotypes?.length || 0} phenotypes` : ''}`;
  document.getElementById('causalGeneName').textContent = patient.true_gene;
  document.getElementById('causalGeneRank').textContent = `Final: #${patient.final_rank} | Baseline: #${patient.baseline_rank}`;

  document.getElementById('caseSelect').value = currentCaseIndex;
  document.getElementById('progressText').textContent = `${currentCaseIndex + 1} / ${patients.length} cases`;

  // Phenotypes
  const phenotypeList = document.getElementById('phenotypeList');
  phenotypeList.innerHTML = '';

  if (meta && meta.positive_phenotypes && meta.positive_phenotypes.length > 0) {
    meta.positive_phenotypes.forEach(pheno => {
      const div = document.createElement('div');
      div.className = 'phenotype-item';
      div.textContent = pheno;
      phenotypeList.appendChild(div);
    });
    document.getElementById('phenotypeCount').textContent = `${meta.positive_phenotypes.length} phenotypes`;
  } else {
    phenotypeList.innerHTML = '<div class="phenotype-item" style="color:#94a3b8;font-style:italic">No phenotype data</div>';
    document.getElementById('phenotypeCount').textContent = '';
  }

  // All genes
  const geneList = document.getElementById('geneList');
  geneList.innerHTML = '';

  patientGenes.forEach((gene, i) => {
    const isCausal = gene.gene_name === patient.true_gene;
    const evalKey = `${patient.patient_id}_${gene.gene_name}`;
    const isEvaluated = evaluations[evalKey] !== undefined;

    const div = document.createElement('div');
    div.className = `gene-item ${isCausal ? 'causal' : ''} ${i === 0 ? 'active' : ''}`;
    div.onclick = () => loadGene(i);
    div.innerHTML = `
      <span class="gene-rank">#${gene.final_rank}</span>
      <span class="gene-name">${gene.gene_name}</span>
      <span class="gene-status ${isEvaluated ? 'evaluated' : ''}"></span>
    `;
    geneList.appendChild(div);
  });

  loadGene(0);
  updateProgressStats();
}

function loadGene(index) {
  currentGeneIndex = index;

  const patient = patients[currentCaseIndex];
  const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);
  patientGenes.sort((a, b) => parseInt(a.final_rank) - parseInt(b.final_rank));

  const gene = patientGenes[index];
  if (!gene) return;

  const isCausal = gene.gene_name === patient.true_gene;

  document.querySelectorAll('.gene-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  document.getElementById('currentGeneSymbol').textContent = gene.gene_name;
  document.getElementById('causalBadge').classList.toggle('hidden', !isCausal);

  const rankSummary = document.getElementById('rankSummary');
  rankSummary.innerHTML = `
    ${gene.kg_rank ? `<div class="rank-item"><span class="rank-dot kg"></span>KG:#${gene.kg_rank}</div>` : ''}
    ${gene.omim_rank ? `<div class="rank-item"><span class="rank-dot omim"></span>OMIM:#${gene.omim_rank}</div>` : ''}
    ${gene.gr_rank ? `<div class="rank-item"><span class="rank-dot gr"></span>GR:#${gene.gr_rank}</div>` : ''}
    ${gene.llm_rank ? `<div class="rank-item"><span class="rank-dot llm"></span>LLM:#${gene.llm_rank}</div>` : ''}
    ${gene.sp_rank ? `<div class="rank-item"><span class="rank-dot sp"></span>SP:#${gene.sp_rank}</div>` : ''}
    <div class="rank-item"><span class="rank-dot final"></span><strong>Final:#${gene.final_rank}</strong></div>
  `;

  const evidenceSections = document.getElementById('evidenceSections');
  evidenceSections.innerHTML = '';

  const sources = [
    { key: 'kg', name: 'Knowledge Graph', rank: gene.kg_rank, explanation: gene.kg_explanation, causality: gene.kg_causality_likelihood },
    { key: 'omim', name: 'OMIM', rank: gene.omim_rank, explanation: gene.omim_explanation, causality: gene.omim_causality_likelihood },
    { key: 'gr', name: 'GeneReviews', rank: gene.gr_rank, explanation: gene.gr_explanation, causality: gene.gr_causality_likelihood },
    { key: 'llm', name: 'LLM Reasoning', rank: gene.llm_rank, explanation: gene.llm_explanation, causality: gene.llm_causality_likelihood },
    { key: 'sp', name: 'Similar Patients', rank: gene.sp_rank, explanation: gene.sp_explanation, causality: gene.sp_causality_likelihood },
  ];

  sources.forEach(src => {
    const hasData = src.rank || src.explanation;
    const section = document.createElement('div');
    section.className = `evidence-section ${hasData ? 'expanded' : ''}`;
    section.innerHTML = `
      <div class="evidence-header" onclick="this.parentElement.classList.toggle('expanded')">
        <div class="evidence-title">
          <span class="evidence-indicator ${src.key}"></span>
          ${src.name}
        </div>
        <div class="evidence-meta">
          ${src.rank ? `#${src.rank} • ${src.causality || '—'}` : 'No data'}
          <span class="expand-icon">▼</span>
        </div>
      </div>
      <div class="evidence-body">
        ${src.explanation ? `<div class="evidence-text">${src.explanation}</div>` : '<div class="no-evidence">No evidence available</div>'}
      </div>
    `;
    evidenceSections.appendChild(section);
  });

  const mergedSection = document.createElement('div');
  mergedSection.className = 'evidence-section final expanded';
  mergedSection.innerHTML = `
    <div class="evidence-header" onclick="this.parentElement.classList.toggle('expanded')">
      <div class="evidence-title">
        <span class="evidence-indicator final"></span>
        Merged Rationale
      </div>
      <div class="evidence-meta">
        #${gene.baseline_rank} → #${gene.final_rank} • ${gene.final_causality_likelihood}
        <span class="expand-icon">▼</span>
      </div>
    </div>
    <div class="evidence-body">
      <div class="evidence-text">${gene.merge_rationale || 'No merged rationale available'}</div>
    </div>
  `;
  evidenceSections.appendChild(mergedSection);

  loadEvaluation();
}

function loadEvaluation() {
  const patient = patients[currentCaseIndex];
  const patientGenes = detailedData.filter(r => r.patient_id === patient.patient_id);
  patientGenes.sort((a, b) => parseInt(a.final_rank) - parseInt(b.final_rank));
  const gene = patientGenes[currentGeneIndex];

  const evalKey = `${patient.patient_id}_${gene.gene_name}`;
  const eval_ = evaluations[evalKey] || {};

  // Reset
  document.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.rating-btn').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.checkbox-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('evalNotes').value = '';

  // Load
  if (eval_.traceability) {
    const radio = document.querySelector(`input[name="traceability"][value="${eval_.traceability}"]`);
    if (radio) radio.closest('.radio-option').classList.add('selected');
  }
  if (eval_.phenotype_match) {
    const radio = document.querySelector(`input[name="phenotype_match"][value="${eval_.phenotype_match}"]`);
    if (radio) radio.closest('.radio-option').classList.add('selected');
  }
  if (eval_.factuality) {
    const radio = document.querySelector(`input[name="factuality"][value="${eval_.factuality}"]`);
    if (radio) radio.closest('.radio-option').classList.add('selected');
  }
  if (eval_.actionability) {
    const radio = document.querySelector(`input[name="actionability"][value="${eval_.actionability}"]`);
    if (radio) radio.closest('.radio-option').classList.add('selected');
  }
  if (eval_.confidence) {
    const btns = document.querySelectorAll('[data-field="confidence"] .rating-btn');
    if (btns[eval_.confidence - 1]) btns[eval_.confidence - 1].classList.add('selected');
  }
  if (eval_.interpretability) {
    const btns = document.querySelectorAll('[data-field="interpretability"] .rating-btn');
    if (btns[eval_.interpretability - 1]) btns[eval_.interpretability - 1].classList.add('selected');
  }
  if (eval_.preferred_source && eval_.preferred_source.length > 0) {
    eval_.preferred_source.forEach(src => {
      const cb = document.querySelector(`.checkbox-option[data-value="${src}"]`);
      if (cb) cb.classList.add('selected');
    });
  }
  if (eval_.notes) {
    document.getElementById('evalNotes').value = eval_.notes;
  }
}
