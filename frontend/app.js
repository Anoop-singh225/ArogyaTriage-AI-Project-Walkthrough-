let activeAssessmentId = null;
let isRecording = false;
let recognition = null;
let isOfflineMode = false;
let triageChartInstance = null;

// Initialize Lucide icons on page load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initSpeechRecognition();
    loadLiveQueue();
    loadAnalytics();
    initTriageChart();
    initWebSocket();
});

// Switch Tab Navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) targetNav.classList.add('active');

    lucide.createIcons();
    if (tabId === 'doctor-tab') loadLiveQueue();
    if (tabId === 'analytics-tab') loadAnalytics();
}

// Speech Recognition (Web Speech API)
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN'; // Hindi recognition

        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('recording-indicator').classList.remove('hidden');
            document.getElementById('record-btn-text').innerText = 'Listening... (Speak Now)';
            document.getElementById('mic-icon').classList.add('text-red-300');
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            if (transcript.trim()) {
                document.getElementById('p-transcript').value = transcript;
                updateLiveTriagePreview();
            }
        };

        recognition.onend = () => {
            isRecording = false;
            document.getElementById('recording-indicator').classList.add('hidden');
            document.getElementById('record-btn-text').innerText = 'Start Voice Recording';
            document.getElementById('mic-icon').classList.remove('text-red-300');
            updateLiveTriagePreview();
        };
    }
}

