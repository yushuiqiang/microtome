import * as microtome from "microtome";
import * as THREE from "three";

type PrinterScene = microtome.printer.PrinterScene;

/**
 * This class handles managing, displaying, and manipulating
 * a view of a print volume containing objects to slice
 */
export class PrinterVolumeView {

  // --------------------------------------------------------
  // Properties
  // --------------------------------------------------------

  public disabled: boolean = false;

  public scatterColor: string = "#777777";

  public skyColor: string = "#AACCFF";

  public groundColor: string = "#775533";

  public pickedMesh: THREE.Mesh;

  public rotX: string;

  public rotY: string;

  public rotZ: string;

  public sX: string;

  public sY: string;

  public sZ: string;

  private renderer: THREE.Renderer = new THREE.WebGLRenderer(
    { alpha: true, antialias: true, clearColor: 0x000000, clearAlpha: 0 });

  private raycaster: THREE.Raycaster = new THREE.Raycaster();

  private scatterLight: THREE.AmbientLight = new THREE.AmbientLight();

  private skyLight: THREE.DirectionalLight = new THREE.DirectionalLight();

  private groundLight: THREE.DirectionalLight = new THREE.DirectionalLight();

  private canvasElement: HTMLCanvasElement = this.renderer.domElement;

  private pvCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(37, 1.0, 1.0, 2000.0);

  private reqAnimFrameHandle: number;

  private camNav: microtome.camera.CameraNav;

  private mouseXY = new THREE.Vector2();

  private doPick = false;

  constructor(private canvasHome: HTMLDivElement, private scene: PrinterScene) {
    this.render();
    this.attached();
  }

  // -----------------------------------------------------------
  // Observers
  // -----------------------------------------------------------

  public scatterColorChanged(newValue: string) {
    this.scatterLight.color.setStyle(newValue);
  }

  public skyColorChanged(newValue: string) {
    this.skyLight.color.setStyle(newValue);
  }

  public groundColorChanged(newValue: string) {
    this.groundLight.color.setStyle(newValue);
  }

  public pickedMeshChanged(newMesh: THREE.Mesh) {
    if (newMesh && newMesh.rotation && newMesh.scale) {
      const rotation = newMesh.rotation;
      this.rotX = (((rotation.x / (2 * Math.PI)) * 360) % 360).toFixed(0);
      this.rotY = (((rotation.y / (2 * Math.PI)) * 360) % 360).toFixed(0);
      this.rotZ = (((rotation.z / (2 * Math.PI)) * 360) % 360).toFixed(0);
      const scale = newMesh.scale;
      this.sX = scale.x.toFixed(2);
      this.sY = scale.y.toFixed(2);
      this.sZ = scale.z.toFixed(2);
    } else {
      this.rotX = this.rotY = this.rotZ = null;
      this.sX = this.sY = this.sZ = null;
    }
  }

  public rotationChanged(rotX: string, rotY: string, rotZ: string) {
    if (!this.pickedMesh) { return; }
    if (rotX) {
      this.pickedMesh.rotation.x = (parseFloat(rotX) / 360) * 2 * Math.PI;
    }
    if (rotY) {
      this.pickedMesh.rotation.y = (parseFloat(rotY) / 360) * 2 * Math.PI;
    }
    if (rotZ) {
      this.pickedMesh.rotation.z = (parseFloat(rotZ) / 360) * 2 * Math.PI;
    }
  }

  public scaleChanged(sX: string, sY: string, sZ: string) {
    if (!this.pickedMesh) { return; }
    if (sX) {
      this.pickedMesh.scale.x = parseFloat(sX);
    }
    if (sY) {
      this.pickedMesh.scale.y = parseFloat(sY);
    }
    if (sZ) {
      this.pickedMesh.scale.z = parseFloat(sZ);
    }
  }

  // ----------------------------------------------------------
  // Lifecycle methods
  // ----------------------------------------------------------

