module BP3D.Model {
  /** 
   * A Tile is the basic element of a zone.
   */
  export class FloorTile {

    constructor(private row: number, private col: number) {
    }

    public getRow() {
    	return this.row;
    }

    public getCol() {
    	return this.col;
    }
  }
}
