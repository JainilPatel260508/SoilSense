document.addEventListener('DOMContentLoaded', () => {

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

});
