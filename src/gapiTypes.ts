// TODO add proper comments
// TODO after all the stuff has been dumped in here, re-organize the order into logical sections

import esri = __esri; // magic command to get ESRI JS API type definitions.
import MapModule from './map/MapModule';
import LayerModule from './layer/LayerModule';
import UtilModule from './util/UtilModule';

// gapi loader needs to be a oneshot default due to magic (something about module load being dependant on dojo script load [waves hands, points at Aly]).
// so putting the types here so they can be shared around

export interface DojoWindow extends Window {
    require?: any;  // require is both a function, and has event handlers. probably a way to define in typescript interface, not going to right now.
}

// contains the dojo modules
// Uppercase properties are classes
// Lowercase properties are utility modules
export class EsriBundle {
    // MAPS
    Basemap: esri.BasemapConstructor;
    BasemapGallery: esri.BasemapGalleryConstructor;
    Map: esri.MapConstructor;
    MapView: esri.MapViewConstructor;
    ScaleBar: esri.ScaleBarConstructor;

    // LAYERS
    FeatureLayer: esri.FeatureLayerConstructor;
    Field: esri.FieldConstructor;
    GeoJSONLayer: esri.GeoJSONLayerConstructor;
    GraphicsLayer: esri.GraphicsLayerConstructor;
    ImageParameters: esri.ImageParametersConstructor;
    ImageryLayer: esri.ImageryLayerConstructor; // formerly known as ArcGISImageServiceLayer
    MapImageLayer: esri.MapImageLayerConstructor; // formerly known as ArcGISDynamicMapServiceLayer
    Sublayer: esri.SublayerConstructor; // formerly known as LayerDrawingOptions
    TileLayer: esri.TileLayerConstructor; // formerly known as ArcGISTiledMapServiceLayer
    WMSLayer: esri.WMSLayerConstructor;
    WMSSublayer: esri.WMSSublayerConstructor;

    // GEOMETRY & GRAPHICS
    Extent: esri.ExtentConstructor;
    Graphic: esri.GraphicConstructor;
    Multipoint: esri.MultipointConstructor;
    Point: esri.PointConstructor;
    Polygon: esri.PolygonConstructor;
    Polyline: esri.PolylineConstructor;
    SpatialReference: esri.SpatialReferenceConstructor;

    // SYMBOLS & RENDERERS
    ClassBreaksRenderer: esri.ClassBreaksRendererConstructor;
    PictureMarkerSymbol: esri.PictureMarkerSymbolConstructor;
    SimpleFillSymbol: esri.SimpleFillSymbolConstructor;
    SimpleLineSymbol: esri.SimpleLineSymbolConstructor;
    SimpleMarkerSymbol: esri.SimpleMarkerSymbolConstructor;
    SimpleRenderer: esri.SimpleRendererConstructor;
    symbolJsonUtils: esri.symbolsSupportJsonUtils;
    UniqueValueRenderer: esri.UniqueValueRendererConstructor;

    // SERVICES
    GeometryService: esri.GeometryServiceConstructor;
    IdentifyParameters: esri.IdentifyParametersConstructor;
    IdentifyTask: esri.IdentifyTaskConstructor;
    PrintParameters: esri.PrintParametersConstructor;
    PrintTask: esri.PrintTaskConstructor;
    PrintTemplate: esri.PrintTemplateConstructor;
    ProjectParameters: esri.ProjectParametersConstructor;
    Query: esri.QueryConstructor;
    QueryTask: esri.QueryTaskConstructor;

    // MISC. ESRI & DOJO
    Color: esri.ColorConstructor;
    dojoQuery: dojo.query;
    esriConfig: esri.config;
    esriRequest: Function; // esri.request; // TODO figure out how to do this.  the esri.request doesn't align right with what dojo spits back. if it has to be a function, add the types to the signature
}

// TODO might be worth making this a class or a generator function with defaults.  dont know what the impact of making all properties optonal is.
// TODO figure out best way of managing classes.  e.g. fakeNewsMaps needs to import that file, but that file imports this.
// Might also make sense to have this interface in it's own file?  Its the more public of interfaces.
export interface GeoApi {
    esriBundle: EsriBundle; // push inside a dev module?
    maps: MapModule;
    layers: LayerModule;
    utils: UtilModule;
    dev?: any;
    // agol?: any;
    shared?: any;
    // query?: any;
    // events?: any;
    highlight?: any;

    // TODO add module names as we import them

    fakeNewsMaps?: any; // TODO remove after real maps are implemented
}

// used to pass reference information into class constructors. saves us from having two parameters. value!
export interface InfoBundle {
    esriBundle: EsriBundle;
    api: GeoApi;
}

export enum LayerState { // these are used as css classes; hence the `rv` prefix
    NEW = 'rv-new',
    REFRESH = 'rv-refresh',
    LOADING = 'rv-loading',
    LOADED = 'rv-loaded',
    ERROR = 'rv-error'
}

// a collection of attributes
export interface AttributeSet {
    features: Array<any>;
    oidIndex?: {[key: string]: number}; // TODO check if we're relly using the index enough to make it worth keeping
}

export interface ArcGisServerUrl {
    rootUrl: string;
    index: number;
}

export interface RampLayerStateConfig {
    visibility?: boolean;
    opacity?: number;
}

export interface RampLayerFieldMetadataConfig {
    data?: string;
    alias?: string;
}

export interface RampLayerConfig {
    id?: string;
    url?: string;
    name?: string;
    state?: RampLayerStateConfig;
    customRenderer?: any; // TODO expand, if worth it. fairly complex object
    refreshInterval?: number;
    initialFilteredQuery?: string;
    fieldMetadata?: Array<RampLayerFieldMetadataConfig>;
    nameField?: string;
    tooltipField?: string;
}