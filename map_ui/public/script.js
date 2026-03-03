// DOM elements
const loadingEl = document.getElementById('loading');
const resultsEl = document.getElementById('results');
const gmwResultsEl = document.getElementById('gmw-results');
const errorEl = document.getElementById('error');
const analyzeBtn = document.getElementById('analyzeBtn');

// Listen for messages from parent window (for iframe integration)
window.addEventListener('message', function(event) {
    // Security check - only accept messages from trusted origins
    if (event.origin === 'http://localhost:3001' || event.origin === 'http://localhost:3000' || 
        event.data.type === 'SET_COORDINATES') {
        
        if (event.data.type === 'SET_COORDINATES' && event.data.lat && event.data.lon) {
            const lat = parseFloat(event.data.lat);
            const lon = parseFloat(event.data.lon);
            
            if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                // Set coordinates in the form
                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lon;
                
                // Initialize map if not done already
                if (!mapInitialized) {
                    initializeMap();
                }
                
                // Center map on coordinates and add marker
                map.setView([lat, lon], 15);
                
                if (currentMarker) {
                    map.removeLayer(currentMarker);
                }
                
                currentMarker = L.marker([lat, lon])
                    .addTo(map)
                    .bindPopup(`
                        <div class="popup-content">
                            <h4>Project Location</h4>
                            <p>${lat}°N, ${lon}°E</p>
                            <button class="popup-analyze-btn" onclick="analyzeLocation()">Analyze Location</button>
                        </div>
                    `)
                    .openPopup();
                
                console.log('Coordinates auto-populated:', lat, lon);
            }
        }
    }
}, false);

// Map variables
let map;
let currentTiles = {
    satellite: null,
    mangrove: null,
    aoi: null
};
let currentMarker = null;
let mapInitialized = false;

// Initialize map
function initializeMap() {
    if (mapInitialized) return;
    
    map = L.map('map').setView([20.0, 77.0], 6); // Default to India
    
    // Add base map (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Map click handler
    map.on('click', function(e) {
        const lat = e.latlng.lat.toFixed(6);
        const lon = e.latlng.lng.toFixed(6);
        
        // Update form inputs
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lon;
        
        // Add/move marker
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        
        currentMarker = L.marker([lat, lon])
            .addTo(map)
            .bindPopup(`
                <div class="popup-content">
                    <h4>Location: ${lat}°N, ${lon}°E</h4>
                    <p>Click analyze to get satellite analysis for this location</p>
                    <button class="popup-analyze-btn" onclick="analyzeLocation()">Analyze This Location</button>
                </div>
            `);
        
        // Load satellite tiles for this location
        loadMapTiles(lat, lon);
    });
    
    mapInitialized = true;
}

// Load satellite tiles from GEE
async function loadMapTiles(lat, lon) {
    try {
        console.log(`Loading map tiles for: ${lat}, ${lon}`);
        
        const response = await fetch('/map-tiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lat: parseFloat(lat), lon: parseFloat(lon) })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to load map tiles');
        }
        
        console.log('Map tiles loaded successfully:', data);
        
        // Remove existing tile layers
        Object.values(currentTiles).forEach(layer => {
            if (layer) map.removeLayer(layer);
        });
        
        // Add satellite layer
        currentTiles.satellite = L.tileLayer(data.tiles.satellite.urlTemplate, {
            attribution: 'Google Earth Engine | Sentinel-2',
            opacity: 1.0
        });
        
        // Add mangrove layer
        currentTiles.mangrove = L.tileLayer(data.tiles.mangrove.urlTemplate, {
            attribution: 'Global Mangrove Watch',
            opacity: 0.8
        });
        
        // Add AOI layer
        currentTiles.aoi = L.tileLayer(data.tiles.aoi.urlTemplate, {
            attribution: 'Analysis Area',
            opacity: 0.6
        });
        
        // Show satellite layer by default
        if (currentTiles.satellite) {
            map.addLayer(currentTiles.satellite);
        }
        
        // Fit map to bounds if available
        if (data.bounds && data.bounds.coordinates) {
            try {
                const bounds = data.bounds.coordinates[0];
                const latLngs = bounds.map(coord => [coord[1], coord[0]]); // [lat, lng]
                map.fitBounds(latLngs, { padding: [20, 20] });
            } catch (e) {
                console.warn('Could not fit bounds:', e);
                map.setView([lat, lon], 16);
            }
        } else {
            map.setView([lat, lon], 16);
        }
        
    } catch (error) {
        console.error('Map tiles loading error:', error);
        
        // Show error message
        alert(`Failed to load satellite imagery: ${error.message}`);
    }
}

