import esri = __esri;
import { EsriBundle } from './gapiTypes';

export class FakeNewsMap {

    // TODO consider private?
    innerMap: esri.Map;
    innerView: esri.MapView;

    constructor (esriBundle: EsriBundle, targetDiv: string) {
        this.innerMap = new esriBundle.Map({
            basemap: 'topo'
          });

          this.innerView = new esriBundle.MapView({
            map: this.innerMap,
            container: targetDiv,
            center: [-76.772, 44.423],
            zoom: 10
          });
    }

    addLayer (): void {

    }
}

export class FakeNewsMapModule {
    esriBundle: EsriBundle;

    constructor (esriBundle: EsriBundle) {
        this.esriBundle = esriBundle;
    }

    makeMap(targetDiv: string): FakeNewsMap {
        const map: FakeNewsMap = new FakeNewsMap(this.esriBundle, targetDiv);
        return map;
    }
}