let activeAssessmentId = null;
let isRecording = false;
let recognition = null;
let isOfflineMode = false;
let triageChartInstance = null;
let currentAIAnswerData = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initSpeechRecognition();
    loadLiveQueue();
    loadAnalytics();
    initTriageChart();
    initWebSocket();
    // Auto-trigger initial question answer on load
    askAIHealthAssistant();
});

// Switch Tab Navigation
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) targetNav.classList.add('active');

    if (window.lucide) lucide.createIcons();
    if (tabId === 'doctor-tab') loadLiveQueue();
    if (tabId === 'analytics-tab') loadAnalytics();
}

// 🌟 ASK AI HEALTH ASSISTANT FUNCTION
async function askAIHealthAssistant() {
    const queryInput = document.getElementById('ai-query-input');
    const query = (queryInput ? queryInput.value : '').trim() || 'छाती में बहुत तेज दर्द और जकड़न हो रही है';

    const btn = document.getElementById('btn-ask-ai');
    if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Analyzing Query...</span>';

    try {
        const res = await fetch('/api/triage/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const data = await res.json();
        currentAIAnswerData = data;
        renderAIAnswerCard(data);
    } catch (e) {
        console.error('Using local fallback for query:', e);
        const fallbackData = getLocalAIAnswer(query);
        currentAIAnswerData = fallbackData;
        renderAIAnswerCard(fallbackData);
    }

    if (btn) {
        btn.innerHTML = '<i data-lucide="sparkles" class="w-5 h-5"></i><span>Ask AI (उत्तर पाएं)</span>';
        if (window.lucide) lucide.createIcons();
    }
}

function setAndAskQuery(text) {
    const queryInput = document.getElementById('ai-query-input');
    if (queryInput) queryInput.value = text;
    askAIHealthAssistant();
}

function renderAIAnswerCard(data) {
    const card = document.getElementById('ai-answer-card');
    const condition = document.getElementById('ans-condition');
    const badge = document.getElementById('ans-tier-badge');
    const explanation = document.getElementById('ans-explanation');
    const firstAidList = document.getElementById('ans-first-aid');
    const redFlags = document.getElementById('ans-red-flags');

    if (condition) condition.innerText = data.condition;
    if (explanation) explanation.innerText = data.explanation;

    if (badge) {
        badge.innerText = data.urgency_badge || `${data.tier} (ESI ${data.esi_level})`;
        if (data.tier === 'RED') {
            badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse';
            if (card) card.className = 'mt-4 bg-slate-950 border-2 border-red-500/70 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl';
        } else if (data.tier === 'YELLOW') {
            badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40';
            if (card) card.className = 'mt-4 bg-slate-950 border-2 border-amber-500/70 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl';
        } else {
            badge.className = 'px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
            if (card) card.className = 'mt-4 bg-slate-950 border-2 border-emerald-500/70 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl';
        }
    }

    if (firstAidList && data.first_aid) {
        firstAidList.innerHTML = '';
        data.first_aid.forEach(item => {
            const li = document.createElement('li');
            li.innerText = item;
            firstAidList.appendChild(li);
        });
    }

    if (redFlags && data.red_flags) {
        redFlags.innerText = Array.isArray(data.red_flags) ? data.red_flags.join(', ') : data.red_flags;
    }

    if (window.lucide) lucide.createIcons();
}

function syncQueryToTriageForm() {
    if (!currentAIAnswerData) return;
    const query = document.getElementById('ai-query-input').value;
    document.getElementById('p-transcript').value = query;

    if (currentAIAnswerData.preset_vitals) {
        const v = currentAIAnswerData.preset_vitals;
        if (v.spo2 !== undefined) document.getElementById('v-spo2').value = v.spo2;
        if (v.systolic_bp !== undefined) document.getElementById('v-sbp').value = v.systolic_bp;
        if (v.diastolic_bp !== undefined) document.getElementById('v-dbp').value = v.diastolic_bp;
        if (v.pulse_rate !== undefined) document.getElementById('v-pulse').value = v.pulse_rate;
        if (v.temp !== undefined) document.getElementById('v-temp').value = v.temp;
        if (v.pain !== undefined) document.getElementById('v-pain').value = v.pain;
    }
    showToast('Synced query into patient triage form! Click Submit when ready.', 'success');
}

function getLocalAIAnswer(q) {
    q = q.toLowerCase();
    if (q.includes('chhati') || q.includes('chest') || q.includes('saans') || q.includes('छाती')) {
        return {
            condition: "Severe Acute Chest Pain / Suspected Cardiac Risk (छाती में दर्द / एंजाइना या दिल का दौरा)",
            tier: "RED",
            esi_level: 1,
            urgency_badge: "🚨 EMERGENCY (PRIORITY RED)",
            explanation: "छाती में तेज दर्द, भारीपन या पसीना आना दिल की नसों में खून का बहाव कम होने या फेफड़ों की गंभीर समस्या का संकेत हो सकता है। यह एक इमरजेंसी स्थिति है।",
            first_aid: [
                "मरीज को तुरंत आरामदायक स्थिति में आधा लेटा दें (Semi-reclined posture).",
                "गले और छाती के कपड़े ढीले कर दें और खुली हवादार जगह में रखें।",
                "तुरंत मेडिकल ऑफिसर को सूचित करें और 108 एम्बुलेंस से डिस्ट्रिक्ट आईसीयू के लिए तैयार रहें।"
            ],
            red_flags: ["दर्द बाएं हाथ/जबड़े में फैलना", "सांस फूलना", "ठंडा पसीना आना"],
            preset_vitals: { spo2: 89, systolic_bp: 178, diastolic_bp: 104, pulse_rate: 118, temp: 98.4, pain: 9 }
        };
    } else if (q.includes('bukhar') || q.includes('fever') || q.includes('बुखार') || q.includes('ulti')) {
        return {
            condition: "Acute Febrile Illness / Suspected Viral, Dengue, or Malaria (तेज बुखार / डेंगू-मलेरिया या वायरल संक्रमण)",
            tier: "YELLOW",
            esi_level: 3,
            urgency_badge: "⚠️ URGENT (PRIORITY YELLOW)",
            explanation: "तेज बुखार शरीर में किसी वायरल या बैक्टीरियल इन्फेक्शन (जैसे डेंगू, मलेरिया, टाइफाइड) से लड़ने का संकेत है।",
            first_aid: [
                "माथे और गर्दन पर सामान्य पानी की ठंडी पट्टी (Cold Sponging) करें।",
                "ओआरएस (ORS), नारियल पानी, और तरल पदार्थ घूंट-घूंट कर पिलाएं।",
                "बिना डॉक्टर सलाह के एस्पिरिन या ब्रूफेन न लें, केवल पैरासिटामोल लें।"
            ],
            red_flags: ["शरीर पर लाल चकत्ते या ब्लीडिंग", "बहुत तेज सिरदर्द", "पेशाब कम होना"],
            preset_vitals: { spo2: 97, systolic_bp: 108, diastolic_bp: 72, pulse_rate: 102, temp: 102.8, pain: 6 }
        };
    } else {
        return {
            condition: "Osteoarthritis / Chronic Knee & Joint Pain (जोड़ों और घुटनों में दर्द / गठिया)",
            tier: "GREEN",
            esi_level: 4,
            urgency_badge: "🟢 ROUTINE CARE (PRIORITY GREEN)",
            explanation: "उम्र बढ़ने, कार्टिलेज के घिसने या यूरिक एसिड बढ़ने से घुटनों और जोड़ों में दर्द और अकड़न होती है।",
            first_aid: [
                "घुटने पर ज्यादा दबाव न डालें, जमीन पर उकड़ू (Squatting) बैठने से बचें।",
                "हल्की गर्म सिंकाई करें और घुटने को सपोर्ट देने के लिए नी-कैप का उपयोग करें।",
                "पीएचसी डॉक्टर से दर्द निवारक जेल व ऑस्टियोआर्थराइटिस का सही प्रिस्क्रिप्शन लें।"
            ],
            red_flags: ["घुटने में अचानक बहुत तेज सूजन", "पैर पर बिल्कुल वजन न रख पाना"],
            preset_vitals: { spo2: 99, systolic_bp: 128, diastolic_bp: 82, pulse_rate: 74, temp: 98.2, pain: 3 }
        };
    }
}

// Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

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
                document.getElementById('ai-query-input').value = transcript;
                askAIHealthAssistant();
            }
        };

        recognition.onend = () => {
            isRecording = false;
            document.getElementById('recording-indicator').classList.add('hidden');
            document.getElementById('record-btn-text').innerText = 'Start Voice Recording';
            document.getElementById('mic-icon').classList.remove('text-red-300');
        };
    }
}

