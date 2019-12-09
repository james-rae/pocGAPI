// this file is like the launcher for testing the pocGAPI.
// once this becomes a proper library, it will likely get trashed and gapi.ts will become the primary file
// (we either rename it to main, or do as buildmaster miles commands )

import { GeoApi, DojoWindow, EsriBundle } from './gapiTypes';
import GapiLoader from './gapi';
import Map from './map/Map';
import FeatureLayer from './layer/FeatureLayer';

const gapiPromise: Promise<GeoApi> = GapiLoader('https://js.arcgis.com/4.13', window);

gapiPromise.then((gapi: GeoApi) => {
  console.log('GeoAPI Loaded', gapi);

  // const fakeMap = gapi.fakeNewsMaps.makeMap('dirtyDiv');

  const esriMapConfig = {
    basemap: 'topo'
  }
  const map: Map = gapi.maps.createMap(esriMapConfig, 'dirtyDiv');

  const rampFeatureLayerConfig = {
    id: 'fancyTest',
    url: 'http://maps-cartes.ec.gc.ca/arcgis/rest/services/EcoGeo/EcoGeo/MapServer/6',
    state: {
      opacity: 0.8
    }
  }

  const fancyLayer: FeatureLayer = gapi.layers.createFeatureLayer(rampFeatureLayerConfig);

  fancyLayer.stateChanged.listen((mahState: string) => {console.log('RESPECT MAH STATE: ' + mahState);});

  map.addLayer(fancyLayer);

  const rampMapImageLayerConfig = {
    id: "extraFancyTest",
    name: "I was once called Dynamic",
    layerType: "esriDynamic", // TODO change this?
    layerEntries: [{ index: 21 }, { index: 17 }, { index: 19 }],
    disabledControls: ["opacity", "visibility"],
    state: {
      "opacity": 0,
      "visibility": false
    },
    url: "http://geoappext.nrcan.gc.ca/arcgis/rest/services/NACEI/energy_infrastructure_of_north_america_en/MapServer"
  };

});