  public attached() {
    this.canvasElement.addEventListener("mousedown", (e) => {
      this.preparePick(e);
    });
    this.canvasElement.addEventListener("mousemove", () => {
      this.cancelPick();
    });
    this.canvasElement.addEventListener("mouseup", (e) => {
      this.tryPick(e);
    });
    this.canvasHome.appendChild(this.canvasElement);
    this.pvCamera.up.set(0, 0, 1);
    this.pvCamera.position.set(0, 350, 250);
    this.configureLighting();
    this.pvCamera.lookAt(this.scene.printVolume.position);
    this.camNav = new microtome.camera.CameraNav(this.pvCamera, this.canvasElement, true);
    this.camNav.target = this.scene.printVolume;
    this.camNav.frameTarget();
    this.camNav.enabled = true;
    this.startRendering();
  }

  public detached() {
    this.stopRendering();
  }

  // ---------------------------------------------------------
  // Picking support
  // ---------------------------------------------------------

  public preparePick(e: MouseEvent) {
    if (e.buttons === 1) {
      this.doPick = true;
    }
  }

  public cancelPick() {
    this.doPick = false;
  }

  public tryPick(e: MouseEvent) {
    if (this.doPick) {
      const bounds = this.canvasElement.getBoundingClientRect();
      const x = (e.offsetX / bounds.width) * 2 - 1;
      const y = - (e.offsetY / bounds.height) * 2 + 1;
      // update the picking ray with the camera and mouse position
      this.mouseXY.x = x;
      this.mouseXY.y = y;
      this.raycaster.setFromCamera(this.mouseXY, this.pvCamera);
      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects(this.scene.printObjects);
      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        this.pickMesh(mesh);
      } else {
        this.unpickMesh();
      }
    }
  }

  public formatVolume(vol: number) {
    return (vol / 1000).toFixed(1);
  }

  private pickMesh(mesh: THREE.Mesh) {
    if (this.pickedMesh) {
      this.unpickMesh();
    }
    mesh.material = microtome.materials.selectMaterial;
    this.pickedMesh = mesh;
  }

  private unpickMesh() {
    if (!this.pickedMesh) { return; }
    this.pickedMesh.material = microtome.materials.objectMaterial;
    this.pickedMesh = null;
  }

  // ---------------------------------------------------------
  // Rendering lifecycle hooks
  // ---------------------------------------------------------

  private stopRendering() {
    if (this.reqAnimFrameHandle) { window.cancelAnimationFrame(this.reqAnimFrameHandle); }
  }

  private startRendering() {
    if (this.reqAnimFrameHandle) { window.cancelAnimationFrame(this.reqAnimFrameHandle); }
    this.reqAnimFrameHandle = window.requestAnimationFrame(this.render.bind(this));
  }

  private render() {
    const canvas = this.canvasElement;
    const div = this.canvasHome;
    if (canvas.height !== div.clientHeight || canvas.width !== div.clientWidth) {
      canvas.width = div.clientWidth;
      canvas.height = div.clientHeight;
      this.pvCamera.aspect = div.clientWidth / div.clientHeight;
      this.pvCamera.updateProjectionMatrix();
      this.renderer.setSize(canvas.width, canvas.height);
    }
    this.renderer.render(this.scene, this.pvCamera);
    this.reqAnimFrameHandle = window.requestAnimationFrame(this.render.bind(this));
  }

  private configureLighting() {
    this.scatterLight.color.setStyle(this.scatterColor);
    this.scene.add(this.scatterLight);
    this.skyLight.color.setStyle(this.skyColor);
    this.skyLight.intensity = 0.65;
    this.skyLight.position.set(0, 0, 1000);
    this.scene.add(this.skyLight);
    this.groundLight.color.setStyle(this.groundColor);
    this.groundLight.intensity = 0.45;
    this.groundLight.position.set(0, 0, -1000);
    this.scene.add(this.groundLight);
  }

}
