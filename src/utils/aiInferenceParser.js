/**
 * aiInferenceParser.js — Parser de metadata IA en notas (ADR-019 Phase 3)
 * AGPL-3.0 © Chagra
 */

/**
 * Parsea el bloque de notas para extraer inferencias de IA.
 * @param {string} notesValue - El valor de notes.value
 * @returns {Object|null} Objeto con metadata o null si no es IA.
 */
export function parseAiInference(notesValue) {
    if (!notesValue || !notesValue.startsWith('[AI_INFERENCE]')) return null;

    const metadata = {
        isAi: true,
        source: '',
        model_version: '',
        confidence: 0,
        needs_human_review: true,
        findings: [],
        treatment: ''
    };

    const lines = notesValue.split('\n');
    let currentSection = '';

    lines.forEach(line => {
        if (line.startsWith('source:')) metadata.source = line.replace('source:', '').trim();
        if (line.startsWith('model_version:')) metadata.model_version = line.replace('model_version:', '').trim();
        if (line.startsWith('confidence:')) metadata.confidence = parseFloat(line.replace('confidence:', '').trim()) || 0;
        if (line.startsWith('needs_human_review:')) metadata.needs_human_review = line.replace('needs_human_review:', '').trim() === 'true';

        if (line.startsWith('--- Findings ---')) {
            currentSection = 'findings';
            return;
        }
        if (line.startsWith('--- Suggested treatment ---')) {
            currentSection = 'treatment';
            return;
        }

        if (currentSection === 'findings' && line.startsWith('- ')) {
            metadata.findings.push(line.replace('- ', '').trim());
        }
        if (currentSection === 'treatment' && line.trim() && !line.startsWith('---')) {
            metadata.treatment += (metadata.treatment ? '\n' : '') + line.trim();
        }
    });

    return metadata;
}

/**
 * Parsea el bloque de notas para extraer revisiones humanas de IA.
 * @param {string} notesValue - El valor de notes.value
 * @returns {Object|null} Objeto con metadata o null si no es review.
 */
export function parseAiReview(notesValue) {
    if (!notesValue || !notesValue.startsWith('[AI_REVIEW]')) return null;

    const review = {
        isReview: true,
        target_log_id: '',
        verdict: '',
        reviewer_id: '',
        reviewed_at: '',
        notes: ''
    };

    const lines = notesValue.split('\n');
    lines.forEach(line => {
        if (line.startsWith('target_log_id:')) review.target_log_id = line.replace('target_log_id:', '').trim();
        if (line.startsWith('verdict:')) review.verdict = line.replace('verdict:', '').trim();
        if (line.startsWith('reviewer_id:')) review.reviewer_id = line.replace('reviewer_id:', '').trim();
        if (line.startsWith('reviewed_at:')) review.reviewed_at = line.replace('reviewed_at:', '').trim();
        if (line.startsWith('notes:') || (!line.includes(':') && line.trim() && !line.startsWith('[AI_REVIEW]'))) {
            review.notes += (review.notes ? '\n' : '') + line.replace('notes:', '').trim();
        }
    });

    return review;
}
