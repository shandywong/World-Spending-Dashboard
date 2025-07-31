/* ==================== SIDEBAR ==================== */
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("closed");

    // Resize charts after sidebar animation
    setTimeout(() => {
        if (barChartInstance) barChartInstance.resize();
        if (lineChartInstance) lineChartInstance.resize();
        if (pieChartInstance) pieChartInstance.resize();
        if (document.getElementById('worldMap')) Plotly.Plots.resize('worldMap');
    }, 300);
}

/* ==================== GLOBAL VARIABLES ==================== */
let barChartInstance = null;
let lineChartInstance = null;
let pieChartInstance = null;

/* ==================== DATA LOADING ==================== */
document.addEventListener("DOMContentLoaded", function() {
    const isDashboard = document.getElementById('barChart');
    const isTablePage = document.getElementById('dataTable');
    const isWorldMap = document.getElementById('worldMap');

    Papa.parse("spending.csv", {
        download: true,
        header: true,
        complete: function(results) {
            // Clean data: trim spaces and filter empty rows
            const data = results.data
                .filter(d => d.Country)
                .map(d => ({
                    ...d,
                    Country: d.Country.trim(),
                    Region: d.Region.trim()
                }));

            if (isDashboard) renderDashboard(data);
            if (isTablePage) renderTable(data);
            if (isWorldMap) renderWorldMap(data);
        }
    });
});

/* ==================== DASHBOARD ==================== */
function renderDashboard(data){
    const ctxBar = document.getElementById('barChart')?.getContext('2d');
    const ctxLine = document.getElementById('lineChart')?.getContext('2d');
    const ctxPie = document.getElementById('pieChart')?.getContext('2d');
    const regionFilter = document.getElementById('regionFilter');

    function updateCharts(region){
        const filtered = region === "all" ? data : data.filter(d => d.Region === region);

        // Destroy old charts if they exist
        if (barChartInstance) barChartInstance.destroy();
        if (lineChartInstance) lineChartInstance.destroy();
        if (pieChartInstance) pieChartInstance.destroy();

        /* ---------- BAR CHART ---------- */
        const countries = [...new Set(filtered.map(d => d.Country))];
        const avgIncome = countries.map(c => {
            const vals = filtered
                .filter(d => d.Country === c)
                .map(d => parseFloat(d.Average_Monthly_Income) || 0);
            return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
        });

        barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: countries,
                datasets: [{
                    label: 'Average Monthly Income',
                    data: avgIncome,
                    backgroundColor: '#36a2eb',
                    hoverBackgroundColor: '#1f77b4'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: ctx => `${ctx.label}: ${ctx.raw.toFixed(2)}`
                        }
                    },
                    title: { 
                        display: true, 
                        text: 'Average Monthly Income (USD) by Country',
                        font: { size: 20 }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { font: { size: 15 } } },
                    y: { ticks: { font: { size: 15 } } }
                }
            }
        });

        /* ---------- LINE CHART ---------- */
       const yearMap = {};
        filtered.forEach(d => {
            const year = parseInt(d.Year);
            const cost = parseFloat(d.Cost_of_Living) || 0;
            if (!yearMap[year]) yearMap[year] = [];
            yearMap[year].push(cost);
        });

        const years = Object.keys(yearMap).map(Number).sort((a,b)=>a-b);
        const avgCost = years.map(y =>
            yearMap[y].reduce((a,b)=>a+b,0) / yearMap[y].length
        );

        lineChartInstance = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: years,
                datasets: [{
                    label: 'Average Cost of Living',
                    data: avgCost,
                    borderColor: 'orange',
                    backgroundColor: 'rgba(255,165,0,0.2)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: ctx => `${ctx.label}: ${ctx.raw.toFixed(2)}`
                        }
                    },
                    title: { 
                        display: true, 
                        text: 'Average Cost of Living (USD) by Year',
                        font: { size: 20 }
                    }
                },
                scales: {
                    x: { ticks: { font: { size: 15 } } },
                    y: { ticks: { font: { size: 15 } } }
                }
            }
        });

        /* ---------- PIE CHART ---------- */
        const categories = [
            "Housing_Cost_Percentage", 
            "Transportation_Cost_Percentage", 
            "Education_Cost_Percentage", 
            "Healthcare_Cost_Percentage"
        ];
        const avgCategories = categories.map(cat => {
            const vals = filtered.map(d => parseFloat(d[cat]) || 0);
            return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
        });

        pieChartInstance = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ["Housing", "Transportation", "Education", "Healthcare"],
                datasets: [{
                    data: avgCategories,
                    backgroundColor: ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0"],
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                                const val = ctx.raw.toFixed(2);
                                const percent = ((ctx.raw/total)*100).toFixed(1);
                                return `${ctx.label}: ${val} (${percent}%)`;
                            }
                        }
                    },
                    title: { 
                        display: true, 
                        text: 'Average Cost Distribution (%)',
                        font: { size: 20 }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 15 } }
                    }
                }
            }
        });
    }

    // Initial load
    updateCharts("all");

    // Dropdown listener
    regionFilter.addEventListener("change", e => updateCharts(e.target.value));
}