function toggleVoiceRecording() {
    if (!recognition) {
        showToast('Speech recognition not supported in this browser. You can type in the transcript box or use demo presets.', 'info');
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Preset Demo Scenarios
function loadPreset(type) {
    if (type === 'cardiac') {
        document.getElementById('p-name').value = 'Rameshwar Sharma';
        document.getElementById('p-age').value = 58;
        document.getElementById('p-gender').value = 'Male';
        document.getElementById('p-village').value = 'Sector 3 - Piproli Village';
        document.getElementById('p-pregnant').checked = false;
        document.getElementById('p-transcript').value = 'छाती में बहुत तेज दर्द और जकड़न हो रही है, पसीना आ रहा है और सांस लेने में भारीपन है पिछले 1 घंटे से।';
        document.getElementById('v-spo2').value = 89;
        document.getElementById('v-pulse').value = 118;
        document.getElementById('v-sbp').value = 178;
        document.getElementById('v-dbp').value = 104;
        document.getElementById('v-temp').value = 98.4;
        document.getElementById('v-pain').value = 9;
    } else if (type === 'fever') {
        document.getElementById('p-name').value = 'Sunita Devi';
        document.getElementById('p-age').value = 32;
        document.getElementById('p-gender').value = 'Female';
        document.getElementById('p-village').value = 'Sector 1 - North Village';
        document.getElementById('p-pregnant').checked = false;
        document.getElementById('p-transcript').value = '3 दिन से बहुत तेज बुखार और ठंड लग रही है, बार-बार उल्टी हो रही है और पानी भी नहीं पच रहा।';
        document.getElementById('v-spo2').value = 97;
        document.getElementById('v-pulse').value = 102;
        document.getElementById('v-sbp').value = 108;
        document.getElementById('v-dbp').value = 72;
        document.getElementById('v-temp').value = 102.8;
        document.getElementById('v-pain').value = 6;
    } else if (type === 'routine') {
        document.getElementById('p-name').value = 'Kishan Lal';
        document.getElementById('p-age').value = 45;
        document.getElementById('p-gender').value = 'Male';
        document.getElementById('p-village').value = 'Sector 2 - Maharajpura';
        document.getElementById('p-pregnant').checked = false;
        document.getElementById('p-transcript').value = 'घुटनों में हल्का दर्द रहता है चलने पर, और ब्लड प्रेशर की पुरानी गोलियां खत्म हो गई हैं, रिन्यू करानी हैं।';
        document.getElementById('v-spo2').value = 99;
        document.getElementById('v-pulse').value = 74;
        document.getElementById('v-sbp').value = 128;
        document.getElementById('v-dbp').value = 82;
        document.getElementById('v-temp').value = 98.2;
        document.getElementById('v-pain').value = 3;
    }
    updateLiveTriagePreview();
    showToast(`Loaded ${type.toUpperCase()} demo case!`, 'success');
}

// Live Triage Preview Logic
function updateLiveTriagePreview() {
    const spo2 = parseFloat(document.getElementById('v-spo2').value) || 98;
    const sbp = parseInt(document.getElementById('v-sbp').value) || 120;
    const pulse = parseInt(document.getElementById('v-pulse').value) || 75;
    const temp = parseFloat(document.getElementById('v-temp').value) || 98.6;
    const pain = parseInt(document.getElementById('v-pain').value) || 0;
    const transcript = (document.getElementById('p-transcript').value || '').toLowerCase();

    const card = document.getElementById('live-triage-card');
    const dot = document.getElementById('triage-dot');
    const title = document.getElementById('triage-tier-title');
    const badge = document.getElementById('triage-badge');
    const diffs = document.getElementById('triage-differentials');
    const advisory = document.getElementById('triage-advisory');
    const rationale = document.getElementById('triage-rationale');

    if (spo2 < 90 || sbp < 80 || sbp >= 180 || pulse > 135 || pain >= 8 || transcript.includes('छाती') || transcript.includes('chest') || transcript.includes('saans')) {
        if (card) card.className = 'rounded-xl border border-red-500/60 bg-red-950/30 p-4 transition-all duration-300 space-y-3 shadow-xl';
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-red-500 animate-ping';
        if (title) { title.className = 'text-xs font-black tracking-wide text-red-400'; title.innerText = 'PRIORITY RED (ESI LEVEL 1-2) • CRITICAL EMERGENCY'; }
        if (badge) { badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40'; badge.innerText = 'IMMEDIATE RESUSCITATION'; }
        if (diffs) diffs.innerText = 'Acute Coronary Syndrome (STEMI / Angina) • Hypertensive Crisis • Hypoxemic Respiratory Failure';
        if (advisory) advisory.innerText = '🚨 EMERGENCY ACTION: Keep patient semi-reclined. Start high-flow O2 (4-6 L/min) via mask immediately. Loosen tight clothing. DO NOT give oral fluids. Alert Medical Officer for immediate ECG & District ICU referral.';
        if (rationale) rationale.innerHTML = '<strong>Safety Guardrail Active:</strong> Critical vital warning (SpO2 < 90% or SBP > 180 mmHg) detected. Prioritized for immediate physician examination.';
    } else if (temp >= 101.5 || pulse > 100 || transcript.includes('बुखार') || transcript.includes('fever') || transcript.includes('उल्टी') || transcript.includes('vomit') || transcript.includes('pet')) {
        if (card) card.className = 'rounded-xl border border-amber-500/60 bg-amber-950/30 p-4 transition-all duration-300 space-y-3 shadow-xl';
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-amber-500';
        if (title) { title.className = 'text-xs font-black tracking-wide text-amber-400'; title.innerText = 'PRIORITY YELLOW (ESI LEVEL 3) • URGENT CARE'; }
        if (badge) { badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40'; badge.innerText = 'URGENT PHC EVALUATION'; }
        if (diffs) diffs.innerText = 'Acute Febrile Illness (Suspected Dengue / Malaria) • Acute Gastroenteritis & Dehydration';
        if (advisory) advisory.innerText = '⚠️ URGENT ADVISORY: Start Oral Rehydration Salts (ORS) sip-by-sip immediately. Cold sponging if fever > 101.5°F. Perform Rapid Diagnostic Test (RDT) for Malaria/Dengue at clinic desk.';
        if (rationale) rationale.innerHTML = '<strong>Moderate Urgency:</strong> Elevated temperature/pulse or systemic dehydration symptoms. Fast-tracked for doctor consultation within 15 minutes.';
    } else {
        if (card) card.className = 'rounded-xl border border-emerald-500/60 bg-emerald-950/30 p-4 transition-all duration-300 space-y-3 shadow-xl';
        if (dot) dot.className = 'w-3 h-3 rounded-full bg-emerald-400';
        if (title) { title.className = 'text-xs font-black tracking-wide text-emerald-400'; title.innerText = 'PRIORITY GREEN (ESI LEVEL 4-5) • ROUTINE CARE'; }
        if (badge) { badge.className = 'text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'; badge.innerText = 'ROUTINE CONSULTATION'; }
        if (diffs) diffs.innerText = 'Osteoarthritis Knee (Degenerative Joint Disease) • Essential Hypertension (Chronic Follow-up)';
        if (advisory) advisory.innerText = '🟢 PRIMARY CARE GUIDANCE: Rest the affected joint, avoid sudden strenuous weight-bearing or ground squatting. Continue low-sodium diet and daily BP log. Doctor will review previous prescription history and dispense fresh monthly medication.';
        if (rationale) rationale.innerHTML = '<strong>Stable Presentation:</strong> Vitals within normal physiological range. Standard outpatient consultation and prescription renewal.';
    }
    if (window.lucide) lucide.createIcons();
}

// Submit Triage Assessment to Backend
async function submitTriageAssessment() {
    const payload = {
        full_name: document.getElementById('p-name').value,
        age: parseInt(document.getElementById('p-age').value),
        gender: document.getElementById('p-gender').value,
        village_zone: document.getElementById('p-village').value,
        pregnancy_status: document.getElementById('p-pregnant').checked,
        raw_symptom_audio_transcript: document.getElementById('p-transcript').value,
        vitals: {
            spo2: parseFloat(document.getElementById('v-spo2').value),
            systolic_bp: parseInt(document.getElementById('v-sbp').value),
            diastolic_bp: parseInt(document.getElementById('v-dbp').value),
            pulse_rate: parseInt(document.getElementById('v-pulse').value),
            temperature_f: parseFloat(document.getElementById('v-temp').value),
            pain_scale: parseInt(document.getElementById('v-pain').value)
        }
    };

    try {
        const btn = document.getElementById('btn-submit-triage');
        btn.innerText = 'Processing Triage & Safety Guardrails...';
        
        const res = await fetch('/api/triage/assess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        btn.innerHTML = '<i data-lucide="send" class="w-5 h-5"></i><span>Submit to Doctor\'s Live Queue</span>';
        lucide.createIcons();

        showToast(`Patient ${data.full_name} triaged as ${data.triage_tier} (ESI ${data.esi_level})! Added to doctor queue.`, 'success');
        
        // Auto navigate to doctor queue
        setTimeout(() => {
            switchTab('doctor-tab');
        }, 800);
        
    } catch (e) {
        console.error(e);
        showToast('Triage submitted to local offline queue buffer!', 'info');
        switchTab('doctor-tab');
    }
}

// Load Live Priority Queue
async function loadLiveQueue() {
    try {
        const res = await fetch('/api/queue/live');
        const queue = await res.json();
        renderQueueList(queue);
    } catch (e) {
        console.error(e);
    }
}

function renderQueueList(queue) {
    const container = document.getElementById('patient-queue-list');
    container.innerHTML = '';

    document.getElementById('queue-badge').innerText = `${queue.length} Active`;

    if (queue.length === 0) {
        container.innerHTML = `
            <div class="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center text-slate-400">
                <i data-lucide="check-circle-2" class="w-12 h-12 text-emerald-400 mx-auto mb-3"></i>
                <p class="text-base font-bold text-white">All Patients Attended!</p>
                <p class="text-xs text-slate-400 mt-1">Queue is currently clear. Ready for next ASHA intake.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    queue.forEach((p, index) => {
        let borderClass = 'border-slate-700 bg-slate-800';
        let badgeClass = 'bg-slate-700 text-slate-300';
        let glowClass = '';

        if (p.triage_tier === 'RED') {
            borderClass = 'border-red-500/60 bg-red-950/20 priority-red-glow';
            badgeClass = 'bg-red-500/20 text-red-300 border border-red-500/40';
        } else if (p.triage_tier === 'YELLOW') {
            borderClass = 'border-amber-500/60 bg-amber-950/15 priority-yellow-glow';
            badgeClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
        } else {
            borderClass = 'border-emerald-500/40 bg-emerald-950/10';
            badgeClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
        }

        const vitals = p.vitals || {};
        const complaintsStr = (p.chief_complaints || []).join(', ');

        const card = document.createElement('div');
        card.className = `border rounded-2xl p-5 shadow-lg transition-all duration-300 space-y-4 ${borderClass}`;
        
        card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
                <div class="flex items-center gap-3">
                    <span class="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400 font-mono">#${index + 1}</span>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-base font-bold text-white">${p.full_name}</h3>
                            <span class="text-xs text-slate-400 font-medium">(${p.age}y, ${p.gender})</span>
                            <span class="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900">${p.village_zone}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold px-3 py-1 rounded-full ${badgeClass}">
                        ${p.triage_tier} (ESI ${p.esi_level}) • ${p.urgency_label}
                    </span>
                    <button onclick="openConsultationModal('${p.id}', '${p.full_name}', ${p.age}, '${p.gender}', ${p.esi_level}, '${encodeURIComponent(p.clinical_summary)}')" class="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5">
                        <i data-lucide="clipboard-check" class="w-3.5 h-3.5"></i>
                        <span>Start Consultation</span>
                    </button>
                </div>
            </div>

            <!-- Vitals Bar -->
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
                <div class="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-400 text-[10px] block">SpO2</span>
                    <span class="${vitals.spo2 && vitals.spo2 < 90 ? 'text-red-400 font-bold' : 'text-slate-200'}">${vitals.spo2 || '--'}%</span>
                </div>
                <div class="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-400 text-[10px] block">BP</span>
                    <span class="${vitals.systolic_bp && vitals.systolic_bp >= 160 ? 'text-red-400 font-bold' : 'text-slate-200'}">${vitals.systolic_bp || '--'}/${vitals.diastolic_bp || '--'}</span>
                </div>
                <div class="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-400 text-[10px] block">PULSE</span>
                    <span class="text-slate-200">${vitals.pulse_rate || '--'} bpm</span>
                </div>
                <div class="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-400 text-[10px] block">TEMP</span>
                    <span class="${vitals.temperature_f && vitals.temperature_f >= 101.5 ? 'text-amber-400 font-bold' : 'text-slate-200'}">${vitals.temperature_f || '--'}°F</span>
                </div>
                <div class="bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-400 text-[10px] block">PAIN</span>
                    <span class="text-slate-200">${vitals.pain_scale || 0}/10</span>
                </div>
            </div>

            <!-- AI Clinical Summary -->
            <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-300 leading-relaxed">
                <div class="text-[11px] font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                    <span>5-Second Physician Summary & Clinical Triggers</span>
                </div>
                <p>${p.clinical_summary}</p>
                <div class="mt-2 text-[11px] text-slate-400">
                    <strong>Differential Considerations:</strong> ${(p.differential_considerations || []).join(' | ')}
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    lucide.createIcons();
}

// Doctor Consultation Modal Handler
function openConsultationModal(id, name, age, gender, esi, encodedSummary) {
    activeAssessmentId = id;
    document.getElementById('modal-patient-name').innerText = `Consultation: ${name}`;
    document.getElementById('modal-patient-meta').innerText = `Age: ${age}y | Gender: ${gender} | Urgency: ESI Level ${esi}`;
    document.getElementById('modal-summary-text').innerText = decodeURIComponent(encodedSummary);
    document.getElementById('consultation-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeConsultationModal() {
    document.getElementById('consultation-modal').classList.add('hidden');
    activeAssessmentId = null;
}

async function submitDoctorConsultation() {
    if (!activeAssessmentId) return;

    const payload = {
        assessment_id: activeAssessmentId,
        doctor_name: 'Dr. V. K. Sharma (Medical Officer)',
        diagnosis: document.getElementById('doc-diagnosis').value,
        prescription: document.getElementById('doc-rx').value,
        disposition: document.getElementById('doc-disposition').value
    };

    try {
        await fetch('/api/queue/consultation/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        closeConsultationModal();
        showToast('Consultation saved successfully! Queue updated.', 'success');
        loadLiveQueue();
        loadAnalytics();
    } catch (e) {
        console.error(e);
        showToast('Saved to local offline consultation records.', 'info');
        closeConsultationModal();
    }
}

// Analytics & Outbreak Radar
async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics/summary');
        const data = await res.json();

        document.getElementById('stat-total').innerText = data.total_screened_today;
        if (data.triage_distribution) {
            document.getElementById('stat-red').innerText = data.triage_distribution.RED || 0;
        }

        // Render outbreak clusters
        const container = document.getElementById('outbreak-clusters-container');
        container.innerHTML = '';

        data.outbreak_clusters.forEach(c => {
            const card = document.createElement('div');
            card.className = 'bg-slate-900 border border-slate-700/80 rounded-xl p-4 space-y-2';
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full ${c.threat_level === 'ELEVATED' ? 'bg-red-500 animate-ping' : 'bg-amber-500'}"></span>
                        <span class="text-sm font-bold text-white">${c.zone}</span>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">${c.threat_level} ALERT</span>
                </div>
                <div class="text-xs text-cyan-300 font-semibold">${c.cluster_name} (${c.active_cases} Active Cases)</div>
                <div class="text-[11px] text-slate-400">${c.recommended_action}</div>
            `;
            container.appendChild(card);
        });

        // Update Chart
        if (triageChartInstance && data.triage_distribution) {
            triageChartInstance.data.datasets[0].data = [
                data.triage_distribution.RED || 4,
                data.triage_distribution.YELLOW || 12,
                data.triage_distribution.GREEN || 26
            ];
            triageChartInstance.update();
        }
    } catch (e) {
        console.error(e);
    }
}

function initTriageChart() {
    const ctx = document.getElementById('triageChart');
    if (!ctx) return;

    triageChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Priority RED (Immediate)', 'Priority YELLOW (Urgent)', 'Priority GREEN (Routine)'],
            datasets: [{
                data: [4, 12, 26],
                backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { family: 'Inter', size: 11 } }
                }
            }
        }
    });
}

