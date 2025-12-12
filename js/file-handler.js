// File handling
function handleFileSelect(input, type) {
  const file = input.files[0];
  if (!file) return;

  const wrapper = document.getElementById(type + 'Wrapper');
  const text = document.getElementById(type + 'Text');

  wrapper.classList.add('has-file');
  text.textContent = file.name;

  // Store filename for session creation
  if (type === 'detailed') {
    uploadedFilenames.detailed = file.name;
  } else if (type === 'summary') {
    uploadedFilenames.summary = file.name;
  } else if (type === 'metadata') {
    uploadedFilenames.metadata = file.name;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    if (type === 'detailed') {
      detailedContent = content;
      detailedData = parseCSV(content);
      showToast(`Loaded ${detailedData.length} gene records`, 'success');
    } else if (type === 'summary') {
      summaryContent = content;
      summaryData = parseCSV(content);
      showToast(`Loaded ${summaryData.length} patient summaries`, 'success');
    } else if (type === 'metadata') {
      patientMetadata = parseMetadata(content);
      showToast(`Loaded metadata for ${Object.keys(patientMetadata).length} patients`, 'success');
    }
    checkFilesReady();
  };
  reader.readAsText(file);
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    data.push(row);
  }
  return data;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseMetadata(content) {
  const metadata = {};
  const lines = content.trim().split('\n');

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.patient_id) {
        metadata[obj.patient_id] = obj;
      }
    } catch (e) {}
  }

  if (Object.keys(metadata).length === 0) {
    try {
      const arr = JSON.parse(content);
      if (Array.isArray(arr)) {
        arr.forEach(obj => {
          if (obj.patient_id) {
            metadata[obj.patient_id] = obj;
          }
        });
      }
    } catch (e) {}
  }

  return metadata;
}

function checkFilesReady() {
  const btn = document.getElementById('startBtn');
  const evaluatorId = document.getElementById('evaluatorId')?.value.trim();
  const evaluatorName = document.getElementById('evaluatorName')?.value.trim();
  const filesReady = detailedData.length > 0 && summaryData.length > 0;
  const userInfoReady = evaluatorId && evaluatorName;

  btn.disabled = !(filesReady && userInfoReady);
}

// Also validate on input change
document.addEventListener('DOMContentLoaded', () => {
  const evaluatorIdInput = document.getElementById('evaluatorId');
  const evaluatorNameInput = document.getElementById('evaluatorName');

  if (evaluatorIdInput) {
    evaluatorIdInput.addEventListener('input', checkFilesReady);
  }
  if (evaluatorNameInput) {
    evaluatorNameInput.addEventListener('input', checkFilesReady);
  }
});
