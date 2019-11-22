import { GeoApi, DojoWindow, EsriBundle } from './gapiTypes';
import { FakeNewsMapModule } from './fakenewsmap';

// TODO once working, try to use asynch / await keywords


/**
 * Invokes the dojo module loader. Loads a list of modules and returns in an object
 * @param {Array} modules  Array of arrays. inner arrays contain dojo module path in index 0, the name to call the module in index 1
 * @param {Object} window  reference to the browser's window
 * @return {Promise} resolves with a key-value pair object. Keys are module names. Values are the modules.
 */
function makeDojoRequests(modules: Array<Array<string>>, window: DojoWindow): Promise<EsriBundle> {
    return new Promise(function (resolve, reject) {

        // NOTE: do not change the callback to an arrow function since we don't know if
        // Dojo's require has any expectations of the scope within that function or
        // does any odd metaprogramming
        window.require(modules.map(mod => mod[0]), function () {
            const esriBundle: EsriBundle = new EsriBundle();

            // iterate over arguments to avoid creating an ugly giant function call
            // arguments is not an array so we do this the hard way
            for (let i = 0; i < arguments.length; ++i) {
                esriBundle[modules[i][1]] = arguments[i];
            }
            resolve(esriBundle);
        });

        window.require.on('error', () => reject());
    });
}

// essentially sets up the main geoApi module object and initializes all the subcomponents
function initAll(esriBundle: EsriBundle, window: DojoWindow): GeoApi {
    const api: GeoApi = {};
    /*
    api.layer = layer(esriBundle, api);
    api.legend = legend();
    api.proj = proj(esriBundle);
    api.Map = esriMap(esriBundle, api);
    api.attribs = attribute(esriBundle, api);
    api.symbology = symbology(esriBundle, api, window);
    api.hilight = hilight(esriBundle, api);
    api.events = events();
    api.query = query(esriBundle);
    api.shared = shared(esriBundle);
    api.agol = agol(esriBundle);
    */

    // use of the following `esri` properties/functions are unsupported by ramp team.
    // they are provided for plugin developers who want to write advanced geo functions
    // and wish to directly consume the esri api objects AT THEIR OWN RISK !!!  :'O  !!!

    // access to the collection of ESRI API classes that geoApi loads for its own use
    api.esriBundle = esriBundle;
    api.fakeNewsMaps = new FakeNewsMapModule(esriBundle);

    // function to load ESRI API classes that geoApi does not auto-load.
    // param `modules` is an array of arrays, the inner arrays are 2-element consisting
    // of the official library path as the first element, and the property name in the
    // result object to assign the class to.
    // e.g. [['esri/tasks/FindTask', 'findTaskClass'], ['esri/geometry/mathUtils', 'mathUtils']]
    // return value is object with properties containing the dojo classes defined in the param.
    // e.g. { findTaskClass: <FindTask Dojo Class>, mathUtils: <mathUtils Dojo Class> }
    /* api.esriLoadApiClasses = modules => makeDojoRequests(modules, window); */

    return api;
}

