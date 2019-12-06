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

  const rampLayerConfig = {
    id: 'fancyTest',
    url: 'http://maps-cartes.ec.gc.ca/arcgis/rest/services/EcoGeo/EcoGeo/MapServer/6',
    state: {
      opacity: 0.8
    }
  }

  const fancyLayer: FeatureLayer = gapi.layers.createFeatureLayer(rampLayerConfig);

  fancyLayer.stateChanged.listen((mahState: string) => {console.log('RESPECT MAH STATE: ' + mahState);});

  map.addLayer(fancyLayer);

});
