/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../core/configuration.ts" />
/// <reference path="../core/dimensioning.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../model/floorplan.ts" />
/// <reference path="../model/half_edge.ts" />
/// <reference path="../model/model.ts" />
/// <reference path="../model/wall.ts" />
/// <reference path="define_zones.ts" />

module BP3D.Floorplanner {

  // grid parameters
  const gridSpacingX = Core.Configuration.getNumericValue(Core.floorZoneSpacingX); // pixels
  const gridSpacingY = Core.Configuration.getNumericValue(Core.floorZoneSpacingY); // pixels
  const gridWidth = 1;
  const gridColor = "#d1d1d1";

  // room config
  const roomColor = "#f9f9f9";

  // wall config
  const wallWidth = 5;
  const wallWidthHover = 7;
  const wallColor = "#dddddd"
  const edgeColor = "#888888"
  const edgeWidth = 1;

  /**
   * The View to be used by a Floorplanner to render in/interact with.
   */
  export class DefineZonesView {

    /** The canvas element. */
    private canvasElement: HTMLCanvasElement;

    /** The 2D context. */
    private context;

    /** The context menu. */
    private floorZoneControlsMenu;

    /** */
    constructor(private floorplan: Model.Floorplan, private viewmodel: DefineZones, private canvas: string,
      private floorZonesContextMenu: string) {
      this.canvasElement = <HTMLCanvasElement>document.getElementById(canvas);
      this.context = this.canvasElement.getContext('2d');
      this.floorZoneControlsMenu = $("#" + floorZonesContextMenu);

      var scope = this;
      $(window).resize(() => {
        scope.handleWindowResize();
      });
      this.handleWindowResize();

      this.renderFloorZoneControls();
    }

    public renderFloorZoneControls = function() {
      var scope = this;

      scope.floorZoneControlsMenu.empty();
      const floorZones = this.floorplan.getFloorZones();

      const removeFloorZone = function (id) {
        scope.viewmodel.removeFloorZone(id);
        scope.renderFloorZoneControls();
        scope.draw();
      }

      const saveCurrentFloorZone = function (name) {
        scope.viewmodel.saveCurrentFloorZone(name);
        scope.renderFloorZoneControls();
        scope.draw();
      }
      this.floorplan.getFloorZones().forEach((floorZone) => {
        scope.floorZoneControlsMenu.append('<div class="zone-control" data-id="' +
          floorZone.getId() + '"><span class="color-box" style="background-color: ' + floorZone.getColor() +
          ';"></span><span class="zone-name">' +
          floorZone.getName() + '</span>' +
          '<span class="glyphicon glyphicon-remove"></span>' +
        '</div>');
      });
      const currentZoneName = scope.viewmodel.getCurrentFloorZone().getName();
      const currentZoneColor= scope.viewmodel.getCurrentFloorZone().getColor();
      scope.floorZoneControlsMenu.append('<div class="zone-control"><span class="color-box" style="background-color: ' + currentZoneColor +
          ';"></span><input type="text" value="' +
          currentZoneName + '"/>' +
          '<span class="glyphicon glyphicon-ok"></span>' +
        '</div>');
      scope.floorZoneControlsMenu.find(".glyphicon-remove").click(function() {
        var id = $(this).parent().data('id');
        removeFloorZone(id);
      });
      scope.floorZoneControlsMenu.find(".glyphicon-ok").click(function() {
        saveCurrentFloorZone($(this).parent().find('input').val());
      });
    }

    public handleWindowResize() {
      var canvasSel = $("#" + this.canvas);
      var parent = canvasSel.parent();
      canvasSel.height(parent.innerHeight());
      canvasSel.width(parent.innerWidth());
      this.canvasElement.height = parent.innerHeight();
      this.canvasElement.width = parent.innerWidth();
      this.draw();
    }

    public draw() {
      this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

      this.floorplan.getRooms().forEach((room) => {
        this.drawRoom(room);
      });

      var offsetX = this.calculateGridOffset(-this.viewmodel.originX);
      var offsetY = this.calculateGridOffset(-this.viewmodel.originY);
      var width = this.canvasElement.width;
      var height = this.canvasElement.height;

      this.drawGrid(offsetX, offsetY, width, height);

      this.floorplan.getWalls().forEach((wall) => {
        this.drawWall(wall);
      });

      this.floorplan.getWalls().forEach((wall) => {
        this.drawWallLabels(wall);
      });

      this.floorplan.getFloorZones().forEach((floorZone) => {
        floorZone.getFloorTiles().forEach((floorTile) => {
          this.drawTileByIntegerCoordinates(floorTile.getRow(), floorTile.getCol(), floorZone.getColor());
        });
      });
      this.viewmodel.getCurrentFloorZone().getFloorTiles().forEach((floorTile) => {
        this.drawTileByIntegerCoordinates(floorTile.getRow(), floorTile.getCol(),
          this.viewmodel.getCurrentFloorZone().getColor());
      });

      this.drawTile(this.viewmodel.targetX, this.viewmodel.targetY, this.viewmodel.getCurrentFloorZone().getColor());
    }