export default function (esriApiUrl: string, window: DojoWindow): Promise<GeoApi> {

    // esriDeps is an array pairing ESRI JSAPI dependencies with their imported names
    // in esriBundle
    const esriDeps: Array<Array<string>> = [
        // TODO add 3D Map for future support?  or keep out for now to avoid extra downloads
        // TODO validate that we are still using these in our code. Any module not being used should be removed

        // TODO remove these commented things once migration is finished
        // ['dojo/Deferred', 'Deferred'], // esri4 SHOULD be using promises instead of Deferred's now
        // ['esri/geometry/ScreenPoint', 'ScreenPoint'], // depreciated. need to find alternative.  Possibly MapView.toScreen()
        // ['esri/graphicsUtils', 'graphicsUtils'], // depreciated. may need to find alternative, especially for bounding box of graphics
        // ['esri/widgets/BasemapLayer', 'BasemapLayer'], // depreciated. everything lives within Basemap now
        // ['esri/widgets/OverviewMap', 'OverviewMap'], // depreciated. we likely need a 2nd MapView, or a separate synched map to do our overview. https://developers.arcgis.com/javascript/latest/sample-code/overview-map/index.html

        ['dojo/query', 'dojoQuery'],
        ['esri/Basemap', 'Basemap'],
        ['esri/Color', 'Color'],
        ['esri/config', 'esriConfig'],
        ['esri/geometry/Extent', 'Extent'],
        ['esri/geometry/Multipoint', 'Multipoint'],
        ['esri/geometry/Point', 'Point'],
        ['esri/geometry/Polygon', 'Polygon'],
        ['esri/geometry/Polyline', 'Polyline'],
        ['esri/geometry/SpatialReference', 'SpatialReference'],
        ['esri/Graphic', 'Graphic'],
        ['esri/layers/FeatureLayer', 'FeatureLayer'],
        ['esri/layers/GeoJSONLayer', 'GeoJSONLayer'],
        ['esri/layers/GraphicsLayer', 'GraphicsLayer'],
        ['esri/layers/ImageryLayer', 'ImageryLayer'], // formerly known as ArcGISImageServiceLayer
        ['esri/layers/MapImageLayer', 'MapImageLayer'], // formerly known as ArcGISDynamicMapServiceLayer
        ['esri/layers/TileLayer', 'TileLayer'], // formerly known as ArcGISTiledMapServiceLayer
        ['esri/layers/WMSLayer', 'WmsLayer'],
        ['esri/layers/support/ImageParameters', 'ImageParameters'],
        ['esri/layers/support/Sublayer', 'Sublayer'], // formerly known as LayerDrawingOptions
        ['esri/layers/support/WMSSublayer', 'WMSSublayer'], // formerly known as WMSLayerInfo
        ['esri/Map', 'Map'],
        ['esri/renderers/ClassBreaksRenderer', 'ClassBreaksRenderer'],
        ['esri/renderers/SimpleRenderer', 'SimpleRenderer'],
        ['esri/renderers/UniqueValueRenderer', 'UniqueValueRenderer'],
        ['esri/request', 'esriRequest'],
        ['esri/symbols/PictureMarkerSymbol', 'PictureMarkerSymbol'],
        ['esri/symbols/SimpleFillSymbol', 'SimpleFillSymbol'],
        ['esri/symbols/SimpleLineSymbol', 'SimpleLineSymbol'],
        ['esri/symbols/SimpleMarkerSymbol', 'SimpleMarkerSymbol'],
        ['esri/symbols/support/jsonUtils', 'symbolJsonUtils'],
        ['esri/tasks/GeometryService', 'GeometryService'],
        ['esri/tasks/IdentifyTask', 'IdentifyTask'],
        ['esri/tasks/PrintTask', 'PrintTask'],
        ['esri/tasks/QueryTask', 'QueryTask'],
        ['esri/tasks/support/IdentifyParameters', 'IdentifyParameters'],
        ['esri/tasks/support/PrintParameters', 'PrintParameters'],
        ['esri/tasks/support/PrintTemplate', 'PrintTemplate'],
        ['esri/tasks/support/ProjectParameters', 'ProjectParameters'],
        ['esri/tasks/support/Query', 'Query'],
        ['esri/views/MapView', 'MapView'],
        ['esri/widgets/BasemapGallery', 'BasemapGallery'],
        ['esri/widgets/ScaleBar', 'ScaleBar']
    ];

    // the startup for this module is:
    // 1. add a script tag to load the API (this typically points to a custom ESRI build)
    // 2. load all the ESRI and Dojo dependencies `makeDojoRequests()`
    // 3. initialize all of our modules
    // everything is done in an async model and the result is a promise which resolves to
    // a reference to our API
    return new Promise(function (resolve, reject) {
        if (window.require) {
            console.warn('ESRI API Load Process: window.require already exists, ' +
                'attempting to reuse existing loader with no new script tag created');
            resolve();
            return;
        }

        // TODO try to add types, if we care.
        const oScript = window.document.createElement('script');
        const oHead = window.document.head || window.document.getElementsByTagName('head')[0];

        oScript.type = 'text\/javascript';
        oScript.onerror = (err: any) => reject(err);
        oScript.onload = () => resolve();
        oHead.appendChild(oScript);
        oScript.src = esriApiUrl; // '//ec.cloudapp.net/~aly/esri/dojo/dojo.js';
    }).then(() => {
        console.log('script for dojo loaded');
        return makeDojoRequests(esriDeps, window);
    }).then((esriBundle: EsriBundle) => initAll(esriBundle, window));
}