/* ==================== WORLD MAP ==================== */
function renderWorldMap(data){
    const countries = data.map(d => d.Country);
    const cost = data.map(d => parseFloat(d.Cost_of_Living)||0);

    const mapData = [{
        type: 'choropleth',
        locationmode: 'country names',
        locations: countries,
        z: cost,
        colorscale: 'Blues',
        colorbar: { title: 'Cost of Living' }
    }];

    const layout = {
        title: { text: 'World Cost of Living', font: { size: 24 } },
        autosize: true,
        margin: {l:0,r:0,t:50,b:0},
        geo: { projection: { type: 'natural earth' }, showcoastlines: true, showcountries: true },
        height: 400
    };

    Plotly.newPlot('worldMap', mapData, layout);
    window.addEventListener('resize', () => Plotly.Plots.resize('worldMap'));
}

/* ==================== TABLE PAGE ==================== */
let originalData = [];
let currentSort = { column: null, asc: true }; // Keep track of sort state

Papa.parse("spending.csv", {
  download: true,
  header: true,
  complete: function(results) {
    originalData = results.data.filter(d => d.Country); 
    renderTable(originalData);
  }
});

function renderTable(data){
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";

  data.forEach(d=>{
    const row = `<tr>
      <td>${d.Country}</td>
      <td>${d.Year}</td>
      <td>${d.Average_Monthly_Income}</td>
      <td>${d.Cost_of_Living}</td>
      <td>${d.Region}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

function applyFilters(){
  const country = document.getElementById('countryFilter').value;
  const year = document.getElementById('yearFilter').value;
  const income = document.getElementById('incomeFilter').value;
  const cost = document.getElementById('costFilter').value;
  const region = document.getElementById('regionFilter').value;

  let filtered = originalData.filter(d=>{
    const incomeVal = parseFloat(d.Average_Monthly_Income) || 0;
    const costVal = parseFloat(d.Cost_of_Living) || 0;

    return (country === 'all' || d.Country === country)
        && (year === 'all' || inYearRange(d.Year, year))
        && (income === 'all' || inRange(incomeVal, income))
        && (cost === 'all' || inRange(costVal, cost))
        && (region === 'all' || d.Region === region);
  });

  // Apply sorting
  if(currentSort.column){
    filtered.sort((a,b)=>{
      const col = currentSort.column;
      let valA = isNaN(a[col]) ? a[col] : parseFloat(a[col]);
      let valB = isNaN(b[col]) ? b[col] : parseFloat(b[col]);

      if(valA < valB) return currentSort.asc ? -1 : 1;
      if(valA > valB) return currentSort.asc ? 1 : -1;
      return 0;
    });
  }

  renderTable(filtered);
}

function inRange(value, range){
  if(range === '0-1999') return value <= 1999;
  if(range === '2000-3999') return value >= 2000 && value <= 3999;
  if(range === '4000-5999') return value >= 4000 && value <= 5999;
  if(range === '6000-7999') return value >= 6000 && value <= 7999;
  if(range === '8000+') return value >= 8000;
  return true;
}

function inYearRange(year, range){
  year = parseInt(year);
  if(range === '2000-2005') return year>=2000 && year<=2005;
  if(range === '2006-2010') return year>=2006 && year<=2010;
  if(range === '2011-2015') return year>=2011 && year<=2015;
  if(range === '2016-2020') return year>=2016 && year<=2020;
  if(range === '2021-current') return year>=2021;
  return true;
}

// Event listeners for filters
['countryFilter','yearFilter','incomeFilter','costFilter','regionFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('change', applyFilters);
});

// Event listeners for sorting
document.querySelectorAll('#dataTable thead tr:first-child th').forEach(th=>{
  th.addEventListener('click', ()=>{
    const column = th.dataset.column;
    if(currentSort.column === column){
      currentSort.asc = !currentSort.asc; // toggle
    } else {
      currentSort.column = column;
      currentSort.asc = true;
    }

    // Remove old sort styles
    document.querySelectorAll('#dataTable thead tr:first-child th').forEach(h=>h.classList.remove('sorted-asc','sorted-desc'));

    // Add new sort style
    th.classList.add(currentSort.asc ? 'sorted-asc' : 'sorted-desc');

    applyFilters();
  });
});

/* ==================== RESIZE FIX ==================== */
window.addEventListener('resize', function() {
    if (barChartInstance) barChartInstance.resize();
    if (lineChartInstance) lineChartInstance.resize();
    if (pieChartInstance) pieChartInstance.resize();
});
