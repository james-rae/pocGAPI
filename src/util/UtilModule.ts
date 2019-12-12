// This will collate all the util stuff into one endpoint

// this makes the module that gets exposed on GeoAPI under .util(s)
// TODO add proper comments

import esri = __esri;
import { EsriBundle, InfoBundle } from '../gapiTypes';
import BaseBase from '../BaseBase';
import AttributeService from './AttributeService';
import SharedUtils from './SharedUtils';
import QueryService from './QueryService';
import HighlightService from './HighlightService';
import ProjectionService from './ProjectionService';

export default class UtilModule extends BaseBase {

    attributes: AttributeService; // TODO do we want shorter name "attribs" or "attributes"
    shared: SharedUtils;
    query: QueryService;
    highlight: HighlightService;
    proj: ProjectionService;

    constructor (infoBundle: InfoBundle) {
        super(infoBundle);
        this.attributes = new AttributeService(infoBundle);
        this.shared = new SharedUtils(infoBundle);
        this.query = new QueryService(infoBundle);
        this.highlight = new HighlightService(infoBundle);
        this.proj = new ProjectionService(infoBundle);
    }

}