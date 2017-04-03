/// <reference path="../core/utils.ts" />
/// <reference path="floor_tile.ts" />

module BP3D.Model {

  /** 
   * A Zone is an array of floor tiles.
   */
  export class FloorZone {

    /** */
    private floorTiles: FloorTile[] = [];

    /** */
    constructor(private name: string, private color: string, private id?: string) {
      this.id = id || Core.Utils.guid();
    }

    public getId() {
      return this.id;
    }

    public getName() {
      return this.name;
    }

    public getColor() {
      return this.color;
    }

    public setName(name: string) {
      this.name = name;
    }

    public getFloorTiles() {
      return this.floorTiles;
    }

    /** Removes or adds a new tile to the floor zone. */
    public toggleTile(floorTile: FloorTile) {
      for (var i = 0; i < this.floorTiles.length; ++i) {
        if (this.floorTiles[i].getRow() === floorTile.getRow() &&
            this.floorTiles[i].getCol() === floorTile.getCol()) {
          this.floorTiles.splice(i, 1);
          return;
        }
      }
      // Add the title if it doesn't exist
      this.floorTiles.push(floorTile);
    }
  }
}
