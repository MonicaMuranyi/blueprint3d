/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../model/floorplan.ts" />
/// <reference path="define_zones_view.ts" />
/// <reference path="../model/floor_zone.ts" />

module BP3D.Floorplanner {

  // grid parameters
  const floorZoneSpacingX = Core.Configuration.getNumericValue(Core.floorZoneSpacingX); // pixels
  const floorZoneSpacingY = Core.Configuration.getNumericValue(Core.floorZoneSpacingY); // pixels

  /** 
   * The DefineZones implements an interactive tool for defining zones on the floorplan.
   */
  export class DefineZones {

    /** */
    public originX = 0;

    /** */
    public originY = 0;

    /** drawing state */
    public targetX = 0;

    /** drawing state */
    public targetY = 0;

    /** */
    private modeResetCallbacks = $.Callbacks();

    /** */
    private canvasElement;

    private floorZonesContextMenuElement;
    /** */
    private view: DefineZonesView;

    /** */
    private mouseDown = false;

    /** */
    private mouseMoved = false;

    /** in ThreeJS coords */
    private mouseX = 0;

    /** in ThreeJS coords */
    private mouseY = 0;

    /** in ThreeJS coords */
    private rawMouseX = 0;

    /** in ThreeJS coords */
    private rawMouseY = 0;

    /** mouse position at last click */
    private lastX = 0;

    /** mouse position at last click */
    private lastY = 0;

    /** */
    private cmPerPixel: number;

    /** */
    private pixelsPerCm: number;

    /** the current floor zone */
    private currentFloorZone: Model.FloorZone;

    /** */
    constructor(canvas: string, floorZonesContextMenu: string, private floorplan: Model.Floorplan) {

      this.canvasElement = $("#" + canvas);

      var cmPerFoot = 30.48;
      var pixelsPerFoot = 15.0;
      this.cmPerPixel = cmPerFoot * (1.0 / pixelsPerFoot);
      this.pixelsPerCm = 1.0 / this.cmPerPixel;

      // Initialization:

      var scope = this;

      this.newCurrentFloorZone();

      this.canvasElement.mousedown(() => {
        scope.mousedown();
      });
      this.canvasElement.mousemove((event) => {
        scope.mousemove(event);
      });
      this.canvasElement.mouseup(() => {
        scope.mouseup();
      });
      this.canvasElement.mouseleave(() => {
        scope.mouseleave();
      });

      floorplan.roomLoadedCallbacks.add(() => {
        scope.reset();
      });

      this.view = new DefineZonesView(this.floorplan, this, canvas, floorZonesContextMenu);
    }

    public getFloorZones() {
      return this.floorplan.getFloorZones();
    }

    public getCurrentFloorZone() {
      return this.currentFloorZone; 
    }

    public saveCurrentFloorZone(name: string) {
      this.currentFloorZone.setName(name);
      this.floorplan.addFloorZone(this.currentFloorZone);
      this.newCurrentFloorZone();
    }

    public removeFloorZone(id: string) {
      return this.floorplan.removeFloorZone(id); 
    }

    private newCurrentFloorZone() {
      this.currentFloorZone = new Model.FloorZone('New Floor Zone', Core.Utils.generateColor());
    }

    private updateTarget() {
      this.targetX = this.mouseX;
      this.targetY = this.mouseY;
      this.view.draw();
    }

    private mousedown() {
      this.mouseDown = true;
      this.mouseMoved = false;
      this.lastX = this.rawMouseX;
      this.lastY = this.rawMouseY;
    }

    private mousemove(event) {
      this.mouseMoved = true;

      // update mouse
      this.rawMouseX = event.clientX;
      this.rawMouseY = event.clientY;

      this.mouseX = (event.clientX - this.canvasElement.offset().left) * this.cmPerPixel + this.originX * this.cmPerPixel;
      this.mouseY = (event.clientY - this.canvasElement.offset().top) * this.cmPerPixel + this.originY * this.cmPerPixel;

      this.updateTarget();

      // Dragging
      /*if (this.mouseDown) {
        this.originX += (this.lastX - this.rawMouseX);
        this.originY += (this.lastY - this.rawMouseY);
        this.lastX = this.rawMouseX;
        this.lastY = this.rawMouseY;
        this.view.draw();
      }*/
    }

    private mouseup() {

      // Not dragging
      if (this.mouseDown && !this.mouseMoved) {
        const col = Math.floor(this.convertX(this.targetX) / floorZoneSpacingX);
        const row = Math.floor(this.convertY(this.targetY) / floorZoneSpacingY);

        // Verify if the tile does not belong to another zone
        let found = false;
        this.floorplan.getFloorZones().forEach((floorZone) => {
          floorZone.getFloorTiles().forEach((floorTile) => {
            if (floorTile.getRow() === row && floorTile.getCol() === col) {
              found = true;
            }
          });
        });
        if (!found) {
          this.currentFloorZone.toggleTile(new Model.FloorTile(row, col));
          this.view.draw();
        }
        this.mouseDown = false;
      }
    }

    private mouseleave() {
      this.mouseDown = false;
    }

    private reset() {
      this.resizeView();
      this.resetOrigin();
      this.view.renderFloorZoneControls();
      this.view.draw();
    }

    private resizeView() {
      this.view.handleWindowResize();
    }

    /** Sets the origin so that floorplan is centered */
    private resetOrigin() {
      var centerX = this.canvasElement.innerWidth() / 2.0;
      var centerY = this.canvasElement.innerHeight() / 2.0;
      var centerFloorplan = this.floorplan.getCenter();
      this.originX = centerFloorplan.x * this.pixelsPerCm - centerX;
      this.originY = centerFloorplan.z * this.pixelsPerCm - centerY;
    }

    /** Convert from THREEjs coords to canvas coords. */
    public convertX(x: number): number {
      return (x - this.originX * this.cmPerPixel) * this.pixelsPerCm;
    }

    /** Convert from THREEjs coords to canvas coords. */
    public convertY(y: number): number {
      return (y - this.originY * this.cmPerPixel) * this.pixelsPerCm;
    }
  }
}