// Auto-refresh map tiles every 30 seconds for real-time updates
let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    autoRefreshInterval = setInterval(() => {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lon = parseFloat(document.getElementById('longitude').value);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            console.log('Auto-refreshing map tiles...');
            loadMapTiles(lat, lon);
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Hide all result sections initially
function hideAllSections() {
    loadingEl.classList.add('hidden');
    resultsEl.classList.add('hidden');
    gmwResultsEl.classList.add('hidden');
    errorEl.classList.add('hidden');
}

// Show error message
function showError(message) {
    hideAllSections();
    document.getElementById('error-message').textContent = message;
    errorEl.classList.remove('hidden');
}

// Show loading state
function showLoading() {
    hideAllSections();
    loadingEl.classList.remove('hidden');
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
}

// Hide loading state
function hideLoading() {
    loadingEl.classList.add('hidden');
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Location';
}

// Format number for display
function formatNumber(value, decimals = 3) {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(decimals);
}

// Update results display with ALL biomass.js data
function updateResults(data) {
    const analysis = data.analysis;
    const location = data.location;
    const gmw = data.gmw;
    
    // Location info
    document.getElementById('location-coords').textContent = `${location.lat}°N, ${location.lon}°E`;
    
    // Spectral indices
    document.getElementById('ndvi-value').textContent = analysis.indices.ndvi;
    document.getElementById('evi-value').textContent = analysis.indices.evi;
    document.getElementById('savi-value').textContent = analysis.indices.savi;
    document.getElementById('ndwi-value').textContent = analysis.indices.ndwi;
    document.getElementById('mndwi-value').textContent = analysis.indices.mndwi;
    document.getElementById('aweish-value').textContent = analysis.indices.aweish;
    document.getElementById('ndbi-value').textContent = analysis.indices.ndbi;
    document.getElementById('ui-value').textContent = analysis.indices.ui;
    document.getElementById('bci-value').textContent = analysis.indices.bci;
    
    // Detection metrics
    document.getElementById('water-indicators').textContent = `${analysis.waterIndicators}/7`;
    document.getElementById('building-indicators').textContent = `${analysis.buildingIndicators}/8`;
    document.getElementById('water-percentage').textContent = `${analysis.waterPercentage}%`;
    document.getElementById('built-percentage').textContent = `${analysis.builtUpPercentage}%`;
    
    // Land cover assessment
    document.getElementById('land-cover-type').textContent = analysis.landCoverType;
    document.getElementById('water-present').textContent = analysis.waterPresence ? 'YES' : 'NO';
    document.getElementById('buildings-present').textContent = analysis.buildingPresence ? 'YES' : 'NO';
    document.getElementById('mixed-land-cover').textContent = analysis.mixedLandCover ? 'YES' : 'NO';
    
    // Description and final assessment
    document.getElementById('description').textContent = analysis.description;
    document.getElementById('biomass-level').textContent = analysis.biomassLevel;
    document.getElementById('confidence').textContent = analysis.confidence;
    
    // Apply color coding based on values
    applyColorCoding(analysis);
    
    resultsEl.classList.remove('hidden');
    
    // Update GMW results
    updateGMWResults(gmw, location);
}

// Update GMW results display
function updateGMWResults(gmw, location) {
    // Basic info
    document.getElementById('gmw-year').textContent = gmw.year;
    
    // Area calculations
    document.getElementById('gmw-area-ha').textContent = gmw.mangroveArea_ha + ' ha';
    document.getElementById('gmw-area-m2').textContent = parseFloat(gmw.mangroveArea_m2).toLocaleString() + ' m²';
    document.getElementById('gmw-area-km2').textContent = gmw.mangroveArea_km2 + ' km²';
    document.getElementById('gmw-coverage').textContent = gmw.mangroveCoverage + '%';
    
    // Status
    document.getElementById('mangrove-present').textContent = gmw.mangrovePresent ? 'YES' : 'NO';
    document.getElementById('analysis-radius').textContent = gmw.analysisRadius;
    
    // Assessment description
    const assessment = generateMangroveAssessment(gmw);
    document.getElementById('gmw-assessment').textContent = assessment;
    
    // Apply color coding
    applyGMWColorCoding(gmw);
    
    gmwResultsEl.classList.remove('hidden');
}

// Generate mangrove assessment text
function generateMangroveAssessment(gmw) {
    const area_ha = parseFloat(gmw.mangroveArea_ha);
    const coverage = parseFloat(gmw.mangroveCoverage);
    
    if (!gmw.mangrovePresent || area_ha === 0) {
        return "No mangroves detected in the analysis area. This location does not contain mangrove ecosystems according to Global Mangrove Watch data.";
    } else if (area_ha < 0.1) {
        return `Very small mangrove area detected (${gmw.mangroveArea_ha} hectares). This represents sparse mangrove coverage in the analysis area.`;
    } else if (area_ha < 1) {
        return `Small mangrove area detected (${gmw.mangroveArea_ha} hectares, ${gmw.mangroveCoverage}% coverage). This indicates limited mangrove presence in the area.`;
    } else if (area_ha < 10) {
        return `Moderate mangrove area detected (${gmw.mangroveArea_ha} hectares, ${gmw.mangroveCoverage}% coverage). This represents a significant mangrove ecosystem in the analysis area.`;
    } else {
        return `Large mangrove area detected (${gmw.mangroveArea_ha} hectares, ${gmw.mangroveCoverage}% coverage). This indicates extensive mangrove coverage - a substantial blue carbon ecosystem.`;
    }
}

// Apply color coding to GMW values
function applyGMWColorCoding(gmw) {
    // Color code mangrove presence
    const mangroveEl = document.getElementById('mangrove-present');
    mangroveEl.className = `status-value ${gmw.mangrovePresent ? 'yes' : 'no'}`;
    
    // Color code area based on coverage
    const coverageEl = document.getElementById('gmw-coverage');
    const coverage = parseFloat(gmw.mangroveCoverage);
    let coverageClass = 'none';
    if (coverage > 50) coverageClass = 'very-high';
    else if (coverage > 25) coverageClass = 'high';
    else if (coverage > 10) coverageClass = 'moderate';
    else if (coverage > 1) coverageClass = 'low';
    else if (coverage > 0) coverageClass = 'very-low';
    
    coverageEl.className = `gmw-value ${coverageClass}`;
}

// Apply color coding to values
function applyColorCoding(analysis) {
    // Color code water presence
    const waterEl = document.getElementById('water-present');
    waterEl.className = `assessment-value ${analysis.waterPresence ? 'yes' : 'no'}`;
    
    // Color code building presence
    const buildingEl = document.getElementById('buildings-present');
    buildingEl.className = `assessment-value ${analysis.buildingPresence ? 'yes' : 'no'}`;
    
    // Color code biomass level
    const biomassEl = document.getElementById('biomass-level');
    const biomassClass = getBiomassClass(analysis.biomassLevel);
    biomassEl.className = `value ${biomassClass}`;
    
    // Color code confidence
    const confidenceEl = document.getElementById('confidence');
    const confidenceClass = getConfidenceClass(analysis.confidence);
    confidenceEl.className = `value ${confidenceClass}`;
}

// Get CSS class for biomass level
function getBiomassClass(level) {
    switch(level) {
        case 'Very High': return 'very-high';
        case 'High': return 'high';
        case 'Moderate': return 'moderate';
        case 'Low': return 'low';
        case 'Very Low': return 'very-low';
        case 'None': return 'none';
        default: return 'minimal';
    }
}

// Get CSS class for confidence level
function getConfidenceClass(confidence) {
    switch(confidence) {
        case 'Very High': return 'very-high';
        case 'High': return 'high';
        case 'Medium': return 'medium';
        case 'Low': return 'low';
        default: return 'low';
    }
}

// Main analysis function
async function analyzeLocation() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lon = parseFloat(document.getElementById('longitude').value);
    
    // Validate inputs
    if (isNaN(lat) || isNaN(lon)) {
        showError('Please enter valid latitude and longitude values');
        return;
    }
    
    if (lat < -90 || lat > 90) {
        showError('Latitude must be between -90 and 90');
        return;
    }
    
    if (lon < -180 || lon > 180) {
        showError('Longitude must be between -180 and 180');
        return;
    }
    
    showLoading();
    
    try {
        // Fetch analysis data
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lat, lon })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }
        
        hideLoading();
        updateResults(data);
        
    } catch (error) {
        console.error('Analysis error:', error);
        hideLoading();
        showError(`Analysis failed: ${error.message}`);
    }
}

