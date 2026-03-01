document.addEventListener('DOMContentLoaded', () => {

    // --- Fetch crop labels from backend on load (so dropdowns have options when results show) ---
    fetch('http://127.0.0.1:5001/api/crop_labels')
        .then(res => res.json())
        .then(data => {
            if (data.crop_labels && data.crop_labels.length) {
                window._cropLabels = data.crop_labels;
                populateCropDropdowns(data.crop_labels);
            }
        })
        .catch(() => { window._cropLabels = []; });

    // --- References to DOM Elements ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadStatus = document.getElementById('upload-status');
    const uploadPrompt = document.getElementById('upload-prompt');
    const resultsContainer = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');
    const alertsContainer = document.getElementById('alerts-container');

    // --- Chart Global Instances ---
    let npkChartInstance = null;
    let climateChartInstance = null;
    let soilParamChartInstance = null;

    // --- Common Chart Options ---
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'top', 
                labels: { color: '#8b949e', font: { family: 'Inter', size: 12 } } 
            },
            tooltip: {
                mode: 'index', intersect: false,
                backgroundColor: 'rgba(22, 27, 34, 0.9)',
                titleColor: '#e6edf3', bodyColor: '#e6edf3',
                borderColor: '#30363d', borderWidth: 1
            }
        },
        scales: {
            x: { 
                grid: { color: 'rgba(48, 54, 61, 0.5)' }, 
                ticks: { color: '#8b949e', maxRotation: 45, minRotation: 0 } 
            },
            y: { 
                grid: { color: 'rgba(48, 54, 61, 0.5)' }, 
                ticks: { color: '#8b949e' } 
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        elements: {
            point: { radius: 2, hoverRadius: 5 }
        }
    };

    // --- Chart Initialization / Update Function ---
    function updateCharts(timeSeriesData) {
        const labels = timeSeriesData.labels;

        // 1. NPK Chart
        const npkCtx = document.getElementById('npkChart').getContext('2d');
        if (npkChartInstance) npkChartInstance.destroy();
        npkChartInstance = new Chart(npkCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nitrogen (N)',
                        data: timeSeriesData.N,
                        borderColor: '#3fb950', // Green
                        backgroundColor: 'rgba(63, 185, 80, 0.05)',
                        borderWidth: 2, tension: 0.4, fill: true
                    },
                    {
                        label: 'Phosphorus (P)',
                        data: timeSeriesData.P,
                        borderColor: '#1f6feb', // Blue
                        backgroundColor: 'rgba(31, 111, 235, 0.05)',
                        borderWidth: 2, tension: 0.4, fill: true
                    },
                    {
                        label: 'Potassium (K)',
                        data: timeSeriesData.K,
                        borderColor: '#d29922', // Yellow
                        backgroundColor: 'rgba(210, 153, 34, 0.05)',
                        borderWidth: 2, tension: 0.4, fill: true
                    }
                ]
            },
            options: commonChartOptions
        });

        // 2. Climate Chart (Temp & Rain)
        const climateCtx = document.getElementById('climateChart').getContext('2d');
        if (climateChartInstance) climateChartInstance.destroy();
        climateChartInstance = new Chart(climateCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Temp (°C)',
                        data: timeSeriesData.temperature,
                        borderColor: '#ff7b72',
                        backgroundColor: 'transparent',
                        borderWidth: 2, tension: 0.3, yAxisID: 'y'
                    },
                    {
                        type: 'bar',
                        label: 'Rainfall (mm)',
                        data: timeSeriesData.rainfall,
                        backgroundColor: 'rgba(31, 111, 235, 0.4)',
                        borderColor: '#1f6feb',
                        borderWidth: 1, yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...commonChartOptions,
                scales: {
                    x: { ...commonChartOptions.scales.x, offset: true },
                    y: { ...commonChartOptions.scales.y, type: 'linear', display: true, position: 'left', title: {display: true, text: 'Temp', color: '#8b949e'} },
                    y1: { type: 'linear', display: true, position: 'right', grid: {drawOnChartArea: false}, title: {display: true, text: 'Rain', color: '#8b949e'} }
                }
            }
        });

        // 3. Soil Params (pH & Humidity)
        const soilCtx = document.getElementById('soilParamChart').getContext('2d');
        if (soilParamChartInstance) soilParamChartInstance.destroy();
        soilParamChartInstance = new Chart(soilCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Soil pH',
                        data: timeSeriesData.ph,
                        borderColor: '#a371f7', // Purple
                        borderWidth: 2, tension: 0.3, yAxisID: 'y'
                    },
                    {
                        label: 'Humidity (%)',
                        data: timeSeriesData.humidity,
                        borderColor: '#79c0ff', // Light blue
                        borderDash: [5, 5],
                        borderWidth: 2, tension: 0.3, yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...commonChartOptions,
                scales: {
                    x: { ...commonChartOptions.scales.x },
                    y: { ...commonChartOptions.scales.y, min: 0, max: 14, title: {display: true, text: 'pH', color: '#8b949e'} },
                    y1: { type: 'linear', display: true, position: 'right', min: 0, max: 100, grid: {drawOnChartArea: false}, title: {display: true, text: 'Humidity %', color: '#8b949e'} }
                }
            }
        });
    }

    // --- Choice bar: collapse (hide pills, show summary) / expand ---
    function collapseChoiceBar() {
        const collapsed = document.getElementById('choice-bar-collapsed');
        const expanded = document.getElementById('choice-bar-expanded');
        if (collapsed) collapsed.style.display = 'flex';
        if (expanded) expanded.style.display = 'none';
    }
    function expandChoiceBar() {
        const collapsed = document.getElementById('choice-bar-collapsed');
        const expanded = document.getElementById('choice-bar-expanded');
        if (collapsed) collapsed.style.display = 'none';
        if (expanded) expanded.style.display = 'flex';
    }
    function updateChoiceBarSummary() {
        const summaryEl = document.getElementById('choice-bar-summary');
        if (!summaryEl) return;
        const isAlreadySown = (document.querySelector('input[name="sowStatusResults"]:checked') || document.querySelector('input[name="sowStatus"]:checked'))?.value === 'already';
        const sowChoice = (document.querySelector('input[name="sowChoice"]:checked') || { value: 'own' }).value;
        if (isAlreadySown) summaryEl.textContent = 'Viewing as: Already sown';
        else if (sowChoice === 'own') summaryEl.textContent = 'Viewing as: Sow seeds • Full overview';
        else if (sowChoice === 'recommendation') summaryEl.textContent = 'Viewing as: Sow seeds • Recommendation';
        else summaryEl.textContent = 'Viewing as: Sow seeds • I want to sow';
    }

    // --- Apply show/hide based on situation + view choice (uses _lastAnalyzeResult or passed data) ---
    function applyChoiceLayout(data) {
        const d = data || window._lastAnalyzeResult;
        if (!d) return;
        const isAlreadySown = (document.querySelector('input[name="sowStatusResults"]:checked') || document.querySelector('input[name="sowStatus"]:checked'))?.value === 'already';
        const sowChoice = (document.querySelector('input[name="sowChoice"]:checked') || { value: 'own' }).value;
        const cropRecCard = document.getElementById('crop-rec-card');
        const cropNeedsCard = document.getElementById('crop-needs-card');
        const showMeGroup = document.getElementById('show-me-group');
        const alreadySownBlock = document.getElementById('already-sown-block');
        const managementCard = document.getElementById('already-sown-management-card');

        if (isAlreadySown) {
            cropRecCard.style.display = 'none';
            cropNeedsCard.style.display = 'none';
            if (showMeGroup) showMeGroup.style.display = 'none';
            if (alreadySownBlock) alreadySownBlock.style.display = 'block';
            // Ensure crop dropdown has options whenever we show this block
            populateCropDropdowns(d.crop_labels || window._cropLabels);
            const sel = document.getElementById('sown-crop-select');
            const reqs = (d.all_crop_requirements || {})[sel && sel.value ? sel.value : ''];
            if (reqs && managementCard) {
                managementCard.style.display = 'block';
                renderCropNeeds(sel.value, reqs, 'already-sown-management-content');
            } else if (managementCard) managementCard.style.display = 'none';
        } else {
            if (alreadySownBlock) alreadySownBlock.style.display = 'none';
            if (showMeGroup) showMeGroup.style.display = 'flex';
            const sowSpecificBlock = document.getElementById('sow-specific-block');
            if (sowChoice === 'own') {
                cropRecCard.style.display = 'block';
                cropNeedsCard.style.display = 'none';
                if (sowSpecificBlock) sowSpecificBlock.style.display = 'none';
            } else if (sowChoice === 'recommendation') {
                cropRecCard.style.display = 'none';
                cropNeedsCard.style.display = 'block';
                if (sowSpecificBlock) sowSpecificBlock.style.display = 'none';
                renderCropNeeds(d.predicted_crop, d.crop_requirements || {}, 'crop-needs-content');
            } else {
                cropRecCard.style.display = 'none';
                cropNeedsCard.style.display = 'none';
                if (sowSpecificBlock) sowSpecificBlock.style.display = 'block';
                const wantSelect = document.getElementById('want-sow-crop-select');
                if (wantSelect && wantSelect.value) {
                    renderCropReadiness(wantSelect.value, d.current_averages || {}, d.crop_favourable_ranges || {}, d.all_crop_requirements || {});
                    const card = document.getElementById('sow-specific-readiness-card');
                    if (card) card.style.display = 'block';
                } else {
                    const card = document.getElementById('sow-specific-readiness-card');
                    const content = document.getElementById('sow-specific-readiness-content');
                    if (card) card.style.display = 'none';
                    if (content) content.innerHTML = '<p class="ai-desc">Select a crop above to see if your soil is ready.</p>';
                }
            }
        }
        updateChoiceBarSummary();
    }

    // --- Crop labels cache (from API or analyze response) ---
    function getCropLabels(callback) {
        if (window._cropLabels && window._cropLabels.length) {
            callback(window._cropLabels);
            return;
        }
        fetch('http://127.0.0.1:5001/api/crop_labels')
            .then(res => res.json())
            .then(data => {
                const labels = (data && data.crop_labels) ? data.crop_labels : [];
                if (labels.length) window._cropLabels = labels;
                callback(labels);
            })
            .catch(() => callback([]));
    }

    // --- Populate crop dropdowns (hidden inputs + custom list content); also used after CSV to set _cropLabels ---
    function populateCropDropdowns(cropLabels) {
        const raw = Array.isArray(cropLabels) ? cropLabels : [];
        const labels = raw.map(c => (typeof c === 'string' ? c : String(c)).trim()).filter(Boolean);
        if (labels.length) window._cropLabels = labels;
        // Fill custom list panels so next time user opens dropdown, options are there
        const sownList = document.getElementById('sown-crop-list');
        const wantList = document.getElementById('want-sow-crop-list');
        const optionHtml = labels.map(c => {
            const name = c.charAt(0).toUpperCase() + c.slice(1);
            return `<button type="button" class="custom-crop-option" data-value="${c.replace(/"/g, '&quot;')}">${name.replace(/</g, '&lt;')}</button>`;
        }).join('');
        if (sownList) sownList.innerHTML = optionHtml;
        if (wantList) wantList.innerHTML = optionHtml;
    }

    // --- Open custom dropdown and ensure options are loaded ---
    function openCustomCropDropdown(btnId, listId, inputId, placeholder) {
        const list = document.getElementById(listId);
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!list || !btn) return;
        const hasOptions = list.querySelectorAll('.custom-crop-option').length > 0;
        if (hasOptions) {
            list.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            list.setAttribute('aria-hidden', 'false');
            return;
        }
        getCropLabels(labels => {
            if (labels.length) {
                const optionHtml = labels.map(c => {
                    const name = c.charAt(0).toUpperCase() + c.slice(1);
                    return `<button type="button" class="custom-crop-option" data-value="${c.replace(/"/g, '&quot;')}">${name.replace(/</g, '&lt;')}</button>`;
                }).join('');
                list.innerHTML = optionHtml;
            } else {
                list.innerHTML = '<div class="custom-crop-option" style="color: var(--text-secondary);">No crops loaded. Is the backend running?</div>';
            }
            list.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            list.setAttribute('aria-hidden', 'false');
        });
    }

    function closeCustomCropDropdown(listId, btnId) {
        const list = document.getElementById(listId);
        const btn = document.getElementById(btnId);
        if (list) { list.classList.remove('is-open'); list.setAttribute('aria-hidden', 'true'); }
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function initCustomCropDropdown(btnId, listId, inputId, placeholder) {
        const btn = document.getElementById(btnId);
        const list = document.getElementById(listId);
        const input = document.getElementById(inputId);
        if (!btn || !list || !input) return;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = list.classList.contains('is-open');
            if (isOpen) {
                closeCustomCropDropdown(listId, btnId);
            } else {
                openCustomCropDropdown(btnId, listId, inputId, placeholder);
            }
        });
        list.addEventListener('click', (e) => {
            e.stopPropagation();
            const opt = e.target.closest('.custom-crop-option[data-value]');
            if (!opt) return;
            const value = opt.getAttribute('data-value');
            input.value = value;
            btn.textContent = opt.textContent.trim();
            closeCustomCropDropdown(listId, btnId);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.closest('.custom-crop-dropdown')) return;
        closeCustomCropDropdown('sown-crop-list', 'sown-crop-btn');
        closeCustomCropDropdown('want-sow-crop-list', 'want-sow-crop-btn');
    });

    // --- Render "Is your soil ready?" current vs ideal + soil-health advice ---
    function renderCropReadiness(crop, currentAverages, favourableRanges, allReqs) {
        const el = document.getElementById('sow-specific-readiness-content');
        if (!el) return;
        const ranges = favourableRanges[crop];
        const current = currentAverages || {};
        const reqs = allReqs[crop] || {};
        if (!ranges || typeof ranges !== 'object') {
            el.innerHTML = '<p class="ai-desc">No favourable data for this crop.</p>';
            return;
        }
        const name = (crop || '').charAt(0).toUpperCase() + (crop || '').slice(1);
        const paramLabels = { N: 'N (mg/kg)', P: 'P (mg/kg)', K: 'K (mg/kg)', temperature: 'Temp (°C)', humidity: 'Humidity (%)', ph: 'pH', rainfall: 'Rainfall (mm)' };
        let html = `<p class="ai-desc" style="margin-bottom: 0.75rem;"><strong>${name}</strong> – favourable conditions (from model training data) vs your current soil:</p>`;
        html += '<table class="readiness-table"><thead><tr><th>Parameter</th><th>Current</th><th>Ideal range</th><th>Status</th><th>Soil health</th></tr></thead><tbody>';
        let allOk = true;
        for (const [key, [min, max]] of Object.entries(ranges)) {
            const cur = current[key];
            const curVal = cur != null ? Number(cur) : null;
            let status = '—';
            let advice = '';
            if (curVal != null && !Number.isNaN(curVal)) {
                if (curVal >= min && curVal <= max) {
                    status = '<span class="status-ok">OK</span>';
                } else {
                    allOk = false;
                    if (curVal < min) {
                        status = '<span class="status-low">Low</span>';
                        if (key === 'N') advice = 'Add nitrogen (e.g. urea, compost) for healthy growth.';
                        else if (key === 'P') advice = 'Add phosphorus (e.g. rock phosphate, bone meal) for roots.';
                        else if (key === 'K') advice = 'Add potassium (e.g. potash) for vigour.';
                        else if (key === 'ph') advice = 'Apply lime to raise pH or improve drainage.';
                        else if (key === 'humidity' || key === 'rainfall') advice = 'Increase irrigation or mulch to retain moisture.';
                        else if (key === 'temperature') advice = 'Consider planting when temps are in range, or use shade/mulch.';
                        else advice = 'Bring into ideal range for best yield.';
                    } else {
                        status = '<span class="status-high">High</span>';
                        if (key === 'N') advice = 'Avoid excess N; reduce fertiliser, allow leaching.';
                        else if (key === 'P') advice = 'Avoid more P; excess can lock up micronutrients.';
                        else if (key === 'ph') advice = 'Apply sulfur or organic matter to lower pH.';
                        else if (key === 'humidity' || key === 'rainfall') advice = 'Improve drainage; avoid overwatering.';
                        else advice = 'Bring into ideal range for soil health.';
                    }
                }
            }
            const rangeStr = min != null && max != null ? `${min.toFixed(1)} – ${max.toFixed(1)}` : '–';
            const curStr = curVal != null ? curVal.toFixed(1) : '—';
            html += `<tr><td>${paramLabels[key] || key}</td><td>${curStr}</td><td>${rangeStr}</td><td>${status}</td><td class="advice-cell">${advice || '—'}</td></tr>`;
        }
        html += '</tbody></table>';
        if (allOk) html += '<p class="ai-desc status-ok" style="margin-top: 0.75rem;"><strong>Your current levels are suitable for this crop.</strong> Focus on maintaining soil health with the care tips below.</p>';
        if (reqs.care) html += `<p class="ai-desc" style="margin-top: 0.75rem;">${reqs.care}</p>`;
        el.innerHTML = html;
    }

    // --- Render "What this crop needs" from API crop_requirements (targetElId optional) ---
    function renderCropNeeds(cropName, req, targetElId) {
        const el = document.getElementById(targetElId || 'crop-needs-content');
        if (!el) return;
        if (!req || Object.keys(req).length === 0) {
            el.innerHTML = '<p class="ai-desc">Select a crop above to see soil management guidance.</p>';
            return;
        }
        const name = (cropName || '').charAt(0).toUpperCase() + (cropName || '').slice(1);
        let html = `<p class="ai-desc" style="margin-bottom: 0.75rem;"><strong>${name}</strong> – ideal ranges:</p><ul style="margin: 0; padding-left: 1.25rem; color: #c9d1d9; font-size: 0.9rem;">`;
        if (req.N) html += `<li>N: ${req.N} &nbsp; P: ${req.P || '–'} &nbsp; K: ${req.K || '–'}</li>`;
        if (req.temp) html += `<li>Temp: ${req.temp} &nbsp; Humidity: ${req.humidity || '–'} &nbsp; pH: ${req.ph || '–'}</li>`;
        if (req.rainfall) html += `<li>Rainfall: ${req.rainfall}</li>`;
        html += '</ul>';
        if (req.care) html += `<p class="ai-desc" style="margin-top: 0.75rem;">${req.care}</p>`;
        el.innerHTML = html;
    }

    // --- Helper function to set trend arrows ---
    function setTrendIcon(elementId, trend) {
        const el = document.getElementById(elementId);
        if (trend === 'increasing') {
            el.innerHTML = '<i class="fa-solid fa-arrow-up" style="color: #ff7b72;"></i>'; // Red up (usually bad or warming)
            if(elementId === 'trend-n') el.innerHTML = '<i class="fa-solid fa-arrow-up" style="color: #3fb950;"></i>'; // Green up for N
        } else if (trend === 'decreasing') {
            el.innerHTML = '<i class="fa-solid fa-arrow-down" style="color: #3fb950;"></i>'; // Green down
            if(elementId === 'trend-n' || elementId === 'trend-moisture') el.innerHTML = '<i class="fa-solid fa-arrow-down" style="color: #ff7b72;"></i>'; // Red down for N/Moisture
        } else {
            el.innerHTML = '<i class="fa-solid fa-minus" style="color: #8b949e;"></i>';
        }
    }

    // --- API Fetch Logic ---
    async function processCSV(file) {
        uploadPrompt.style.display = 'none';
        uploadStatus.style.display = 'flex';
        dropZone.style.borderColor = '#1f6feb'; // active state

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://127.0.0.1:5001/api/analyze_csv', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // Success! Populate the UI
            emptyState.style.display = 'none';
            resultsContainer.style.display = 'block';

            // Sync upload section choice to results bar
            const sowStatusChecked = document.querySelector('input[name="sowStatus"]:checked');
            const resultsSowSow = document.getElementById('sowStatusResults-sow');
            const resultsSowAlready = document.getElementById('sowStatusResults-already');
            if (sowStatusChecked) {
                if (sowStatusChecked.value === 'sow') resultsSowSow.checked = true;
                else resultsSowAlready.checked = true;
            }
            // Hide top buttons: upload section "Your situation" once results are shown
            const uploadSowOption = document.getElementById('upload-sow-option');
            if (uploadSowOption) uploadSowOption.style.display = 'none';
            // Show choice bar expanded so user can pick options and click Apply
            updateChoiceBarSummary();
            expandChoiceBar();
            applyChoiceLayout(data);

            // Populate Recommendation Cards
            document.getElementById('rec-crop-name').innerText = data.predicted_crop.charAt(0).toUpperCase() + data.predicted_crop.slice(1);
            document.getElementById('rec-planting-window').innerText = data.planting_window;
            document.getElementById('rec-yield-score').innerText = data.historical_yield_score;

            // Optional: color yield score based on value
            const scoreCircle = document.querySelector('.score-circle');
            if (data.historical_yield_score > 80) scoreCircle.style.borderColor = '#3fb950'; // Green
            else if (data.historical_yield_score > 50) scoreCircle.style.borderColor = '#d29922'; // Yellow
            else scoreCircle.style.borderColor = '#f85149'; // Red

            // Populate Average Metrics (take the last value from the time series as the "current")
            const len = data.time_series_data.N.length;
            document.getElementById('val-n').innerText = data.time_series_data.N[len-1].toFixed(1);
            document.getElementById('val-p').innerText = data.time_series_data.P[len-1].toFixed(1);
            document.getElementById('val-k').innerText = data.time_series_data.K[len-1].toFixed(1);
            document.getElementById('val-temp').innerHTML = `${data.time_series_data.temperature[len-1].toFixed(1)} <span class="unit" style="font-size: 0.6em;">°C</span>`;
            document.getElementById('val-moisture').innerHTML = `${data.time_series_data.humidity[len-1].toFixed(1)} <span class="unit" style="font-size: 0.6em;">%</span>`;

            // Set Trends
            setTrendIcon('trend-n', data.trends.nitrogen);
            setTrendIcon('trend-temp', data.trends.temperature);
            setTrendIcon('trend-moisture', data.trends.moisture);

            // Populate Alerts
            alertsContainer.innerHTML = '';
            if (data.active_alerts && data.active_alerts.length > 0) {
                data.active_alerts.forEach(alertText => {
                    const alertDiv = document.createElement('div');
                    alertDiv.className = 'alert-card';
                    
                    let icon = '⚠️';
                    if (alertText.includes("CRITICAL")) {
                        alertDiv.classList.add('critical');
                        icon = '🚨';
                    } else if (alertText.includes("WARNING") || alertText.includes("ACTION")) {
                        alertDiv.classList.add('warning');
                        icon = '⚠️';
                    } else {
                        alertDiv.classList.add('success');
                        icon = '✅';
                    }

                    alertDiv.innerHTML = `
                        <div class="alert-icon">${icon}</div>
                        <div class="alert-content">
                            <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem;">${alertText.split(':')[0]}</h3>
                            <p style="margin: 0; color: #c9d1d9;">${alertText.substring(alertText.indexOf(':') + 1 || 0)}</p>
                        </div>
                    `;
                    alertsContainer.appendChild(alertDiv);
                });
            } else {
                alertsContainer.innerHTML = `
                    <div class="alert-card success">
                        <div class="alert-icon">✅</div>
                        <div class="alert-content">
                            <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1rem;">All Good!</h3>
                            <p style="margin: 0; color: #c9d1d9;">No critical thresholds breached in the recent data.</p>
                        </div>
                    </div>
                `;
            }

            // Draw Charts
            updateCharts(data.time_series_data);

            // Populate crop dropdowns (from response or from earlier fetch; if still none, fetch now)
            const labels = data.crop_labels || window._cropLabels;
            if (labels && labels.length) {
                populateCropDropdowns(labels);
            } else {
                fetch('http://127.0.0.1:5001/api/crop_labels')
                    .then(r => r.json())
                    .then(o => {
                        if (o.crop_labels && o.crop_labels.length) {
                            window._cropLabels = o.crop_labels;
                            populateCropDropdowns(o.crop_labels);
                        }
                    })
                    .catch(() => {});
            }

            // Store latest result for sow-choice toggles
            window._lastAnalyzeResult = data;

        } catch (error) {
            console.error("Error calling backend:", error);
            alert(`Analysis failed: ${error.message}`);
        } finally {
            // Restore drop zone
            uploadPrompt.style.display = 'block';
            uploadStatus.style.display = 'none';
            dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    }

    // --- Drag and Drop Event Listeners ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-active');
        dropZone.style.borderColor = '#4ade80';
        dropZone.style.backgroundColor = 'rgba(74, 222, 128, 0.05)';
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-active');
        dropZone.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        dropZone.style.backgroundColor = 'transparent';
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            const file = files[0];
            if(file.name.endsWith('.csv')){
                processCSV(file);
            } else {
                alert("Please upload a .csv file.");
            }
        }
    }

    // --- Browse File Button Logic ---
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        if (this.files && this.files.length > 0) {
            processCSV(this.files[0]);
        }
    });

    // --- View Toggle Logic ---
    const viewToggle = document.getElementById('viewToggle');
    const expertView = document.getElementById('expertView');
    const farmerLabel = document.getElementById('farmerLabel');
    const expertLabel = document.getElementById('expertLabel');

    viewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            expertView.style.display = 'block';
            expertLabel.classList.add('active');
            farmerLabel.classList.remove('active');
        } else {
            expertView.style.display = 'none';
            farmerLabel.classList.add('active');
            expertLabel.classList.remove('active');
        }
    });

    // --- Sync situation: upload section <-> results bar; apply layout on change ---
    function syncSowStatusToUpload() {
        const res = document.querySelector('input[name="sowStatusResults"]:checked');
        if (!res) return;
        const sowEl = document.getElementById('sowStatus-sow');
        const alreadyEl = document.getElementById('sowStatus-already');
        if (sowEl) sowEl.checked = (res.value === 'sow');
        if (alreadyEl) alreadyEl.checked = (res.value === 'already');
    }
    function syncSowStatusToResults() {
        const up = document.querySelector('input[name="sowStatus"]:checked');
        if (!up) return;
        const sowEl = document.getElementById('sowStatusResults-sow');
        const alreadyEl = document.getElementById('sowStatusResults-already');
        if (sowEl) sowEl.checked = (up.value === 'sow');
        if (alreadyEl) alreadyEl.checked = (up.value === 'already');
    }
    document.querySelectorAll('input[name="sowStatus"]').forEach(radio => {
        radio.addEventListener('change', () => {
            syncSowStatusToResults();
            applyChoiceLayout();
        });
    });
    document.querySelectorAll('input[name="sowStatusResults"]').forEach(radio => {
        radio.addEventListener('change', () => {
            syncSowStatusToUpload();
            applyChoiceLayout();
        });
    });
    document.querySelectorAll('input[name="sowChoice"]').forEach(radio => {
        radio.addEventListener('change', () => applyChoiceLayout());
    });

    // Apply button: confirm choices and collapse the bar
    const btnApplyChoice = document.getElementById('btn-apply-choice');
    if (btnApplyChoice) {
        btnApplyChoice.addEventListener('click', () => {
            syncSowStatusToUpload();
            applyChoiceLayout();
            collapseChoiceBar();
        });
    }

    // "Change" button: show full choice bar again
    const btnChangeChoice = document.getElementById('btn-change-choice');
    if (btnChangeChoice) btnChangeChoice.addEventListener('click', expandChoiceBar);

    // Init custom crop dropdowns (load options when opened)
    initCustomCropDropdown('sown-crop-btn', 'sown-crop-list', 'sown-crop-select', '— Select your crop —');
    initCustomCropDropdown('want-sow-crop-btn', 'want-sow-crop-list', 'want-sow-crop-select', '— Select crop —');

    // Already sown: which crop selected -> show soil management
    const sownCropInput = document.getElementById('sown-crop-select');
    if (sownCropInput) {
        sownCropInput.addEventListener('change', () => {
            const data = window._lastAnalyzeResult;
            const allReqs = (data && data.all_crop_requirements) || {};
            const crop = sownCropInput.value;
            const reqs = allReqs[crop];
            const managementCard = document.getElementById('already-sown-management-card');
            const contentEl = document.getElementById('already-sown-management-content');
            if (managementCard && contentEl) {
                if (reqs) {
                    managementCard.style.display = 'block';
                    renderCropNeeds(crop, reqs, 'already-sown-management-content');
                } else {
                    managementCard.style.display = 'none';
                    contentEl.innerHTML = '<p class="ai-desc">Select your crop above.</p>';
                }
            }
        });
    }

    // I want to sow: which crop selected -> show readiness (current vs ideal)
    const wantSowCropInput = document.getElementById('want-sow-crop-select');
    if (wantSowCropInput) {
        wantSowCropInput.addEventListener('change', () => {
            const data = window._lastAnalyzeResult;
            if (!data) return;
            const crop = wantSowCropInput.value;
            const card = document.getElementById('sow-specific-readiness-card');
            const content = document.getElementById('sow-specific-readiness-content');
            if (crop) {
                renderCropReadiness(crop, data.current_averages || {}, data.crop_favourable_ranges || {}, data.all_crop_requirements || {});
                if (card) card.style.display = 'block';
            } else {
                if (card) card.style.display = 'none';
                if (content) content.innerHTML = '<p class="ai-desc">Select a crop above to see if your soil is ready.</p>';
            }
        });
    }

});
