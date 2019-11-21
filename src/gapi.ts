import { GeoApiInterface, DojoWindow, EsriBundle } from './gapitypes';
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
            const esriBundle: EsriBundle = {};

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
function initAll(esriBundle: EsriBundle, window: DojoWindow): GeoApiInterface {
    const api: GeoApiInterface = {};
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

export default function (esriApiUrl: string, window: DojoWindow): Promise<GeoApiInterface> {

    // esriDeps is an array pairing ESRI JSAPI dependencies with their imported names
    // in esriBundle
    const esriDeps: Array<Array<string>> = [
        // TODO re-add all required libs once working
        ['esri/layers/FeatureLayer', 'FeatureLayer'],
        ['esri/Map', 'Map'],
        ['esri/views/MapView', 'MapView']
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