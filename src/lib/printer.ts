/**
 * This module contains classes for modeling and displaying printer volumes.
 */

import * as THREE from "three";
import * as printer from "./config";
import * as mats from "./materials";

/**
 * Utility class for displaying print volume
 * All dimensions are in mm
 * R-G-B => X-Y-Z
 */
export class PrintVolumeView extends THREE.Group {
  private _bbox: THREE.Box3;

  constructor(width: number, depth: number, height: number) {
    super();
    this.scale.set(width, depth, height);
    this._recalcBBox();
    // this.add(this._pvGroup);
    const planeGeom: THREE.PlaneGeometry = new THREE.PlaneGeometry(1.0, 1.0);
    const planeMaterial = mats.whiteMaterial.clone();
    planeMaterial.side = null;
    // planeMaterial.side = THREE.DoubleSide;
    const bed = new THREE.Mesh(planeGeom, planeMaterial);
    this.add(bed);

    const xlinesPts = [
      new THREE.Vector3(-0.5, 0.5, 0.0),
      new THREE.Vector3(0.5, 0.5, 0.0),
      new THREE.Vector3(-0.5, -0.5, 0.0),
      new THREE.Vector3(0.5, -0.5, 0.0),
    ];
    const xlineGeometry = new THREE.Geometry();
    xlineGeometry.vertices = xlinesPts;
    const xLines1 = new THREE.LineSegments(xlineGeometry.clone(),
      mats.xLineMaterial);
    this.add(xLines1);
    const xLines2 = new THREE.LineSegments(xlineGeometry.clone(),
      mats.xLineMaterial);
    xLines2.position.set(0.0, 0.0, 1.0);
    this.add(xLines2);

    const ylinesPts = [
      new THREE.Vector3(0.5, 0.5, 0.0),
      new THREE.Vector3(0.5, -0.5, 0.0),
      new THREE.Vector3(-0.5, -0.5, 0.0),
      new THREE.Vector3(-0.5, 0.5, 0.0),
    ];
    const ylineGeometry = new THREE.Geometry();
    ylineGeometry.vertices = ylinesPts;
    const yLines1 = new THREE.LineSegments(ylineGeometry.clone(),
      mats.yLineMaterial);
    this.add(yLines1);
    const yLines2 = new THREE.LineSegments(ylineGeometry.clone(),
      mats.yLineMaterial);
    yLines2.position.set(0.0, 0.0, 1.0);
    this.add(yLines2);

    const zlinesPts = [
      new THREE.Vector3(0.5, 0.5, 0.0),
      new THREE.Vector3(0.5, 0.5, 1.0),
      new THREE.Vector3(-0.5, 0.5, 0.0),
      new THREE.Vector3(-0.5, 0.5, 1.0),
    ];
    const zlineGeometry = new THREE.Geometry();
    zlineGeometry.vertices = zlinesPts;
    const zLines1 = new THREE.LineSegments(zlineGeometry.clone(),
      mats.zLineMaterial);
    this.add(zLines1);
    const zLines2 = new THREE.LineSegments(zlineGeometry.clone(),
      mats.zLineMaterial);
    zLines2.position.set(0.0, -1.0, 0.0);
    this.add(zLines2);
  }

  public resize(pv: printer.PrintVolume): void;
  public resize(width: number, depth: number, height: number): void;
  public resize(widthOrPv: number | printer.PrintVolume, depth?: number, height?: number): void {
    if (typeof widthOrPv === "number") {
      this.scale.set(widthOrPv as number, depth, height);
    } else {
      const pv = widthOrPv as printer.PrintVolume;
      this.scale.set(pv.width_mm, pv.depth_mm, pv.height_mm);
    }
    this._recalcBBox();
  }

  private _recalcBBox(): void {
    const halfWidth = this.scale.x / 2.0;
    const halfDepth = this.scale.y / 2.0;
    const min = new THREE.Vector3(-halfWidth, -halfDepth, 0.0);
    const max = new THREE.Vector3(halfWidth, halfDepth, this.scale.z);
    this._bbox = new THREE.Box3(min, max);
  }

