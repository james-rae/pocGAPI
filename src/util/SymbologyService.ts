import esri = __esri;
import { InfoBundle, LegendSymbology } from '../gapiTypes';
import BaseBase from '../BaseBase';

import svgjs from 'svg.js';
import { BaseRenderer, BaseSymbolUnit, SimpleRenderer, ClassBreaksRenderer, UniqueValueRenderer } from './Renderers';

// Functions for turning ESRI Renderers into images
// Specifically, converting ESRI "Simple" symbols into images,
// and deriving the appropriate image for a feature based on
// a renderer

export default class SymbologyService extends BaseBase {

    // layer symbology types
    protected SIMPLE = 'simple';
    protected UNIQUE_VALUE = 'uniqueValue';
    protected CLASS_BREAKS = 'classBreaks';
    protected NONE = 'none';


    protected CONTAINER_SIZE = 32; // size of the symbology item container
    protected CONTENT_SIZE = 24; // size of the symbology graphic
    protected CONTENT_IMAGE_SIZE = 28; // size of the symbology graphic if it's an image (images tend to already have a white boarder around them)
    protected CONTAINER_CENTER = this.CONTAINER_SIZE / 2;
    protected CONTENT_PADDING = (this.CONTAINER_SIZE - this.CONTENT_SIZE) / 2;

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
    }

    // a lot of these functions get deleted once the renderers get finished (class breaks still outstanding)

    /**
     * Will add extra properties to a renderer to support filtering by symbol.
     * New property .definitionClause contains sql where fragment valid for symbol
     * for app on each renderer item.
     *
     * @param {Object} renderer an ESRI renderer object in server JSON form. Param is modified in place
     * @param  {Array} fields Optional. Array of field definitions for the layer the renderer belongs to. If missing, all fields are assumed as String
     */
    filterifyRenderer(renderer: any, fields: Array<any>): void {

        // worker function. determines if a field value should be wrapped in
        // any character and returns the character. E.g. string would return ', numbers return empty string.
        const getFieldDelimiter = (fieldName: any) => {

            let delim = `'`;

            // no field definition means we assume strings.
            if (!fields || fields.length === 0) {
                return delim;
            }

            // attempt to find our field, and a data type for it.
            const f = fields.find(ff => ff.name === fieldName);
            if (f && f.type && f.type !== 'esriFieldTypeString') {
                // we found a field, with a type on it, but it's not a string. remove the delimiters
                delim = '';
            }

            return delim;
        };

        // worker function to turn single quotes in a value into two
        // single quotes to avoid conflicts with the text delimiters
        const quoter = (inStr: string) => {
            return inStr.replace(/'/g, `''`);
        };

        switch (renderer.type) {
            case this.SIMPLE:
                renderer.definitionClause = '1=1';
                break;

            case this.UNIQUE_VALUE:
                if (renderer.bypassDefinitionClause) {
                    // we are working with a renderer that we generated from a server legend.
                    // just set dumb basic things.
                    renderer.uniqueValueInfos.forEach((uvi: any) => {
                        uvi.definitionClause = '1=1';
                    });
                } else {
                    const delim = renderer.fieldDelimiter || ', ';
                    const keyFields = ['field1', 'field2', 'field3']
                        .map(fn => renderer[fn]) // extract field names
                        .filter(fn => fn);       // remove any undefined names

                    const fieldDelims = keyFields.map(fn => getFieldDelimiter(fn));

                    renderer.uniqueValueInfos.forEach((uvi: any) => {
                        // unpack .value into array
                        const keyValues = uvi.value.split(delim);

                        // convert fields/values into sql clause
                        const clause = keyFields
                            .map((kf, i) =>  `${kf} = ${fieldDelims[i]}${quoter(keyValues[i])}${fieldDelims[i]}`)
                            .join(' AND ');

                        uvi.definitionClause = `(${clause})`;
                    });
                }

                break;
            case this.CLASS_BREAKS:

                const f = renderer.field;
                let lastMinimum = renderer.minValue;

                // figure out ranges of each break.
                // minimum is optional, so we have to keep track of the previous max as fallback
                renderer.classBreakInfos.forEach((cbi: any) => {
                    const minval = isNaN(cbi.classMinValue) ? lastMinimum : cbi.classMinValue;
                    if (minval === cbi.classMaxValue) {
                        cbi.definitionClause = `(${f} = ${cbi.classMaxValue})`;
                    } else {
                        cbi.definitionClause = `(${f} > ${minval} AND ${f} <= ${cbi.classMaxValue})`;
                    }
                    lastMinimum = cbi.classMaxValue;
                });

                break;
            default:

                // Renderer we dont support
                console.warn('encountered unsupported renderer type: ' + renderer.type);
        }
    }

    /**
     * Will add extra properties to a renderer to support images.
     * New properties .svgcode and .defaultsvgcode contains image source
     * for app on each renderer item.
     *
     * @param {Object} renderer an ESRI renderer object in server JSON form. Param is modified in place
     * @param {Object} legend object for the layer that maps legend label to data url of legend image
     * @return {Promise} resolving when the renderer has been enhanced
     */
    async enhanceRenderer(renderer: any, legend: any): Promise<any> {

        // TODO note somewhere (user docs) that everything fails if someone publishes a legend with two identical labels.
        // UPDATE turns out services like this exist, somewhat. While the legend has unique labels, the renderer
        //        can have multiple items with the same corresponding label.  Things still hang together in that case,
        //        since we still have a 1-to-1 relationship between label and icon (all multiples in renderer have
        //        same label)

        // quick lookup object of legend names to data URLs.
        // our legend object is in ESRI format, but was generated by us and only has info for a single layer.
        // so we just grab item 0, which is the only item.
        const legendLookup = {};

        // store svgcode in the lookup
        const legendItemPromises = legend.layers[0].legend.map((legItem: Promise<any>) =>
            legItem.then(data =>
                legendLookup[data.label] = data.svgcode
            ));

        // wait until all legend items are resolved and legend lookup is updated
        await Promise.all(legendItemPromises);
        switch (renderer.type) {
            case this.SIMPLE:
                renderer.svgcode = legendLookup[renderer.label];
                break;
            case this.UNIQUE_VALUE:
                if (renderer.defaultLabel) {
                    renderer.defaultsvgcode = legendLookup[renderer.defaultLabel];
                }
                renderer.uniqueValueInfos.forEach((uvi: any) => {
                    uvi.svgcode = legendLookup[uvi.label];
                });
                break;
            case this.CLASS_BREAKS:
                if (renderer.defaultLabel) {
                    renderer.defaultsvgcode = legendLookup[renderer.defaultLabel];
                }
                renderer.classBreakInfos.forEach((cbi: any) => {
                    cbi.svgcode = legendLookup[cbi.label];
                });
                break;
            default:
                // Renderer we dont support
                console.warn('encountered unsupported renderer type: ' + renderer.type);
        }
    }

    /**
     * Will inspect the field names in a renderer and adjust any mis-matched casing
     * to align with the layer field definitions
     *
     * @private
     * @param  {Object} renderer a layer renderer in json format
     * @param  {Array} fields   list of field objects for the layer
     * @returns {Object} the renderer with any fields adjusted with proper case
     */
    cleanRenderer(renderer: any, fields: Array<any>): void {

        const enhanceField = (fieldName: string, fields: Array<any>) => {
            if (!fieldName) {
                // testing an undefined/unused field. return original value.
                return fieldName;
            }
            let myField = fields.find(f => f.name === fieldName);
            if (myField) {
                // field is valid. donethanks.
                return fieldName;
            } else {
                // do case-insensitive search
                const lowName = fieldName.toLowerCase();
                myField = fields.find(f => f.name.toLowerCase() === lowName);
                if (myField) {
                    // use the field definition casing
                    return myField.name;
                } else {
                    // decided error here was too destructive. it would tank the layer,
                    // while the drawback would mainly only be failed symbols.
                    // just return fieldName and hope for luck.
                    console.warn(`could not find renderer field ${fieldName}`);
                    return fieldName;
                }
            }
        };

        switch (renderer.type) {
            case this.SIMPLE:
                break;
            case this.UNIQUE_VALUE:
                ['field1', 'field2', 'field3'].forEach(f => {
                    // call ehnace case for each field
                    renderer[f] = enhanceField(renderer[f], fields);
                });
                break;
            case this.CLASS_BREAKS:
                renderer.field = enhanceField(renderer.field, fields);
                break;
            default:
                // Renderer we dont support
                console.warn('encountered unsupported renderer type: ' + renderer.type);
        }
        return renderer;
    }

    /**
     * Given feature attributes, find the renderer node that would draw it
     *
     * @method searchRenderer
     * @param {Object} attributes object of feature attribute key value pairs
     * @param {Object} renderer an enhanced renderer (see function enhanceRenderer)
     * @return {Object} an Object with svgcode and symbol properties for the matched renderer item
     */
    searchRenderer(attributes: Object, renderer: any): Object {

        let svgcode: string;
        let symbol = {};

        switch (renderer.type) {
            case this.SIMPLE:
                svgcode = renderer.svgcode;
                symbol = renderer.symbol;

                break;

            case this.UNIQUE_VALUE:

                // make a key value for the graphic in question, using comma-space delimiter if multiple fields
                // put an empty string when key value is null
                let graphicKey = attributes[renderer.field1] === null ? '' : attributes[renderer.field1];

                // all key values are stored as strings.  if the attribute is in a numeric column, we must convert it to a string to ensure the === operator still works.
                if (typeof graphicKey !== 'string') {
                    graphicKey = graphicKey.toString();
                }

                // TODO investigate possibility of problems due to falsey logic.
                //      e.g. if we had a field2 with empty string, would app expect
                //           'value1, ' or 'value1'
                //      need to brew up some samples to see what is possible in ArcMap
                if (renderer.field2) {
                    const delim = renderer.fieldDelimiter || ', ';
                    graphicKey = graphicKey + delim + attributes[renderer.field2];
                    if (renderer.field3) {
                        graphicKey = graphicKey + delim + attributes[renderer.field3];
                    }
                }

                // search the value maps for a matching entry.  if no match found, use the default image
                const uvi = renderer.uniqueValueInfos.find(uvi => uvi.value === graphicKey);
                if (uvi) {
                    svgcode = uvi.svgcode;
                    symbol = uvi.symbol;
                } else {
                    svgcode = renderer.defaultsvgcode;
                    symbol = renderer.defaultSymbol;
                }

                break;

            case this.CLASS_BREAKS:

                const gVal = parseFloat(attributes[renderer.field]);
                const lower = renderer.minValue;

                svgcode = renderer.defaultsvgcode;
                symbol = renderer.defaultSymbol;

                // check for outside range on the low end
                if (gVal < lower) { break; }

                // array of minimum values of the ranges in the renderer
                let minSplits = renderer.classBreakInfos.map((cbi: any) => cbi.classMaxValue);
                minSplits.splice(0, 0, lower - 1); // put lower-1 at the start of the array and shift all other entries by 1

                // attempt to find the range our gVal belongs in
                const cbi = renderer.classBreakInfos.find((cbi: any, index: string | number) => gVal > minSplits[index] &&
                    gVal <= cbi.classMaxValue);
                if (!cbi) { // outside of range on the high end
                    break;
                }
                svgcode = cbi.svgcode;
                symbol = cbi.symbol;

                break;

            default:
                console.warn(`Unknown renderer type encountered - ${renderer.type}`);

        }

        // make an empty svg graphic in case nothing is found to avoid undefined inside the filters
        if (this.isUn(svgcode)) {
            svgcode = svgjs(window.document.createElement('div')).size(this.CONTAINER_SIZE, this.CONTAINER_SIZE).svg();
        }

        return { svgcode, symbol };

    }

    /**
     * Given feature attributes, return the image URL for that feature/graphic object.
     *
     * @method getGraphicIcon
     * @param {Object} attributes object of feature attribute key value pairs
     * @param {Object} renderer an enhanced renderer (see function enhanceRenderer)
     * @return {String} svgcode Url to the features symbology image
     */
    getGraphicIcon(attributes: Object, renderer: Object): string {
        const renderInfo: any = this.searchRenderer(attributes, renderer);
        return renderInfo.svgcode;
    }

    /**
     * Given feature attributes, return the symbol for that feature/graphic object.
     *
     * @method getGraphicSymbol
     * @param {Object} attributes object of feature attribute key value pairs
     * @param {Object} renderer an enhanced renderer (see function enhanceRenderer)
     * @return {Object} an ESRI Symbol object in server format
     */
    getGraphicSymbol(attributes: Object, renderer: Object): Object {
        const renderInfo: any = this.searchRenderer(attributes, renderer);
        return renderInfo.symbol;
    }

    makeRenderer(esriRenderer: esri.Renderer, fields: Array<esri.Field>, falseRenderer: boolean = false): BaseRenderer {
        switch (esriRenderer.type) {
            case 'simple':
                return new SimpleRenderer(<esri.SimpleRenderer>esriRenderer, fields);

            case 'class-breaks':
                return new ClassBreaksRenderer(<esri.ClassBreaksRenderer>esriRenderer, fields);

            case 'unique-value':
                return new UniqueValueRenderer(<esri.UniqueValueRenderer>esriRenderer, fields, falseRenderer);

            default:
                // TODO find a way to make a fake renderer (i.e. a simple renderer with just a white square)
                //      and return it. that way it won't crash the app.  once done, change back to console error instead of real error

                // console.error(`Unknown renderer type encountered - ${esriRenderer.type}`);
                throw new Error(`Unknown renderer type encountered - ${esriRenderer.type}`);
        }
    }

    /**
     * Generates svg symbology for WMS layers.
     * @function generateWMSSymbology
     * @param {String} name label for the symbology item (it's not used right now, but is required to be consistent with other symbology generating functions)
     * @param {String} imageUri url or dataUrl of the legend image
     * @return {Promise} a promise resolving with symbology svg code and its label
     */
    generateWMSSymbology(name: string, imageUri: string): Promise<Object> {
        const draw = svgjs(window.document.createElement('div'))
            .size(this.CONTAINER_SIZE, this.CONTAINER_SIZE)
            .viewbox(0, 0, 0, 0);

        const symbologyItem = {
            name,
            svgcode: null
        };

        if (imageUri) {
            const renderPromise = this.renderSymbologyImage(imageUri).then(svgcode => {
                symbologyItem.svgcode = svgcode;

                return symbologyItem;
            });

            return renderPromise;
        } else {
            symbologyItem.svgcode = draw.svg();

            return Promise.resolve(symbologyItem);
        }
    }

    /**
     * Converts a config-supplied list of symbology to the format used by layer records.
     *
     * @private
     * @function _listToSymbology
     * @param {Function} conversionFunction a conversion function to wrap the supplied image into an image or an icon style symbology container
     * @param {Array} list a list of config-supplied symbology items in the form of [ { text: <String>, image: <String> }, ... ] wher `image` can be dataURL or an actual url
     * @return {Array} an array of converted symbology symbols in the form of [ { name: <String>, image: <String>, svgcode: <String> }, ... ]; items will be populated async as conversions are done
     */
    private listToSymbology(conversionFunction: Function, list: Array<any>): Array<Object> {
        const results = list.map(({ text, image }) => {
            const result = {
                name: text,
                image, // url
                svgcode: null
            };

            conversionFunction(image).then((svgcode: string) => {
                result.svgcode = svgcode;
            });

            return result;
        });

        return results;
    }

    // these two functions called by legend ui to make symbol stacks.
    // may need to adjust stuff with new UI
    listToIconSymbology(list: Array<any>): Array<any> {
        return this.listToSymbology(this.renderSymbologyIcon, list);
    }

    listToImageSymbology(list: Array<any>): Array<any> {
        return this.listToSymbology(this.renderSymbologyImage, list);
    }

    /**
     * Renders a supplied image as an image-style symbology item (preserving the true image dimensions).
     *
     * @function renderSymbologyImage
     * @param {String} imageUri a image dataUrl or a regular url
     * @param {Object} draw [optional=null] an svg container to draw the image on; if not supplied, a new one is created
     */
    renderSymbologyImage(imageUri: string, draw: any = null): Promise<string> {
        if (draw === null) {
            draw = svgjs(window.document.createElement('div'))
                .size(this.CONTAINER_SIZE, this.CONTAINER_SIZE)
                .viewbox(0, 0, 0, 0);
        }

        const symbologyPromise = this.gapi.utils.shared.convertImagetoDataURL(imageUri)
            .then(imageUri =>
                this.svgDrawImage(draw, imageUri))
            .then(({ loader }) => {
                draw.viewbox(0, 0, loader.width, loader.height);
                return draw.svg();
            })
            .catch(err => {
                console.error('Cannot draw symbology image; returning empty', err);
                return draw.svg();
            });

        return symbologyPromise;
    }

    /**
     * Renders a supplied image as an icon-style symbology item (fitting an image inside an icon container, usually 32x32 pixels).
     *
     * @function renderSymbologyIcon
     * @param {String} imageUri a image dataUrl or a regular url
     * @param {Object} draw [optional=null] an svg container to draw the image on; if not supplied, a new one is created
     */
    renderSymbologyIcon(imageUri: string, draw: any = null): Promise<string> {
        if (draw === null) {
            // create a temporary svg element and add it to the page; if not added, the element's bounding box cannot be calculated correctly
            const container = window.document.createElement('div');
            container.setAttribute('style', 'opacity:0;position:fixed;left:100%;top:100%;overflow:hidden');
            window.document.body.appendChild(container);

            draw = svgjs(container)
                .size(this.CONTAINER_SIZE, this.CONTAINER_SIZE)
                .viewbox(0, 0, this.CONTAINER_SIZE, this.CONTAINER_SIZE);
        }

        // need to draw the image to get its size (technically not needed if we have a url, but this is simpler)
        const picturePromise = this.gapi.utils.shared.convertImagetoDataURL(imageUri)
            .then(imageUri =>
                this.svgDrawImage(draw, imageUri))
            .then(({ image }) => {
                image.center(this.CONTAINER_CENTER, this.CONTAINER_CENTER);

                // scale image to fit into the symbology item container
                this.fitInto(image, this.CONTENT_IMAGE_SIZE);

                return draw.svg();
            });

        return picturePromise;
    }

    /**
     * Generates a placeholder symbology graphic. Returns a promise for consistency
     * @function generatePlaceholderSymbology
     * @private
     * @param  {String} name label symbology label
     * @param  {String} colour colour to use in the graphic
     * @return {Object} symbology svg code and its label
     */
    generatePlaceholderSymbology(name: string, colour: string = '#000'): Object {
        const draw = svgjs(window.document.createElement('div'))
            .size(this.CONTAINER_SIZE, this.CONTAINER_SIZE)
            .viewbox(0, 0, this.CONTAINER_SIZE, this.CONTAINER_SIZE);

        draw.rect(this.CONTENT_IMAGE_SIZE, this.CONTENT_IMAGE_SIZE)
            .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER)
            .fill(colour);

        draw
            .text(name[0].toUpperCase()) // take the first letter
            .size(23)
            .fill('#fff')
            .attr({
                'font-weight': 'bold',
                'font-family': 'Roboto'
            })
            .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER);

        return {
            name,
            svgcode: draw.svg()
        };
    }

    /**
     * Generate an SVG string for an ESRI symbol.
     * @private
     * @param  {Object} realSymbol an ESRI symbol object in server format
     * @return {Promise} resolves to an SVG string representing the symbol
     */
    private async symbolToSvg(realSymbol: any): Promise<string> {
        // TODO now that we are enlightened and using typescript and classes and such, consider taking this monster
        //      function with all it's nested functions and moving them to some type of SVG service / class.

        // SVG Legend symbology uses pixels instead of points (which is waht ESRI uses), thus we need
        // to multply it by a factor to correct the values.  96 DPI is assumed. Copy the symbol to avoid messing up other things
        const symbol: any = JSON.parse(JSON.stringify(realSymbol));
        symbol.size = symbol.size * 1.33333; // points to pixels factor

        // create a temporary svg element and add it to the page; if not added, the element's bounding box cannot be calculated correctly
        const container = this.window.document.createElement('div');
        container.setAttribute('style', 'opacity:0;position:fixed;left:100%;top:100%;overflow:hidden');
        this.window.document.body.appendChild(container);

        const draw = svgjs(container)
            .size(this.CONTAINER_SIZE, this.CONTAINER_SIZE)
            .viewbox(0, 0, this.CONTAINER_SIZE, this.CONTAINER_SIZE);

        // functions to draw esri simple marker symbols
        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        const esriSimpleMarkerSimbol = {
            esriSMSPath({ size, path }) {
                return draw.path(path).size(size);
            },
            esriSMSCircle({ size }) {
                return draw.circle(size);
            },
            esriSMSCross({ size }) {
                return draw.path('M 0,10 L 20,10 M 10,0 L 10,20').size(size);
            },
            esriSMSX({ size }) {
                return draw.path('M 0,0 L 20,20 M 20,0 L 0,20').size(size);
            },
            esriSMSTriangle({ size }) {
                return draw.path('M 20,20 L 10,0 0,20 Z').size(size);
            },
            esriSMSDiamond({ size }) {
                return draw.path('M 20,10 L 10,0 0,10 10,20 Z').size(size);
            },
            esriSMSSquare({ size }) {
                return draw.path('M 0,0 20,0 20,20 0,20 Z').size(size);
            }
        };

        // jscs:enable requireSpacesInAnonymousFunctionExpression

        // line dash styles
        const ESRI_DASH_MAPS = {
            esriSLSSolid: 'none',
            esriSLSDash: '5.333,4',
            esriSLSDashDot: '5.333,4,1.333,4',
            esriSLSLongDashDotDot: '10.666,4,1.333,4,1.333,4',
            esriSLSDot: '1.333,4',
            esriSLSLongDash: '10.666,4',
            esriSLSLongDashDot: '10.666,4,1.333,4',
            esriSLSShortDash: '5.333,1.333',
            esriSLSShortDashDot: '5.333,1.333,1.333,1.333',
            esriSLSShortDashDotDot: '5.333,1.333,1.333,1.333,1.333,1.333',
            esriSLSShortDot: '1.333,1.333',
            esriSLSNull: 'none'
        };

        // default stroke style
        const DEFAULT_STROKE = {
            color: '#000',
            opacity: 1,
            width: 1,
            linecap: 'square',
            linejoin: 'miter',
            miterlimit: 4
        };

        // this is a null outline in case a supplied symbol doesn't have one
        const DEFAULT_OUTLINE = {
            color: [0, 0, 0, 0],
            width: 0,
            style: ESRI_DASH_MAPS.esriSLSNull
        };

        // 5x5 px patter with coloured diagonal lines
        const esriSFSFills = {
            esriSFSSolid: (symbolColour: any) => {
                return {
                    color: symbolColour.colour,
                    opacity: symbolColour.opacity
                };
            },
            esriSFSNull: () => 'transparent',
            esriSFSHorizontal: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 5;

                // patter fill: horizonal line in a 5x5 px square
                return draw.pattern(cellSize, cellSize, add =>
                    add.line(0, cellSize / 2, cellSize, cellSize / 2)).stroke(symbolStroke);
            },
            esriSFSVertical: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 5;

                // patter fill: vertical line in a 5x5 px square
                return draw.pattern(cellSize, cellSize, add =>
                    add.line(cellSize / 2, 0, cellSize / 2, cellSize)).stroke(symbolStroke);
            },
            esriSFSForwardDiagonal: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 5;

                // patter fill: forward diagonal line in a 5x5 px square; two more diagonal lines offset to cover the corners when the main line is cut off
                return draw.pattern(cellSize, cellSize, add => {
                    add.line(0, 0, cellSize, cellSize).stroke(symbolStroke);
                    add.line(0, 0, cellSize, cellSize).move(0, cellSize).stroke(symbolStroke);
                    add.line(0, 0, cellSize, cellSize).move(cellSize, 0).stroke(symbolStroke);
                });
            },
            esriSFSBackwardDiagonal: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 5;

                // patter fill: backward diagonal line in a 5x5 px square; two more diagonal lines offset to cover the corners when the main line is cut off
                return draw.pattern(cellSize, cellSize, add => {
                    add.line(cellSize, 0, 0, cellSize).stroke(symbolStroke);
                    add.line(cellSize, 0, 0, cellSize).move(cellSize / 2, cellSize / 2).stroke(symbolStroke);
                    add.line(cellSize, 0, 0, cellSize).move(-cellSize / 2, -cellSize / 2).stroke(symbolStroke);
                });
            },
            esriSFSCross: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 5;

                // patter fill: horizonal and vertical lines in a 5x5 px square
                return draw.pattern(cellSize, cellSize, add => {
                    add.line(cellSize / 2, 0, cellSize / 2, cellSize).stroke(symbolStroke);
                    add.line(0, cellSize / 2, cellSize, cellSize / 2).stroke(symbolStroke);
                });
            },
            esriSFSDiagonalCross: (_symbolColour: Object, symbolStroke: svgjs.StrokeData) => {
                const cellSize = 7;

                // patter fill: crossing diagonal lines in a 7x7 px square
                return draw.pattern(cellSize, cellSize, add => {
                    add.line(0, 0, cellSize, cellSize).stroke(symbolStroke);
                    add.line(cellSize, 0, 0, cellSize).stroke(symbolStroke);
                });
            }
        };

        // TODO this is using server symbol definitions. we might need to adjust to use ESRI JS API defs.
        //      e.g. esriSMS() would become [simple-marker]()
        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        const symbolTypes = {
            esriSMS() { // ESRI Simple Marker Symbol
                const symbolColour: any = parseEsriColour(symbol.color);

                symbol.outline = symbol.outline || DEFAULT_OUTLINE;
                const outlineColour: any = parseEsriColour(symbol.outline.color);
                const outlineStroke = makeStroke({
                    color: outlineColour.colour,
                    opacity: outlineColour.opacity,
                    width: symbol.outline.width,
                    dasharray: ESRI_DASH_MAPS[symbol.outline.style]
                });

                // make an ESRI simple symbol and apply fill and outline to it
                const marker = esriSimpleMarkerSimbol[symbol.style](symbol)
                    .fill({
                        color: symbolColour.colour,
                        opacity: symbolColour.opacity
                    })
                    .stroke(outlineStroke)
                    .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER)
                    .rotate(symbol.angle || 0);

                this.fitInto(marker, this.CONTENT_SIZE);
            },
            esriSLS() { // ESRI Simple Line Symbol
                const lineColour: any = parseEsriColour(symbol.color);
                const lineStroke = makeStroke({
                    color: lineColour.colour,
                    opacity: lineColour.opacity,
                    width: symbol.width,
                    linecap: 'butt',
                    dasharray: ESRI_DASH_MAPS[symbol.style]
                });

                const min = this.CONTENT_PADDING;
                const max = this.CONTAINER_SIZE - this.CONTENT_PADDING;
                draw.line(min, min, max, max)
                    .stroke(lineStroke);
            },
            esriCLS() {  // ESRI Fancy Line Symbol
                this.esriSLS();
            },
            esriSFS() { // ESRI Simple Fill Symbol
                const symbolColour: any = parseEsriColour(symbol.color);
                const symbolStroke = makeStroke({
                    color: symbolColour.colour,
                    opacity: symbolColour.opacity
                });
                const symbolFill = esriSFSFills[symbol.style](symbolColour, symbolStroke);

                symbol.outline = symbol.outline || DEFAULT_OUTLINE;
                const outlineColour: any = parseEsriColour(symbol.outline.color);
                const outlineStroke = makeStroke({
                    color: outlineColour.colour,
                    opacity: outlineColour.opacity,
                    width: symbol.outline.width,
                    linecap: 'butt',
                    dasharray: ESRI_DASH_MAPS[symbol.outline.style]
                });

                draw.rect(this.CONTENT_SIZE, this.CONTENT_SIZE)
                    .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER)
                    .fill(symbolFill)
                    .stroke(outlineStroke);
            },

            esriTS() {
                console.error('no support for feature service legend of text symbols');
            },

            esriPFS() { // ESRI Picture Fill Symbol
                // imageUri can be just an image url is specified or a dataUri string
                const imageUri = symbol.imageData ? `data:${symbol.contentType};base64,${symbol.imageData}` : symbol.url;

                const imageWidth = symbol.width * symbol.xscale;
                const imageHeight = symbol.height * symbol.yscale;

                symbol.outline = symbol.outline || DEFAULT_OUTLINE;
                const outlineColour: any = parseEsriColour(symbol.outline.color);
                const outlineStroke = makeStroke({
                    color: outlineColour.colour,
                    opacity: outlineColour.opacity,
                    width: symbol.outline.width,
                    dasharray: ESRI_DASH_MAPS[symbol.outline.style]
                });

                const picturePromise = this.gapi.utils.shared.convertImagetoDataURL(imageUri)
                    .then((imageUri: string) => {
                        // make a fill from a tiled image
                        const symbolFill = draw.pattern(imageWidth, imageHeight, add =>

                            // there was a 4th argument 'true' here before, but maximum 3 are accepted. may need to look into this
                            add.image(imageUri, imageWidth, imageHeight));

                        draw.rect(this.CONTENT_SIZE, this.CONTENT_SIZE)
                            .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER)
                            .fill(symbolFill)
                            .stroke(outlineStroke);
                    });

                return picturePromise;
            },

            esriPMS() { // ESRI PMS? Picture Marker Symbol
                // imageUri can be just an image url is specified or a dataUri string
                const imageUri = symbol.imageData ? `data:${symbol.contentType};base64,${symbol.imageData}` : symbol.url;

                // need to draw the image to get its size (technically not needed if we have a url, but this is simpler)
                const picturePromise = this.gapi.utils.shared.convertImagetoDataURL(imageUri)
                    .then((imageUri: string) =>
                        this.svgDrawImage(draw, imageUri))
                    .then(({ image }) => {
                        image
                            .center(this.CONTAINER_CENTER, this.CONTAINER_CENTER)
                            .rotate(symbol.angle || 0);

                        // scale image to fit into the symbology item container
                        this.fitInto(image, this.CONTENT_IMAGE_SIZE);
                    });

                return picturePromise;
            }
        };

        // jscs:enable requireSpacesInAnonymousFunctionExpression

        // console.log(symbol.type, label, '--START--');
        // console.log(symbol);

        try {
            await Promise.resolve(symbolTypes[symbol.type]());
            // console.log(symbol.type, label, '--DONE--');
            // remove element from the page
            window.document.body.removeChild(container);
            return draw.svg();
        }
        catch (error) {
            console.log(error);
            return ''; // TODO hardcode a warning icon? a blank white square?
        }

        /**
         * Creates a stroke style by applying custom rules to the default stroke.
         * @param {Object} overrides any custom rules to apply on top of the defaults
         * @return {Object} a stroke object
         * @private
         */
        function makeStroke(overrides: Object): Object {
            return Object.assign({}, DEFAULT_STROKE, overrides);
        }

        /**
         * Convert an ESRI colour object to SVG rgb format.
         * @private
         * @param  {Array} c ESRI Colour array
         * @return {Object} colour and opacity in SVG format
         */
        function parseEsriColour(c: Array<number>): Object {
            if (c) {
                return {
                    colour: `rgb(${c[0]},${c[1]},${c[2]})`,
                    opacity: c[3] / 255
                };
            } else {
                return {
                    colour: 'rgb(0, 0, 0)',
                    opacity: 0
                };
            }
        }
    }

    /**
     * Renders a specified image on an svg element. This is a helper function that wraps around async `draw.image` call in the svg library.
     *
     * @function svgDrawImage
     * @private
     * @param {Object} draw svg element to render the image onto
     * @param {String} imageUri image url or dataURL of the image to render
     * @param {Number} width [optional = 0] width of the image
     * @param {Number} height [optional = 0] height of the image
     * @param {Boolean} crossOrigin [optional = true] specifies if the image should be loaded as crossOrigin
     * @return {Promise} promise resolving with the loaded image and its loader object (see svg.js http://documentup.com/wout/svg.js#image for details)
     */
    svgDrawImage(draw: any, imageUri: string, width: number = 0, height: number = 0, crossOrigin: boolean = true): Promise<any> {
        const promise = new Promise((resolve, reject) => {
            const image = draw.image(imageUri, width, height, crossOrigin)
                .loaded((loader: any) =>
                    resolve({ image, loader }))
                .error((err: any) => {
                    reject(err);
                    console.error(err);
                });
        });

        return promise;
    }

    /**
     * Fits svg element in the size specified
     * @param {Object} element svg element to fit
     * @param {Number} CONTAINER_SIZE width/height of a container to fit the element into
     */
    fitInto(element: any, CONTAINER_SIZE: number): void {
        // const elementRbox = element.rbox();
        // const elementRbox = element.screenBBox();

        const elementRbox = element.node.getBoundingClientRect(); // marker.rbox(); //rbox doesn't work properly in Chrome for some reason
        const scale = CONTAINER_SIZE / Math.max(elementRbox.width, elementRbox.height);
        if (scale < 1) {
            element.scale(scale);
        }
    }

    /**
     * Generate a legend object based on an ESRI renderer.
     * @private
     * @param  {Object} renderer an ESRI renderer object in server JSON form
     * @return {Array} list of legend symbologies
     */
    rendererToLegend(renderer: BaseRenderer): Array<LegendSymbology> {

        const legendCollater: {[key: string]: Array<BaseSymbolUnit>} = {};

        // put all symbol units from the renderer in one nice array
        const allRendererSUs: Array<BaseSymbolUnit> = renderer.symbolUnits.slice(0); // make a copy
        if (renderer.defaultUnit) {
            allRendererSUs.push(renderer.defaultUnit);
        }

        // collate the symbol units by the label. this collapses complex definitions into a nice looking legend.
        // e.g. a renderer has SU for 'type=X' and 'type=Y', both with label 'Fun Stuff'. This merges the logic into
        // one line on the legend for Fun Stuff!
        allRendererSUs.forEach(su => {
            if (legendCollater[su.label]) {
                // not the first time we hit this label. add to the list
                legendCollater[su.label].push(su);
            } else {
                legendCollater[su.label] = [su];
            }
        });

        // TODO this code will return the legend array in the order that object.keys presents the keys.
        //      we may need to add some additional logic to enforce a different order.
        //      e.g. alphabetical by label, with default being last.
        //           alphabetical by label, default not treated special.
        //           same order as renderer's array, with default being last.

        // iterate through the unique keys in the collater. process each legend item
        return Object.keys(legendCollater).map((lbl: string) => {
            const suSet = legendCollater[lbl];
            const legendSym: LegendSymbology = {
                label: lbl || '',
                definitionClause: suSet.length === 1 ? suSet[0].definitionClause : `(${suSet.join(' OR ')})`,
                svgcode: '', // TODO is '' ok? maybe we need white square svg? or some loading icon?
                drawPromise: this.symbolToSvg(suSet[0].symbol).then(svg => {
                    // update the legend symbol object
                    legendSym.svgcode = svg;

                    // update the renderer symbol units
                    suSet.forEach(su => {
                        su.svgCode = svg;
                    });
                })
            };
            return legendSym;
        });

    }

    /**
     * Returns the legend information of an ESRI map service.
     *
     * @function getMapServerLegend
     * @private
     * @param  {String} layerUrl service url (root service, not indexed endpoint)
     * @returns {Promise} resolves in an array of legend data
     *
     */
    getMapServerLegend(layerUrl: string): Promise<any> {

        // standard json request with error checking
        const defService = this.esriBundle.esriRequest({
            url: `${layerUrl}/legend`,
            content: { f: 'json' },
            callbackParamName: 'callback',
            handleAs: 'json',
        });

        // wrap in promise to contain dojo deferred
        // TODO this probably needs to be updated with the new return value structure of esriRequest
        return new Promise((resolve, reject) => {
            defService.then((srvResult: any) => {

                if (srvResult.error) {
                    reject(srvResult.error);
                } else {
                    resolve(srvResult);
                }
            }, (error: any) => {
                reject(error);
            });
        });

    }

    /**
     * Our symbology engine works off of renderers. When dealing with layers with no renderers,
     * we need to take server-side legend and convert it to a fake renderer, which lets us
     * leverage all the existing symbology code.
     *
     * @function mapServerLegendToRenderer
     * @private
     * @param {Object} serverLegend legend json from an esri map server
     * @param {Integer} layerIndex  the index of the layer in the legend we are interested in
     * @returns {Object} a fake unique value renderer based off the legend
     *
     */
    mapServerLegendToRenderer(serverLegend: any, layerIndex: number): BaseRenderer {
        const layerLegend = serverLegend.layers.find((l: any) => {
            return l.layerId === layerIndex;
        });

        // when no layer has been found it can be a layer whitout a legend like annotation layer
        // in this case, do not apply a renderer
        let renderer: Object;
        if (!this.isUn(layerLegend)) {
            // make the mock renderer

            renderer = {
                type: 'uniqueValue',
                field: 'fakefield',
                uniqueValueInfos: layerLegend.legend.map((ll: any) => {
                    return {
                        label: ll.label,
                        value: ll.label,
                        symbol: {
                            type: 'esriPMS',
                            imageData: ll.imageData,
                            contentType: ll.contentType
                        }
                    };
                })
            };

            // ok to pass empty array. this renderer will only be used to
            return this.makeRenderer(this.esriBundle.rendererUtils.fromJSON(renderer), [], true);

        } else {
            // TODO does this case ever exist? need to figure out a way to encode this in our official renderer objects
            // renderer = { type: this.NONE };
            throw new Error('attempted to make renderer from non-existing legend data'); // so basically if this error hits, we need to write some new code
        }
    }

    /**
     * Our symbology engine works off of renderers. When dealing with layers with no renderers,
     * we need to take server-side legend and convert it to a fake renderer, which lets us
     * leverage all the existing symbology code.
     *
     * Same as mapServerLegendToRenderer function but combines all layer renderers.
     *
     * @function mapServerLegendToRendererAll
     * @private
     * @param {Object} serverLegend legend json from an esri map server
     * @returns {Object} a fake unique value renderer based off the legend
     */
    mapServerLegendToRendererAll(serverLegend: any): BaseRenderer {

        // TODO potential problem. if we have multiple layers with same label but different
        //      symbols, they will get combined in the legend making process.
        //      the esri Renderer.fromJSON might also get snarky at having two identical values
        //      in the renderer. for the snark, we can append the layer id or something
        //      (the value is never used as we set the falseRenderer flag)

        const layerRenders = serverLegend.layers.map((layer: any) =>
            layer.legend.map((layerLegend: any) => ({
                label: layerLegend.label,
                value: layerLegend.label,
                symbol: {
                    type: 'esriPMS',
                    imageData: layerLegend.imageData,
                    contentType: layerLegend.contentType
                }
            }))
        );

        const fullRenderer = {
            type: 'uniqueValue',
            field: 'fakefield',
            uniqueValueInfos: [].concat(...layerRenders)
        };

        return this.makeRenderer(this.esriBundle.rendererUtils.fromJSON(fullRenderer), [], true);
    }

    /**
     * Orchestrator function that will:
     * - Fetch a legend from an esri map server
     * - Extract legend for a specific sub layer
     * - Convert server legend to a temporary renderer
     * - Convert temporary renderer to a viewer-formatted legend (return value)
     *
     * @function mapServerToLocalLegend
     * @param {String}    mapServerUrl  service url (root service, not indexed endpoint)
     * @param {Integer}   [layerIndex]  the index of the layer in the legend we are interested in. If not provided, all layers will be collapsed into a single legend
     * @returns {Promise} resolves in a viewer-compatible legend for the given server and layer index
     *
     */
    async mapServerToLocalLegend(mapServerUrl: string, layerIndex: number | string): Promise<any> {

        // get esri legend from server

        const serverLegendData = await this.getMapServerLegend(mapServerUrl);
        // derive renderer for specified layer
        let fakeRenderer: BaseRenderer;
        let intIndex: number;
        if (this.isUn(layerIndex)) {
            intIndex = 0;
            fakeRenderer = this.mapServerLegendToRendererAll(serverLegendData);
        }
        else {
            intIndex = parseInt((<string>layerIndex)); // sometimes a stringified value comes in. careful now.
            fakeRenderer = this.mapServerLegendToRenderer(serverLegendData, intIndex);
        }
        // convert renderer to viewer specific legend
        return this.rendererToLegend(fakeRenderer);

    }
}
