const express = require('express');
const cors = require('cors');
const path = require('path');
const ee = require('@google/earthengine');
const fs = require('fs');

// Try to load service account credentials
let serviceAccount;
try {
  serviceAccount = require('./bluecarbon-472509-323c9f30a13f.json');
} catch (error) {
  console.error('Service account credentials file not found. Please create the credentials file from the template.');
  console.error('Copy bluecarbon-credentials-template.json to bluecarbon-472509-323c9f30a13f.json and fill in your credentials.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Earth Engine
ee.data.authenticateViaPrivateKey(serviceAccount, () => {
  console.log('Earth Engine authenticated successfully');
  ee.initialize(null, null, () => {
    console.log('Earth Engine initialized successfully');
  }, (error) => {
    console.error('Earth Engine initialization failed:', error);
  });
}, (error) => {
  console.error('Earth Engine authentication failed:', error);
});

// Function to generate map tiles for satellite imagery and mangrove data (similar to gee2.js)
function generateMapTiles(latitude, longitude, bufferSize) {
  bufferSize = bufferSize || 500;
  
  var point = ee.Geometry.Point([longitude, latitude]);
  var aoi = ee.FeatureCollection(ee.Feature(point.buffer(bufferSize)));
  
  // Load Sentinel-2 for satellite imagery
  function maskS2clouds(image) {
    var qa = image.select('QA60');
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                 .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask).divide(10000);
  }
  
  var s2Collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(aoi)
    .filterDate('2023-01-01', '2023-12-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .map(maskS2clouds);
  
  var satelliteComposite = s2Collection.median().clip(aoi);
  
  // Load Global Mangrove Watch dataset (same as gee2.js)
  var GMW = ee.Image("projects/coastallcluc/Project0_Others/GMW_V3/GMW_V3_Global");
  
  var gmwYear = 2025;
  var gmwSelected = (function(img, year){
    if (!year) {
      var bn = img.bandNames();
      var out = ee.Algorithms.If(bn.contains('b1'), img.select(['b1']), img.select([bn.get(0)]));
      return ee.Image(out).rename('b1');
    }
    var y = String(year);
    var bn = img.bandNames();
    var out = ee.Algorithms.If(
      bn.contains(y),
      img.select([y]),
      ee.Algorithms.If(
        bn.contains('b' + y),
        img.select(['b' + y]),
        ee.Algorithms.If(
          bn.contains('b1'),
          img.select(['b1']),
          img.select([bn.get(0)])
        )
      )
    );
    return ee.Image(out).rename('b1');
  })(GMW, gmwYear);
  
  var gmwMask = gmwSelected.selfMask().clip(aoi);
  
  // Generate map IDs for tiles
  var satelliteMapId = satelliteComposite.visualize({
    bands: ['B4', 'B3', 'B2'],
    min: 0,
    max: 0.3
  }).getMapId();
  
  var mangroveMapId = gmwMask.visualize({
    min: 1,
    max: 1,
    palette: ['yellow']
  }).getMapId();
  
  // AOI outline
  var aoiOutline = ee.FeatureCollection(aoi).style({
    color: '000000',
    width: 2,
    fillColor: '00000000'
  });
  
  var aoiMapId = aoiOutline.getMapId();
  
  return {
    satellite: satelliteMapId,
    mangrove: mangroveMapId,
    aoi: aoiMapId,
    bounds: aoi.geometry().bounds()
  };
}

// Your COMPLETE biomass.js analysis function
function analyzeVegetation(latitude, longitude, bufferSize) {
  bufferSize = bufferSize || 500;
  
  var point = ee.Geometry.Point([longitude, latitude]);
  var aoi = point.buffer(bufferSize);
  
  function maskS2clouds(image) {
    var qa = image.select('QA60');
    var cloudBitMask = 1 << 10;
    var cirrusBitMask = 1 << 11;
    var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
                 .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
    return image.updateMask(mask).divide(10000);
  }
  
  var s2Collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(aoi)
    .filterDate('2023-01-01', '2023-12-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .map(maskS2clouds);
  
  var composite = s2Collection.median().clip(aoi);
  
  // Calculate ALL indices from your biomass.js
  var ndvi = composite.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var evi = composite.expression(
    '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': composite.select('B8'),
      'RED': composite.select('B4'),
      'BLUE': composite.select('B2')
    }).rename('EVI');
  
  var savi = composite.expression(
    '((NIR - RED) / (NIR + RED + 0.5)) * (1 + 0.5)', {
      'NIR': composite.select('B8'),
      'RED': composite.select('B4')
    }).rename('SAVI');
  
  var ndwi = composite.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var mndwi = composite.normalizedDifference(['B3', 'B11']).rename('MNDWI');
  var aweish = composite.expression(
    'BLUE + 2.5 * GREEN - 1.5 * (NIR + SWIR1) - 0.25 * SWIR2', {
      'BLUE': composite.select('B2'),
      'GREEN': composite.select('B3'),
      'NIR': composite.select('B8'),
      'SWIR1': composite.select('B11'),
      'SWIR2': composite.select('B12')
    }).rename('AWEIsh');
  
  var ndbi = composite.normalizedDifference(['B11', 'B8']).rename('NDBI');
  var ui = composite.expression(
    '(SWIR2 - NIR) / (SWIR2 + NIR)', {
      'NIR': composite.select('B8'),
      'SWIR2': composite.select('B12')
    }).rename('UI');
  
  var bci = composite.expression(
    '(RED - GREEN) / (RED + GREEN)', {
      'RED': composite.select('B4'),
      'GREEN': composite.select('B3')
    }).rename('BCI');

  // Water and building pixel counts like your biomass.js
  var waterMask1 = ndwi.gt(0.0);
  var waterMask2 = mndwi.gt(0.0);
  var builtUpMask1 = ndbi.gt(0.1);
  var builtUpMask2 = ui.gt(0.0);
  
  var totalPixels = ee.Image.constant(1).reduceRegion({
    reducer: ee.Reducer.count(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });
  
  var waterPixelCount1 = waterMask1.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });
  
  var waterPixelCount2 = waterMask2.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });
  
  var builtUpPixelCount1 = builtUpMask1.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });
  
  var builtUpPixelCount2 = builtUpMask2.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });

  // Get ALL statistics with percentiles
  var allIndices = ee.Image.cat([ndvi, evi, savi, ndwi, mndwi, aweish, ndbi, ui, bci]);
  var stats = allIndices.reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.percentile([10, 50, 90]), '', true),
    geometry: aoi,
    scale: 10,
    maxPixels: 1e9
  });

  return {
    stats: stats,
    waterPixelCount1: waterPixelCount1,
    waterPixelCount2: waterPixelCount2,
    builtUpPixelCount1: builtUpPixelCount1,
    builtUpPixelCount2: builtUpPixelCount2,
    totalPixels: totalPixels
  };
}