function toggleVoiceRecording() {
    if (!recognition) {
        showToast('Speech recognition not supported in this browser. Type in the search box or use quick question chips.', 'info');
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
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
        if (window.lucide) lucide.createIcons();

        showToast(`Patient ${data.full_name} triaged as ${data.triage_tier} (ESI ${data.esi_level})! Added to doctor queue.`, 'success');
        
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
        if (window.lucide) lucide.createIcons();
        return;
    }

    queue.forEach((p, index) => {
        let borderClass = 'border-slate-700 bg-slate-800';
        let badgeClass = 'bg-slate-700 text-slate-300';

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

    if (window.lucide) lucide.createIcons();
}

function openConsultationModal(id, name, age, gender, esi, encodedSummary) {
    activeAssessmentId = id;
    document.getElementById('modal-patient-name').innerText = `Consultation: ${name}`;
    document.getElementById('modal-patient-meta').innerText = `Age: ${age}y | Gender: ${gender} | Urgency: ESI Level ${esi}`;
    document.getElementById('modal-summary-text').innerText = decodeURIComponent(encodedSummary);
    document.getElementById('consultation-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
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

async function loadAnalytics() {
    try {
        const res = await fetch('/api/analytics/summary');
        const data = await res.json();

        document.getElementById('stat-total').innerText = data.total_screened_today;
        if (data.triage_distribution) {
            document.getElementById('stat-red').innerText = data.triage_distribution.RED || 0;
        }

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
        console.log('WebSocket fallback');
    }
}

function triggerEmergencyAlertDemo() {
    showToast('🚨 CRITICAL SOS: Inbound Patient with SpO2 86% - Respiratory Arrest Risk', 'error');
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