  get boundingBox(): THREE.Box3 {
    return this._bbox;
  }

  get width(): number {
    return this.scale.x;
  }

  get depth(): number {
    return this.scale.y;
  }

  get height(): number {
    return this.scale.z;
  }
}

/**
 * Subclass of THREE.Scene with several convenience methods
 */
export class PrinterScene extends THREE.Scene {

  private _printVolume: PrintVolumeView;
  private _printObjectsHolder: THREE.Group;
  private _printObjects: PrintMesh[];
  private _overhangAngle: number = 0;

  constructor() {
    super();
    this._printVolume = new PrintVolumeView(100, 100, 100);
    super.add(this._printVolume);
    this._printObjectsHolder = new THREE.Group();
    super.add(this._printObjectsHolder);
    this._printObjects = this._printObjectsHolder.children as PrintMesh[];
  }

  get printObjects(): PrintMesh[] {
    return this._printObjects;
  }

  get printVolume(): PrintVolumeView {
    return this._printVolume;
  }

  public removePrintObject(child: PrintMesh) {
    this._printObjectsHolder.remove(child);
  }

  public hidePrintObjects() {
    this._printObjectsHolder.visible = false;
  }

  public showPrintObjects() {
    this._printObjectsHolder.visible = true;
  }


  get overhangAngle(): number {
    return this._overhangAngle;
  }

  set overhangAngle(angleInRadians: number) {
    this._overhangAngle = angleInRadians % (2 * Math.PI);
    this.printObjects.forEach(printObject => {
      let overhangMaterial = (printObject.material as THREE.ShaderMaterial[])[1];
      (overhangMaterial.uniforms as mats.overhangShaderUniforms).cosAngleRad = new mats.FloatUniform(Math.cos(angleInRadians));
    })
  }

  get overhangAngleDegrees(): number {
    return this._overhangAngle * 360 / (2 * Math.PI);
  }

  set overhangAngleDegrees(angleInDegrees: number) {
    this.overhangAngle = ((angleInDegrees % 360) / 360) * Math.PI
  }

}

// TODO Turn into extension method
export class PrintMesh extends THREE.Mesh {

  private _geometryVolume: number = null;

  public static fromGeometry(geometry: THREE.Geometry | THREE.BufferGeometry) {
    var volumeGeometry;
    var bufferGeometry;
    if (geometry instanceof THREE.BufferGeometry) {
      volumeGeometry = new THREE.Geometry().fromBufferGeometry(geometry);
      bufferGeometry = geometry;
    } else {
      volumeGeometry = geometry;
      bufferGeometry = new THREE.BufferGeometry().fromGeometry(geometry);
    }
    bufferGeometry.clearGroups();
    bufferGeometry.addGroup(0, Infinity, 0);
    bufferGeometry.addGroup(0, Infinity, 1);
    const printMesh = new PrintMesh(bufferGeometry);
    printMesh._calculateVolume(volumeGeometry);
    return printMesh;
  }

  private constructor(geometry: THREE.BufferGeometry) {
    super(geometry, [mats.whiteMaterial, mats.overhangMaterial]);
    geometry.computeBoundingBox();
  }

  /**
   * Gets the volume of the mesh.
   */
  public get volume(): number {
    // The true volume is the geom volume multiplied by the scale factors
    return this._geometryVolume * (this.scale.x * this.scale.y * this.scale.z);
  }

  private _calculateVolume(geometry: THREE.Geometry) {
    const faces = geometry.faces;
    const vertices = geometry.vertices;
    for (const face of faces) {
      const v1 = vertices[face.a];
      const v2 = vertices[face.b];
      const v3 = vertices[face.c];
      this._geometryVolume += (
        -(v3.x * v2.y * v1.z)
        + (v2.x * v3.y * v1.z)
        + (v3.x * v1.y * v2.z)
        - (v1.x * v3.y * v2.z)
        - (v2.x * v1.y * v3.z)
        + (v1.x * v2.y * v3.z)
      ) / 6;
    }
  }
}