// Your COMPLETE classification function from biomass.js
function classifyLandCover(ndviValue, eviValue, saviValue, ndwiMean, mndwiMean, aweishValue, ndwiP90, mndwiP90, waterPercentage1, waterPercentage2, ndbiValue, uiValue, bciValue, builtUpPercentage1, builtUpPercentage2) {
  var description = "";
  var confidence = "Low";
  var biomassLevel = "Minimal";
  var landCoverType = "Unknown";
  var waterPresence = false;
  var buildingPresence = false;
  var mixedLandCover = false;
  
  // Enhanced water detection with multiple criteria
  var waterIndicators = 0;
  
  if (ndwiMean > 0.0) waterIndicators++;
  if (mndwiMean > 0.0) waterIndicators++;
  if (aweishValue > 0.0) waterIndicators++;
  if (ndwiP90 > 0.2) waterIndicators++;
  if (mndwiP90 > 0.2) waterIndicators++;
  if (waterPercentage1 > 10) waterIndicators++;
  if (waterPercentage2 > 10) waterIndicators++;
  
  // Building detection indicators
  var buildingIndicators = 0;
  
  if (ndbiValue > 0.1) buildingIndicators++;
  if (ndbiValue > 0.2) buildingIndicators++;
  if (uiValue > 0.0) buildingIndicators++;
  if (uiValue > 0.1) buildingIndicators++;
  if (bciValue > 0.0) buildingIndicators++;
  if (ndviValue < 0.2 && ndbiValue > 0.0) buildingIndicators++;
  if (builtUpPercentage1 > 20) buildingIndicators++;
  if (builtUpPercentage2 > 15) buildingIndicators++;
  
  // Building presence detection
  if (buildingIndicators >= 3 || ndbiValue > 0.2 || (ndbiValue > 0.1 && ndviValue < 0.2)) {
    buildingPresence = true;
  }
  
  // Mixed land cover detection
  if (waterPercentage1 > 5 || waterPercentage2 > 5 || builtUpPercentage1 > 10 || builtUpPercentage2 > 10) {
    mixedLandCover = true;
  }
  
  // EXACT classification logic from your biomass.js
  if (buildingIndicators >= 4 || ndbiValue > 0.3) {
    landCoverType = "Built-up Area";
    buildingPresence = true;
    
    if (ndviValue > 0.3) {
      biomassLevel = "Moderate";
      description = "Built-up area with significant vegetation - urban forest, parks, or green buildings";
      confidence = "High";
    } else if (ndviValue > 0.2) {
      biomassLevel = "Low";
      description = "Built-up area with moderate greenery - residential area with gardens or urban green spaces";
      confidence = "High";
    } else if (ndviValue > 0.1) {
      biomassLevel = "Very Low";
      description = "Dense built-up area with minimal vegetation - commercial/industrial area with limited greenery";
      confidence = "Very High";
    } else {
      biomassLevel = "None";
      description = "Dense built-up area - concrete/asphalt dominated urban core with no visible vegetation";
      confidence = "Very High";
    }
  }
  else if (buildingPresence && ndviValue > 0.2) {
    landCoverType = "Mixed (Built-up + Vegetation)";
    
    if (ndviValue >= 0.4) {
      description = "Suburban area with significant vegetation - residential area with gardens, trees, and green spaces";
      biomassLevel = "Moderate";
      confidence = "High";
    } else {
      description = "Urban area with scattered vegetation - mixed residential/commercial with some greenery";
      biomassLevel = "Low";
      confidence = "Medium";
    }
  }
  else if (waterIndicators >= 3 || ndwiMean > 0.1 || mndwiMean > 0.1) {
    landCoverType = "Water Body";
    waterPresence = true;
    
    if (buildingPresence) {
      description = "Urban water body - " + (ndviValue > 0.2 ? "park pond/lake with vegetation" : "urban lake/river with minimal vegetation");
      biomassLevel = ndviValue > 0.2 ? "Low" : "Very Low";
    } else {
      if (ndviValue > 0.3) {
        biomassLevel = "Moderate";
        description = "Water body with significant aquatic or riparian vegetation - likely wetland, mangrove, or vegetated riverbank";
        confidence = "Very High";
      } else if (ndviValue > 0.2) {
        biomassLevel = "Low";
        description = "Water body with sparse vegetation - possibly river with vegetation along banks or shallow wetland";
        confidence = "High";
      } else if (ndviValue > 0.1) {
        biomassLevel = "Very Low";
        description = "Water body with minimal vegetation - likely open water with some algae or emergent plants";
        confidence = "High";
      } else {
        biomassLevel = "None";
        description = "Clear open water body - likely deep lake, river, or reservoir with no visible vegetation";
        confidence = "Very High";
      }
    }
  } else if (ndviValue > 0.1) {
    landCoverType = "Vegetation";
    if (ndviValue >= 0.7) {
      description = "Very dense vegetation - tropical forest or very healthy crops";
      biomassLevel = "Very High";
      confidence = "Very High";
    } else if (ndviValue >= 0.5) {
      description = "Dense vegetation - forest, dense crops, or lush grassland";
      biomassLevel = "High";
      confidence = "High";
    } else if (ndviValue >= 0.3) {
      description = "Moderate vegetation - healthy grassland or crop fields";
      biomassLevel = "Moderate";
      confidence = "Medium";
    } else if (ndviValue >= 0.2) {
      description = "Low vegetation density - grassland or sparse shrubs";
      biomassLevel = "Low";
    } else {
      description = "Sparse vegetation - very limited plant cover";
      biomassLevel = "Very Low";
    }
  } else {
    landCoverType = "Non-vegetated";
    description = "No vegetation detected - likely bare soil, rock, or cleared land";
    biomassLevel = "None";
  }
  
  return {
    description: description,
    biomassLevel: biomassLevel,
    landCoverType: landCoverType,
    waterPresence: waterPresence,
    buildingPresence: buildingPresence,
    mixedLandCover: mixedLandCover,
    confidence: confidence,
    waterIndicators: waterIndicators,
    buildingIndicators: buildingIndicators,
    waterPercentage: Math.max(waterPercentage1, waterPercentage2).toFixed(1),
    builtUpPercentage: Math.max(builtUpPercentage1, builtUpPercentage2).toFixed(1),
    indices: {
      ndvi: ndviValue.toFixed(3),
      evi: eviValue.toFixed(3),
      savi: saviValue.toFixed(3),
      ndwi: ndwiMean.toFixed(3),
      mndwi: mndwiMean.toFixed(3),
      aweish: aweishValue.toFixed(3),
      ndbi: ndbiValue.toFixed(3),
      ui: uiValue.toFixed(3),
      bci: bciValue.toFixed(3)
    }
  };
}

