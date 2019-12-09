import esri = __esri;
import { EsriBundle, GeoApi } from './gapiTypes';

// TODO highlight layer would be a good candidate for a custom class which internally proxies to ESRI's GraphicsLayer.

import defaultSymbols from './defaulthighlightSymbols.json';

// contains functions to support the highlight layer.

function graphicBuilder(esriBundle: EsriBundle): Object {
    /**
     * Generating a graphic from server geometry.
     * @method geomToGraphic
     * @param {Object} geometry feature geometry conforming to ESRI Geometry standard
     * @param {Object} symbol esri symbol in server format
     * @return {Object} an ESRI GraphicsLayer
     */
    return (geometry: esri.Geometry, symbol: esri.Symbol): esri.Graphic => {
        const graphic = new esriBundle.Graphic({
                geometry
            });
        graphic.symbol = esriBundle.symbolJsonUtils.fromJSON(symbol);
        return graphic;
    };
}

function getGraphicsBuilder(geoApi: GeoApi): Object {
    // TODO once document sites are up and running, figure out a way to hyperlink the graphicBundles parameter to the class documentation page in the viewer site
    /**
     * Generating a graphic from server geometry.
     * @method getUnboundGraphics
     * @param {Array} graphicBundles set of graphic bundles with properties .graphic, .layerFC
     * @param {Object} spatialReference the projection the unbound graphics should be in
     * @return {Array} a set of promises that resolve with an unbound graphic, one for each graphic bundle provided
     */
    return (graphicBundles: Array<any>, spatialReference: Object): Array<any> => {

        // generate detached graphics to give to the highlight layer.
        // promises because server layers renderer is inside a promise
        return graphicBundles.map(bundle => {
            let geom = bundle.graphic.geometry;

            // check projection
            // TODO uncomment after the require files are added
            // if (!geoApi.proj.isSpatialRefEqual(geom.spatialReference, spatialReference)) {
            //     geom = geoApi.proj.localProjectGeometry(spatialReference, geom);
            // }

            // // determine symbol for this server graphic
            // return bundle.layerFC.getLayerData().then((layerData: any) => {
            //     const symb = geoApi.symbology.getGraphicSymbol(bundle.graphic.attributes, layerData.renderer);
            //     return geoApi.highlight.geomToGraphic(geom, symb);
            // });
        });
    };
}

function highlightBuilder(esriBundle: EsriBundle): Object {
    /**
     * Generate a graphic layer to handle feature highlighting.
     * @method makehighlightLayer
     * @param {Object} options optional settings for the highlight layer
     *                         layerId - id to use for the highlight layer. defaults to rv_highlight
     *                         markerSymbol - esri symbol in server json format to symbolize the click marker. defaults to a red pin
     * @return {Object} an ESRI GraphicsLayer
     */
    return (options: any) => {
        // set options
        let id = 'rv_highlight';
        let markerSymbol = esriBundle.PictureMarkerSymbol.fromJSON(defaultSymbols.markerSymbol);

        if (options) {
            if (options.layerId) {
                id = options.layerId;
            }
            if (options.markerSymbol) {
                markerSymbol = options.markerSymbol;
            }

        }

        // need to make type 'any' to allow for the adding of custom functions below
        const hgl: any = new esriBundle.GraphicsLayer({ id, visible: true });

        /**
         * Add a graphic to indicate where user clicked.
         * @method addPin
         * @param {Point} point          an ESRI point object to use as the graphic location
         * @param {Boolean} clearLayer   indicates any previous graphics in the highlight layer should be removed. defaults to false
         */
        hgl.addMarker = (point: esri.Point, clearLayer: boolean = false) => {
            if (clearLayer) {
                hgl.clear();
            }

            const marker = new esriBundle.Graphic({ geometry: point, symbol: markerSymbol });
            hgl.add(marker);
        };

        /**
         * Add a graphic or array of graphics to the highlight layer. Remove any previous graphics.
         * @method addhighlight
         * @param {Graphic|Array} graphic  an ESRI graphic, or array of ESRI graphics. Should be in map spatialReference, and not bound to a layer
         * @param {Boolean} clearLayer   indicates any previous graphics in the highlight layer should be removed. defaults to false
         */
        hgl.addhighlight = (graphic: esri.Graphic | Array<esri.Graphic>, clearLayer: boolean = false) => {
            if (clearLayer) {
                hgl.clear();
            }

            const graphics = Array.isArray(graphic) ? graphic : [graphic];

            // add new highlight graphics
            graphics.forEach(g => hgl.add(g));
        };

        /**
         * Remove highlight from map
         * @method clearhighlight
         */
        hgl.clearhighlight = () => {
            hgl.clear();
        };

        return hgl;
    };
}

export default (esriBundle: EsriBundle, geoApi: GeoApi): Object => ({
    makehighlightLayer: highlightBuilder(esriBundle),
    geomToGraphic: graphicBuilder(esriBundle),
    getUnboundGraphics: getGraphicsBuilder(geoApi)
});
