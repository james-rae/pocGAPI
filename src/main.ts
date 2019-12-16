// this file is like the launcher for testing the pocGAPI.
// once this becomes a proper library, it will likely get trashed and gapi.ts will become the primary file
// (we either rename it to main, or do as buildmaster miles commands )

import { GeoApi, DojoWindow, EsriBundle } from './gapiTypes';
import GapiLoader from './gapi';
import Map from './map/Map';
import FeatureLayer from './layer/FeatureLayer';
import GeoJsonLayer from './layer/GeoJsonLayer';

const gapiPromise: Promise<GeoApi> = GapiLoader('https://js.arcgis.com/4.13', window);

gapiPromise.then((gapi: GeoApi) => {
  console.log('GeoAPI Loaded', gapi);

  // const fakeMap = gapi.fakeNewsMaps.makeMap('dirtyDiv');

  const esriMapConfig = {
    basemap: 'topo'
  };
  const map: Map = gapi.maps.createMap(esriMapConfig, 'dirtyDiv');


  // ------ feature layer test --------
  const rampFeatureLayerConfig = {
    id: 'fancyTest',
    url: 'http://maps-cartes.ec.gc.ca/arcgis/rest/services/EcoGeo/EcoGeo/MapServer/6',
    state: {
      opacity: 0.8
    },
    customRenderer: {} // just to chill things out. real ramp will have all properties defaulted and filled in
  };

  const fancyLayer: FeatureLayer = gapi.layers.createFeatureLayer(rampFeatureLayerConfig);

  fancyLayer.stateChanged.listen((mahState: string) => { console.log('RESPECT MAH STATE: ' + mahState); });

  map.addLayer(fancyLayer);

  fancyLayer.isLayerLoaded().then(() => {
    // test fun times
    console.log('saw layer load, attempt attrib load');
    const attProm = fancyLayer.getAttributes();
    attProm.then((attResult:any) => {
      console.log('check out mah attributes', attResult);
    });
  })

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
  map.addLayer(happyLayer);

  // ------ map image layer test --------

  const rampMapImageLayerConfig = {
    id: 'extraFancyTest',
    name: 'I was once called Dynamic',
    layerType: 'esriDynamic', // TODO change this keyvalue?
    layerEntries: [{ index: 21 }, { index: 17 }, { index: 19 }],
    disabledControls: ['opacity', 'visibility'],
    state: {
      opacity: 0,
      visibility: false
    },
    url: 'http://geoappext.nrcan.gc.ca/arcgis/rest/services/NACEI/energy_infrastructure_of_north_america_en/MapServer'
  };

});