// GMW Analysis function from your gee2.js
function analyzeGMW(latitude, longitude, bufferSize) {
  bufferSize = bufferSize || 500;
  
  var point = ee.Geometry.Point([longitude, latitude]);
  var aoi = ee.FeatureCollection(ee.Feature(point.buffer(bufferSize)));
  
  // Load Global Mangrove Watch dataset
  var GMW = ee.Image("projects/coastallcluc/Project0_Others/GMW_V3/GMW_V3_Global");
  
  // Select 2025 band or latest available
  var gmwYear = 2025;
  var gmwSelected = (function(img, year){
    if (!year) {
      var bn = img.bandNames();
      var out = ee.Algorithms.If(bn.contains('b1'), img.select(['b1']), img.select([bn.get(0)]));
      return ee.Image(out).rename('b1');
    }
    var y = String(year);
    var bn = img.bandNames();
    var out = ee.Algorithms.If(
      bn.contains(y),
      img.select([y]),
      ee.Algorithms.If(
        bn.contains('b' + y),
        img.select(['b' + y]),
        ee.Algorithms.If(
          bn.contains('b1'),
          img.select(['b1']),
          img.select([bn.get(0)])
        )
      )
    );
    return ee.Image(out).rename('b1');
  })(GMW, gmwYear);
  
  var gmwMask = gmwSelected.selfMask().clip(aoi);
  
  // Compute mangrove area within AOI
  var gmwArea_m2 = gmwMask.multiply(ee.Image.pixelArea())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: aoi,
      scale: 30,
      maxPixels: 1e13,
      tileScale: 4
    });
  
  return {
    gmwArea_m2: gmwArea_m2,
    gmwMask: gmwMask,
    aoi: aoi,
    year: gmwYear
  };
}

