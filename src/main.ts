import { GeoApiInterface, DojoWindow, EsriBundle } from './gapitypes';
import GapiLoader from './gapi';

const gapiPromise: Promise<GeoApiInterface> = GapiLoader('https://js.arcgis.com/4.13', window);

gapiPromise.then((gapi: GeoApiInterface) => {
  console.log('GeoAPI Loaded', gapi);

  const fakeMap = gapi.fakeNewsMaps.makeMap('dirtyDiv');

});
