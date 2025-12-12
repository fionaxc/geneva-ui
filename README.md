# GENEVA Evaluation Interface

A web-based tool for evaluating GENEVA gene prioritization outputs. Enables clinicians and researchers to systematically assess evidence quality, clinical actionability, and interpretability of gene rankings.

## 🚀 Quick Start

### Option 1: Use Locally
Simply download `index.html` and open it in any modern browser. No server required!

### Option 2: Use Hosted Version
Visit: `https://YOUR-USERNAME.github.io/geneva-evaluation/`

## 📁 Required Input Files

The tool expects two CSV files from a GENEVA run:

### 1. Detailed Rankings CSV
Contains per-gene evidence and explanations. Required columns:
- `patient_id`
- `gene_name`
- `baseline_rank`, `final_rank`
- `kg_rank`, `kg_explanation`, `kg_causality_likelihood`
- `omim_rank`, `omim_explanation`, `omim_causality_likelihood`
- `gr_rank`, `gr_explanation`, `gr_causality_likelihood`
- `llm_rank`, `llm_explanation`, `llm_causality_likelihood`
- `sp_rank`, `sp_explanation`, `sp_causality_likelihood`
- `merge_rationale`, `final_causality_likelihood`

### 2. Summary CSV
Contains patient-level ground truth. Required columns:
- `patient_id`
- `true_gene`
- `final_predicted_rank`
- `baseline_predicted_rank`
- `total_candidates`

## 📊 Evaluation Criteria

### Evidence Quality
- **Traceability**: Are claims tied to identifiable sources?
- **Phenotype Match**: Does rationale reference specific HPO terms with mechanistic links?
- **Factuality**: Is evidence correct, minor error, or major error?

### Clinical Assessment
- **Actionability**: Confirm testing / Keep as candidate / Discard
- **Confidence**: 1-5 scale for chosen action
- **Interpretability**: 1-5 scale for reasoning clarity
- **Source Preference**: Which evidence source was most useful?

## 💾 Data Storage

- Evaluations are saved to browser localStorage automatically
- Click "Export Evaluations" to download all ratings as CSV
- Data persists between sessions in the same browser

## 🎨 Evidence Source Colors

| Source | Color |
|--------|-------|
| Knowledge Graph | Teal |
| OMIM | Dark Orange |
| GeneReviews | Purple |
| LLM Reasoning | Amber |
| Similar Patients | Indigo |
| Merged/Final | Green |

## 📤 Export Format

Exported CSV contains:
```
patient_id, gene_name, is_causal, final_rank, traceability, phenotype_match, 
factuality, actionability, confidence, interpretability, preferred_source, notes, timestamp
```

## 🛠 Development

This is a single-file application with no dependencies. To modify:
1. Edit `index.html`
2. Open in browser to test
3. Commit and push to update hosted version

## 📝 License

MIT License - feel free to use and modify.
