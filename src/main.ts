// this file is like the launcher for testing the pocGAPI.
// once this becomes a proper library, it will likely get trashed and gapi.ts will become the primary file
// (we either rename it to main, or do as buildmaster miles commands )

import { GeoApi, DojoWindow, EsriBundle, RampExtentConfig, RampMapConfig } from './gapiTypes';
import GapiLoader from './gapi';
import Map from './map/Map';
import FeatureLayer from './layer/FeatureLayer';
import GeoJsonLayer from './layer/GeoJsonLayer';
import MapImageLayer from './layer/MapImageLayer';

const gapiPromise: Promise<GeoApi> = GapiLoader('https://js.arcgis.com/4.14', window);

gapiPromise.then((gapi: GeoApi) => {
  console.log('GeoAPI Loaded', gapi);

  // const fakeMap = gapi.fakeNewsMaps.makeMap('dirtyDiv');

  const esriMapConfig: RampMapConfig = {
    // basemap: 'topo'

    extent: {
      xmax: -5007771.626060756,
      xmin: -16632697.354854,
      ymax: 10015875.184845109,
      ymin: 5022907.964742964,

      spatialReference: {
        wkid: 102100,
        latestWkid: 3857
      }
    },
    lods: gapi.maps.defaultLODs(gapi.maps.defaultTileSchemas()[1]), // idx 1 = mercator
    basemaps: [{
      id: 'esriImagery',
      tileSchemaId: 'DEFAULT_ESRI_World_AuxMerc_3857',
      layers: [{
        layerType: 'esriTile',
        url: 'http://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer'
      }]
    }],
    initialBasemapId: 'esriImagery'
  };

  const map: Map = gapi.maps.createMap(esriMapConfig, 'dirtyDiv');


  // ------ feature layer test --------

  const rampFeatureLayerConfig = {
    id: 'fancyTest',
    url: 'http://maps-cartes.ec.gc.ca/arcgis/rest/services/EcoGeo/EcoGeo/MapServer/9',
    state: {
      opacity: 0.8
    },
    customRenderer: {} // just to chill things out. real ramp will have all properties defaulted and filled in
  };

  const fancyLayer: FeatureLayer = gapi.layers.createFeatureLayer(rampFeatureLayerConfig);

  fancyLayer.stateChanged.listen((mahState: string) => { console.log('RESPECT MAH FEATURE STATE: ' + mahState); });

  map.addLayer(fancyLayer);

  fancyLayer.isLayerLoaded().then(() => {
    // test fun times
    console.log('saw layer load, attempt attrib load');
    const attProm = fancyLayer.getAttributes();
    attProm.then((attResult: any) => {
      console.log('check out mah attributes', attResult);
    });

    const tableAttProm = fancyLayer.getTabularAttributes();
    tableAttProm.then((tattResult: any) => {
      console.log('check out mah tabley attributes', tattResult);
    });

    console.log('check mah feature count', fancyLayer.getFeatureCount());

  });

  // ------ geojson layer test --------

  const rampHappyLayerConfig = {
    id: 'happyTest',
    state: {
      opacity: 0.8
    },
    customRenderer: {} // just to chill things out. real ramp will have all properties defaulted and filled in
  };
  const happy: string = '{"type": "FeatureCollection","features": [{"type": "Feature","properties": {"name": "Right Eye"},"geometry": {"type": "Polygon","coordinates": [[[-90.3515625,53.73571574532637],[-92.13134765625,53.199451902831555],[-91.29638671875,51.93071827931289],[-88.9453125,51.83577752045248],[-87.71484375,52.96187505907603],[-88.59374999999999,53.68369534495075],[-90.3515625,53.73571574532637]]]}},{"type": "Feature","properties": {"name": "Left Eye"},"geometry": {"type": "Polygon","coordinates": [[[-84.57275390625,53.44880683542759],[-86.0009765625,53.04121304075649],[-85.4296875,51.80861475198521],[-83.408203125,51.41291212935532],[-82.15576171875,52.308478623663355],[-82.90283203125,53.409531853086435],[-84.57275390625,53.44880683542759]]]}},{"type": "Feature","properties": {"name": "Happy Mouth"},"geometry": {"type": "Polygon","coordinates": [[[-92.8125,51.67255514839676],[-91.82373046875,50.499452103967734],[-88.9892578125,50.317408112618686],[-84.44091796875,50.190967765585604],[-82.33154296875,51.04139389812637],[-82.02392578125,49.96535590991311],[-83.60595703125,48.748945343432936],[-85.869140625,48.3416461723746],[-89.296875,48.66194284607008],[-92.021484375,49.05227025601607],[-93.2080078125,49.76707407366792],[-92.8125,51.67255514839676]]]}}]}';
  const systemMagic = {
    mapSR: {
      wkid: 102100
    }
  };

  const happyLayer: GeoJsonLayer = gapi.layers.createGeoJSONLayer(rampHappyLayerConfig , happy, systemMagic);

  happyLayer.stateChanged.listen((mahState: string) => { console.log('RESPECT MAH GEOJSON STATE: ' + mahState); });

  map.addLayer(happyLayer);

  happyLayer.isLayerLoaded().then(() => {
    // test fun times
    console.log('saw happy layer load, attempt attrib load');
    const attProm = happyLayer.getAttributes();
    attProm.then((attResult: any) => {
      console.log('check out mah happy attributes', attResult);
    });

    console.log('check mah happy feature count', happyLayer.getFeatureCount());

  });

  // ------ map image layer test --------

  const rampMapImageLayerConfig = {
    id: 'extraFancyTest',
    name: 'I was once called Dynamic',
    layerType: 'esriDynamic', // TODO change this keyvalue?
    // layerEntries: [{ index: 21 }, { index: 17 }, { index: 19 }],
    layerEntries: [ { index: 3, state: {} }, { index: 6, state: {} }],
    state: {
      opacity: 1,
      visibility: true
    },
    // url: 'http://geoappext.nrcan.gc.ca/arcgis/rest/services/NACEI/energy_infrastructure_of_north_america_en/MapServer'
    url: 'http://maps-cartes.ec.gc.ca/arcgis/rest/services/EcoGeo/EcoGeo/MapServer'
  };

  const imgLayer: MapImageLayer = gapi.layers.createMapImageLayer(rampMapImageLayerConfig);

  imgLayer.stateChanged.listen((mahState: string) => { console.log('RESPECT MAH IMAGE STATE: ' + mahState); });

  map.addLayer(imgLayer);

  imgLayer.isLayerLoaded().then(() => {
    // test fun times

    console.log('saw layer load, attempt attrib load');
    const attProm = imgLayer.getAttributes(6);
    attProm.then((attResult: any) => {
      console.log('check out mah attributes', attResult);
    });

    const tableAttProm = imgLayer.getTabularAttributes(6);
    tableAttProm.then((tattResult: any) => {
      console.log('check out mah tabley attributes', tattResult);
    });

    console.log('check mah feature count', imgLayer.getFeatureCount(6));

    console.log('merry tree', imgLayer.getLayerTree());

    console.log('have a look at this legend', imgLayer.getLegend(6));

  });

  // ------ random tests --------
  gapi.utils.symbology.mapServerToLocalLegend('https://section917.canadacentral.cloudapp.azure.com/arcgis/rest/services/CESI/MapServer/').then(legend => {
    console.log('legend from map server');
    console.table(legend);
  });

});