// Get user's current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by this browser');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            document.getElementById('latitude').value = lat.toFixed(6);
            document.getElementById('longitude').value = lon.toFixed(6);
        },
        (error) => {
            showError(`Location error: ${error.message}`);
        }
    );
}

// Allow Enter key to trigger analysis
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeLocation();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    hideAllSections();
    
    // Initialize map
    initializeMap();
    
    // Start auto-refresh for real-time updates
    startAutoRefresh();
    
    // Add input change listeners to update map when coordinates change
    document.getElementById('latitude').addEventListener('change', () => {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lon = parseFloat(document.getElementById('longitude').value);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            // Update map view and marker
            map.setView([lat, lon], map.getZoom());
            
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            currentMarker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup(`
                    <div class="popup-content">
                        <h4>Location: ${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E</h4>
                        <p>Click analyze to get satellite analysis for this location</p>
                        <button class="popup-analyze-btn" onclick="analyzeLocation()">Analyze This Location</button>
                    </div>
                `);
            
            // Load new tiles
            loadMapTiles(lat, lon);
        }
    });
    
    document.getElementById('longitude').addEventListener('change', () => {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lon = parseFloat(document.getElementById('longitude').value);
        
        if (!isNaN(lat) && !isNaN(lon)) {
            // Update map view and marker
            map.setView([lat, lon], map.getZoom());
            
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            currentMarker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup(`
                    <div class="popup-content">
                        <h4>Location: ${lat.toFixed(6)}°N, ${lon.toFixed(6)}°E</h4>
                        <p>Click analyze to get satellite analysis for this location</p>
                        <button class="popup-analyze-btn" onclick="analyzeLocation()">Analyze This Location</button>
                    </div>
                `);
            
            // Load new tiles
            loadMapTiles(lat, lon);
        }
    });
});

// Clean up auto-refresh when page unloads
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