// API endpoint for map tiles
app.post('/map-tiles', async (req, res) => {
  try {
    const { lat, lon } = req.body;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    console.log(`Generating map tiles for location: ${lat}, ${lon}`);
    
    // Generate map tiles
    const mapTiles = generateMapTiles(lat, lon, 500);
    
    // Evaluate the bounds to get viewport
    mapTiles.bounds.evaluate((boundsData, boundsError) => {
      if (boundsError) {
        console.error('Bounds evaluation error:', boundsError);
        return res.status(500).json({ error: 'Map tile generation failed', details: boundsError.message });
      }
      
      const response = {
        location: { lat, lon },
        tiles: {
          satellite: {
            mapid: mapTiles.satellite.mapid,
            token: mapTiles.satellite.token,
            urlTemplate: `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${mapTiles.satellite.mapid}/tiles/{z}/{x}/{y}?token=${mapTiles.satellite.token}`
          },
          mangrove: {
            mapid: mapTiles.mangrove.mapid,
            token: mapTiles.mangrove.token,
            urlTemplate: `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${mapTiles.mangrove.mapid}/tiles/{z}/{x}/{y}?token=${mapTiles.mangrove.token}`
          },
          aoi: {
            mapid: mapTiles.aoi.mapid,
            token: mapTiles.aoi.token,
            urlTemplate: `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${mapTiles.aoi.mapid}/tiles/{z}/{x}/{y}?token=${mapTiles.aoi.token}`
          }
        },
        bounds: boundsData,
        timestamp: new Date().toISOString()
      };
      
      console.log('Map tiles generated successfully');
      res.json(response);
    });
    
  } catch (error) {
    console.error('Map tiles generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for analysis
app.post('/analyze', async (req, res) => {
  try {
    const { lat, lon } = req.body;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }
    
    console.log(`Analyzing location: ${lat}, ${lon}`);
    
    // Call your COMPLETE biomass analysis function
    const analysis = analyzeVegetation(lat, lon, 500);
    
    // Call GMW analysis
    const gmwAnalysis = analyzeGMW(lat, lon, 500);
    
    // Evaluate ALL results like your biomass.js does
    analysis.stats.evaluate((statsData, statsError) => {
      if (statsError) {
        console.error('Stats evaluation error:', statsError);
        return res.status(500).json({ error: 'Analysis failed', details: statsError.message });
      }
      
      // Evaluate GMW results
      gmwAnalysis.gmwArea_m2.evaluate((gmwAreaData, gmwError) => {
        
        analysis.waterPixelCount1.evaluate((waterCount1, waterError1) => {
          analysis.waterPixelCount2.evaluate((waterCount2, waterError2) => {
            analysis.builtUpPixelCount1.evaluate((builtCount1, builtError1) => {
              analysis.builtUpPixelCount2.evaluate((builtCount2, builtError2) => {
                analysis.totalPixels.evaluate((totalPix, totalError) => {
                  
                  // Extract ALL values like your biomass.js
                  const ndviVal = statsData.NDVI_mean || 0;
                  const eviVal = statsData.EVI_mean || 0;
                  const saviVal = statsData.SAVI_mean || 0;
                  const ndwiMean = statsData.NDWI_mean || 0;
                  const mndwiMean = statsData.MNDWI_mean || 0;
                  const aweishVal = statsData.AWEIsh_mean || 0;
                  const ndbiVal = statsData.NDBI_mean || 0;
                  const uiVal = statsData.UI_mean || 0;
                  const bciVal = statsData.BCI_mean || 0;
                  const ndwiP90 = statsData.NDWI_p90 || 0;
                  const mndwiP90 = statsData.MNDWI_p90 || 0;
                  
                  const totalPixelCount = totalPix.constant || 1;
                  const waterPct1 = ((waterCount1.NDWI || 0) / totalPixelCount) * 100;
                  const waterPct2 = ((waterCount2.MNDWI || 0) / totalPixelCount) * 100;
                  const builtPct1 = ((builtCount1.NDBI || 0) / totalPixelCount) * 100;
                  const builtPct2 = ((builtCount2.UI || 0) / totalPixelCount) * 100;
                  
                  // GMW area calculations
                  const gmwArea_m2 = gmwAreaData.b1 || 0;
                  const gmwArea_km2 = gmwArea_m2 / 1e6;
                  const gmwArea_ha = gmwArea_m2 / 10000;
                  const gmwCoverage = (gmwArea_m2 / (Math.PI * 500 * 500)) * 100; // % of analysis area
                  
                  // Use your COMPLETE classification function
                  const classification = classifyLandCover(ndviVal, eviVal, saviVal, ndwiMean, mndwiMean, aweishVal, ndwiP90, mndwiP90, waterPct1, waterPct2, ndbiVal, uiVal, bciVal, builtPct1, builtPct2);
                  
                  // Return SAME format as your GEE analysis PLUS GMW data
                  const response = {
                    location: { lat, lon },
                    analysis: {
                      landCoverType: classification.landCoverType,
                      description: classification.description,
                      biomassLevel: classification.biomassLevel,
                      confidence: classification.confidence,
                      waterPresence: classification.waterPresence,
                      buildingPresence: classification.buildingPresence,
                      mixedLandCover: classification.mixedLandCover,
                      waterIndicators: classification.waterIndicators,
                      buildingIndicators: classification.buildingIndicators,
                      waterPercentage: classification.waterPercentage,
                      builtUpPercentage: classification.builtUpPercentage,
                      indices: classification.indices
                    },
                    gmw: {
                      mangroveArea_m2: gmwArea_m2.toFixed(2),
                      mangroveArea_km2: gmwArea_km2.toFixed(6),
                      mangroveArea_ha: gmwArea_ha.toFixed(4),
                      mangroveCoverage: gmwCoverage.toFixed(2),
                      year: gmwAnalysis.year,
                      analysisRadius: '500m',
                      mangrovePresent: gmwArea_m2 > 0
                    },
                    timestamp: new Date().toISOString()
                  };
                  
                  console.log('Analysis completed:', classification.description);
                  console.log('GMW Mangrove area:', gmwArea_ha.toFixed(4), 'hectares');
                  res.json(response);
                });
              });
            });
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
