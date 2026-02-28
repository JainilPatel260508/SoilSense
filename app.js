document.addEventListener('DOMContentLoaded', () => {
    // Mock Data for individual charts
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const nitrogenData = [95, 98, 100, 102, 105, 104, 105];
    const phosphorusData = [40, 42, 43, 45, 44, 46, 45];
    const potassiumData = [35, 36, 38, 39, 40, 41, 40];

    const temperatureData = [22, 24, 23, 25, 26, 25, 24];
    const rainfallData = [5, 0, 12, 2, 0, 0, 8];
    const phData = [6.5, 6.4, 6.6, 6.5, 6.5, 6.4, 6.5];
    const humidityData = [60, 58, 62, 59, 55, 57, 60];

    // Common options for smaller charts
    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index', intersect: false,
                backgroundColor: 'rgba(22, 27, 34, 0.9)',
                titleColor: '#e6edf3', bodyColor: '#e6edf3',
                borderColor: '#30363d', borderWidth: 1
            }
        },
        scales: {
            x: { grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } },
            y: { grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        layout: { padding: { bottom: 10 } }
    };

    // 1. Initialize Master NPK Chart
    new Chart(document.getElementById('npkChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Nitrogen (N) mg/kg',
                    data: nitrogenData,
                    borderColor: '#3fb950', // Green
                    backgroundColor: 'rgba(63, 185, 80, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Phosphorus (P) mg/kg',
                    data: phosphorusData,
                    borderColor: '#1f6feb', // Blue
                    backgroundColor: 'rgba(31, 111, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Potassium (K) mg/kg',
                    data: potassiumData,
                    borderColor: '#d29922', // Yellow
                    backgroundColor: 'rgba(210, 153, 34, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#8b949e', font: { family: 'Inter', size: 12 } } },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(22, 27, 34, 0.9)', titleColor: '#e6edf3', bodyColor: '#e6edf3',
                    borderColor: '#30363d', borderWidth: 1
                }
            },
            scales: {
                x: { grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' } },
                y: { grid: { color: 'rgba(48, 54, 61, 0.5)' }, ticks: { color: '#8b949e' }, beginAtZero: true }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            layout: { padding: { bottom: 10 } }
        }
    });

    // 2. Initialize Individual Climate Charts
    new Chart(document.getElementById('temperatureChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Temperature (°C)', data: temperatureData, borderColor: '#ff7b72', backgroundColor: 'rgba(255, 123, 114, 0.1)', borderWidth: 2, tension: 0.4, fill: true }]
        },
        options: commonChartOptions
    });

    new Chart(document.getElementById('rainfallChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{ label: 'Rainfall (mm)', data: rainfallData, backgroundColor: 'rgba(31, 111, 235, 0.6)', borderColor: '#1f6feb', borderWidth: 1 }]
        },
        // We override the commonChartOptions scales.x to add offset: true so the bar edges at the start and end (Monday and Sunday) aren't cut in half
        options: {
            ...commonChartOptions,
            scales: {
                ...commonChartOptions.scales,
                x: {
                    ...commonChartOptions.scales.x,
                    offset: true
                }
            }
        }
    });

    new Chart(document.getElementById('phChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Soil pH', data: phData, borderColor: '#a371f7', backgroundColor: 'rgba(163, 113, 247, 0.1)', borderWidth: 2, tension: 0.4, fill: true }]
        },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, min: 0, max: 14 } } }
    });

    new Chart(document.getElementById('humidityChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Humidity (%)', data: humidityData, borderColor: '#79c0ff', backgroundColor: 'rgba(121, 192, 255, 0.1)', borderWidth: 2, tension: 0.4, fill: true }]
        },
        options: { ...commonChartOptions, scales: { ...commonChartOptions.scales, y: { ...commonChartOptions.scales.y, min: 0, max: 100 } } }
    });

    // 4. View Toggle Logic (Farmer vs Expert)
    const viewToggle = document.getElementById('viewToggle');
    const farmerView = document.getElementById('farmerView');
    const expertView = document.getElementById('expertView');
    const farmerLabel = document.getElementById('farmerLabel');
    const expertLabel = document.getElementById('expertLabel');

    viewToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            // Expert View (Checked)
            expertView.style.display = 'block';
            farmerView.style.display = 'none';
            expertLabel.classList.add('active');
            farmerLabel.classList.remove('active');
        } else {
            // Farmer View (Unchecked)
            expertView.style.display = 'none';
            farmerView.style.display = 'flex'; // Uses flex for the alert layout
            farmerLabel.classList.add('active');
            expertLabel.classList.remove('active');
        }
    });
});
