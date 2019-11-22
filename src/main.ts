import { GeoApi, DojoWindow, EsriBundle } from './gapiTypes';
import GapiLoader from './gapi';

const gapiPromise: Promise<GeoApi> = GapiLoader('https://js.arcgis.com/4.13', window);

gapiPromise.then((gapi: GeoApi) => {
  console.log('GeoAPI Loaded', gapi);

  const fakeMap = gapi.fakeNewsMaps.makeMap('dirtyDiv');

});