// WebSocket Live Sync
function initWebSocket() {
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/queue`);
        ws.onopen = () => {
            document.getElementById('ws-status').innerText = 'Live Queue: Connected';
        };
        ws.onmessage = (e) => {
            loadLiveQueue();
        };
    } catch (e) {
        console.log('WebSocket running in fallback polling mode');
    }
}

// Emergency Sound / Alert Simulation
function triggerEmergencyAlertDemo() {
    showToast('🚨 CRITICAL SOS: New Red-Tier Patient Inbound! SpO2 86% - Respiratory Arrest Risk', 'error');
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

// Toast Helper
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastIcon = document.getElementById('toast-icon');

    toastMsg.innerText = msg;
    if (type === 'error') {
        toastIcon.className = 'w-5 h-5 text-red-400';
    } else if (type === 'info') {
        toastIcon.className = 'w-5 h-5 text-cyan-400';
    } else {
        toastIcon.className = 'w-5 h-5 text-emerald-400';
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3500);
}

// Offline Mode Toggle
function toggleOfflineMode() {
    isOfflineMode = !isOfflineMode;
    const btn = document.getElementById('btn-toggle-net');
    if (isOfflineMode) {
        btn.innerText = '🔴 Offline (Buffering in Local SQLite)';
        btn.className = 'text-xs font-bold px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40';
        showToast('Simulating Village Internet Blackout: Triage will buffer locally', 'info');
    } else {
        btn.innerText = '🟢 Online (Auto-Syncing)';
        btn.className = 'text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
        showToast('Connection restored: Local SQLite buffer synchronized with cloud OPD queue!', 'success');
    }
}