    private drawWallLabels(wall: Model.Wall) {
      if (wall.backEdge && wall.frontEdge) {
        if (wall.backEdge.interiorDistance < wall.frontEdge.interiorDistance) {
          this.drawEdgeLabel(wall.backEdge);
        } else {
          this.drawEdgeLabel(wall.frontEdge);
        }
      } else if (wall.backEdge) {
        this.drawEdgeLabel(wall.backEdge);
      } else if (wall.frontEdge) {
        this.drawEdgeLabel(wall.frontEdge);
      }
    }

    private drawWall(wall: Model.Wall) {
      var color = wallColor;
      this.drawLine(
        this.viewmodel.convertX(wall.getStartX()),
        this.viewmodel.convertY(wall.getStartY()),
        this.viewmodel.convertX(wall.getEndX()),
        this.viewmodel.convertY(wall.getEndY()),
        wallWidth,
        color
      );
      if (wall.frontEdge) {
        this.drawEdge(wall.frontEdge);
      }
      if (wall.backEdge) {
        this.drawEdge(wall.backEdge);
      }
    }

    private drawEdgeLabel(edge: Model.HalfEdge) {
      var pos = edge.interiorCenter();
      var length = edge.interiorDistance();
      if (length < 60) {
        // dont draw labels on walls this short
        return;
      }
      this.context.font = "normal 12px Arial";
      this.context.fillStyle = "#000000";
      this.context.textBaseline = "middle";
      this.context.textAlign = "center";
      this.context.strokeStyle = "#ffffff";
      this.context.lineWidth = 4;

      this.context.strokeText(Core.Dimensioning.cmToMeasure(length),
        this.viewmodel.convertX(pos.x),
        this.viewmodel.convertY(pos.y));
      this.context.fillText(Core.Dimensioning.cmToMeasure(length),
        this.viewmodel.convertX(pos.x),
        this.viewmodel.convertY(pos.y));
    }

    private drawTile(x: number, y: number, color: string) {
      const col = Math.floor(this.viewmodel.convertX(x) / gridSpacingX);
      const row = Math.floor(this.viewmodel.convertY(y) / gridSpacingY);
      this.drawTileByIntegerCoordinates(row, col, color);
    }

    private drawTileByIntegerCoordinates(row: number, col: number, color: string) {
      this.drawPolygon(
        [col * gridSpacingX, (col + 1)  * gridSpacingX, (col + 1) * gridSpacingX, col * gridSpacingX],
        [row * gridSpacingY, row * gridSpacingY, (row + 1) * gridSpacingY, (row + 1) * gridSpacingY],
        true,
        color,
        true,
        color,
        1
      );
    }

    private drawEdge(edge: Model.HalfEdge) {
      var color = edgeColor;
      var corners = edge.corners();

      var scope = this;
      this.drawPolygon(
        Core.Utils.map(corners, function (corner) {
          return scope.viewmodel.convertX(corner.x);
        }),
        Core.Utils.map(corners, function (corner) {
          return scope.viewmodel.convertY(corner.y);
        }),
        false,
        null,
        true,
        color,
        edgeWidth
      );
    }

    private drawRoom(room: Model.Room) {
      var scope = this;
      this.drawPolygon(
        Core.Utils.map(room.corners, (corner: Model.Corner) => {
          return scope.viewmodel.convertX(corner.x);
        }),
        Core.Utils.map(room.corners, (corner: Model.Corner) =>  {
          return scope.viewmodel.convertY(corner.y);
        }),
        true,
        roomColor
      );
    }

    private drawLine(startX: number, startY: number, endX: number, endY: number, width: number, color) {
      // width is an integer
      // color is a hex string, i.e. #ff0000
      this.context.beginPath();
      this.context.moveTo(startX, startY);
      this.context.lineTo(endX, endY);
      this.context.lineWidth = width;
      this.context.strokeStyle = color;
      this.context.stroke();
    }

    private drawPolygon(xArr, yArr, fill, fillColor, stroke?, strokeColor?, strokeWidth?) {
      // fillColor is a hex string, i.e. #ff0000
      fill = fill || false;
      stroke = stroke || false;
      this.context.beginPath();
      this.context.moveTo(xArr[0], yArr[0]);
      for (var i = 1; i < xArr.length; i++) {
        this.context.lineTo(xArr[i], yArr[i]);
      }
      this.context.closePath();
      if (fill) {
        this.context.fillStyle = fillColor;
        this.context.fill();
      }
      if (stroke) {
        this.context.lineWidth = strokeWidth;
        this.context.strokeStyle = strokeColor;
        this.context.stroke();
      }
    }

    private drawCircle(centerX, centerY, radius, fillColor) {
      this.context.beginPath();
      this.context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      this.context.fillStyle = fillColor;
      this.context.fill();
    }

    private calculateGridOffset(n) {
      return 0;
    }

    private drawGrid(offsetX, offsetY, width, height) {
      for (var x = 0; x <= (width / gridSpacingX); x++) {
        this.drawLine(gridSpacingX * x + offsetX, 0, gridSpacingX * x + offsetX, height, gridWidth, gridColor);
      }
      for (var y = 0; y <= (height / gridSpacingY); y++) {
        this.drawLine(0, gridSpacingY * y + offsetY, width, gridSpacingY * y + offsetY, gridWidth, gridColor);
      }
    }
  }
}