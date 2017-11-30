import * as microtome from "microtome"
import * as THREE from "three"

let previewDiv = <HTMLDivElement>document.getElementById("preview-div")

class PrinterVolumeView {

    private renderer: THREE.Renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, clearColor: 0x000000, clearAlpha: 0 });

    private raycaster: THREE.Raycaster = new THREE.Raycaster();

    private scatterLight: THREE.AmbientLight = new THREE.AmbientLight();

    private skyLight: THREE.DirectionalLight = new THREE.DirectionalLight();

    private groundLight: THREE.DirectionalLight = new THREE.DirectionalLight();

    private canvasElement: HTMLCanvasElement = this.renderer.domElement;

    private pvCamera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(37, 1.0, 1.0, 2000.0);

    private static ORIGIN = new THREE.Vector3(0, 0, 0);

    private pvObjectGroup = new THREE.Group();

    private reqAnimFrameHandle: number;

    private printerVolume: microtome.three_d.PrintVolumeView = new microtome.three_d.PrintVolumeView(120, 120, 120);

    private camNav: microtome.three_d.CameraNav;

    //--------------------------------------------------------
    // Properties
    //--------------------------------------------------------

    public scene: microtome.three_d.PrinterScene = new microtome.three_d.PrinterScene();

    public disabled: boolean = false;

    public scatterColor: string = "#777777"

    public skyColor: string = "#AACCFF"

    public groundColor: string = "#775533"

    public pickedMesh: THREE.Mesh;

    public rotX: string;

    public rotY: string;

    public rotZ: string;

    public sX: string;

    public sY: string;

    public sZ: string;

    constructor(private canvasHome: HTMLDivElement) {
        this.render(0);
        this.attached();
        let sphere1 = new THREE.Mesh(new THREE.SphereGeometry(10), microtome.three_d.CoreMaterialsFactory.objectMaterial)
        sphere1.position.set(15, 15, 15);
        let sphere2 = new THREE.Mesh(new THREE.SphereGeometry(10), microtome.three_d.CoreMaterialsFactory.objectMaterial)
        sphere2.position.set(15, 24, 20);
        let sphere3 = new THREE.Mesh(new THREE.SphereGeometry(15), microtome.three_d.CoreMaterialsFactory.objectMaterial)
        sphere3.position.set(15, 23, 35);

        this.scene.add(sphere1, sphere2, sphere3)
    }


    //-----------------------------------------------------------
    // Observers
    //-----------------------------------------------------------

    // disabledChanged(newValue: boolean, oldValue: boolean) {
    //     if (!newValue) {
    //         this.async(this.startRendering.bind(this), 100)
    //     } else {
    //         this.stopRendering();
    //     }
    //     if (this.camNav) {
    //         this.camNav.enabled = !newValue;
    //     }
    // }

    scatterColorChanged(newValue: string, oldValue: string) {
        this.scatterLight.color.setStyle(newValue);
    }

    skyColorChanged(newValue: string, oldValue: string) {
        this.skyLight.color.setStyle(newValue);
    }

    groundColorChanged(newValue: string, oldValue: string) {
        this.groundLight.color.setStyle(newValue);
    }

    pickedMeshChanged(newMesh: THREE.Mesh, oldMesh: THREE.Mesh) {
        console.log(arguments);
        if (newMesh && newMesh.rotation && newMesh.scale) {
            var rotation = newMesh.rotation;
            this.rotX = (((rotation.x / (2 * Math.PI)) * 360) % 360).toFixed(0);
            this.rotY = (((rotation.y / (2 * Math.PI)) * 360) % 360).toFixed(0);
            this.rotZ = (((rotation.z / (2 * Math.PI)) * 360) % 360).toFixed(0);
            var scale = newMesh.scale;
            this.sX = scale.x.toFixed(2);
            this.sY = scale.y.toFixed(2);
            this.sZ = scale.z.toFixed(2);
        } else {
            this.rotX = this.rotY = this.rotZ = null;
            this.sX = this.sY = this.sZ = null;
        }
    }

    rotationChanged(rotX: string, rotY: string, rotZ: string) {
        if (!this.pickedMesh) return;
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

    scaleChanged(sX: string, sY: string, sZ: string) {
        if (!this.pickedMesh) return;
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

    //----------------------------------------------------------
    // Lifecycle methods
    //----------------------------------------------------------

    public attached() {
        this.canvasHome.appendChild(this.canvasElement);
        this.pvCamera.up.set(0, 0, 1);
        this.pvCamera.position.set(0, 350, 250);
        this.configureLighting();
        this.pvCamera.lookAt(this.printerVolume.position);
        this.camNav = new microtome.three_d.CameraNav(this.pvCamera, this.canvasElement, true)
        this.camNav.target = this.printerVolume;
        this.camNav.frameTarget();
        this.startRendering();
        console.log(this);
    }

    public detached() {
        this.stopRendering();
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

    //---------------------------------------------------------
    // Rendering lifecycle hooks
    //---------------------------------------------------------

    private stopRendering() {
        if (this.reqAnimFrameHandle) window.cancelAnimationFrame(this.reqAnimFrameHandle)
    }

    private startRendering() {
        if (this.reqAnimFrameHandle) window.cancelAnimationFrame(this.reqAnimFrameHandle);
        this.reqAnimFrameHandle = window.requestAnimationFrame(this.render.bind(this));
    }

    private render(timestamp: number) {
        var canvas = this.canvasElement;
        var div = this.canvasHome
        if (canvas.height != div.clientHeight || canvas.width != div.clientWidth) {
            canvas.width = div.clientWidth;
            canvas.height = div.clientHeight;
            this.pvCamera.aspect = div.clientWidth / div.clientHeight;
            this.pvCamera.updateProjectionMatrix();
            this.renderer.setSize(canvas.width, canvas.height);
        }
        this.renderer.render(this.scene, this.pvCamera);
        this.reqAnimFrameHandle = window.requestAnimationFrame(this.render.bind(this));
    }

    //---------------------------------------------------------
    // Picking support
    //---------------------------------------------------------

    private mouseXY = new THREE.Vector2();

    private doPick = false;

    public preparePick(e: MouseEvent) {
        if (e.buttons === 1) {
            this.doPick = true;
        }
    }

    public cancelPick(e: MouseEvent) {
        this.doPick = false;
    }

    public tryPick(e: MouseEvent) {
        if (this.doPick) {
            var bounds = this.canvasHome.getBoundingClientRect();
            var x = (e.clientX / bounds.width) * 2 - 1;
            var y = - (e.clientY / bounds.height) * 2 + 1;
            // update the picking ray with the camera and mouse position
            this.mouseXY.x = x;
            this.mouseXY.y = y;
            this.raycaster.setFromCamera(this.mouseXY, this.pvCamera);
            // calculate objects intersecting the picking ray
            var intersects = this.raycaster.intersectObjects(this.scene.printObjects);
            if (intersects.length > 0) {
                let mesh = intersects[0].object as THREE.Mesh;
                this.pickMesh(mesh);
            } else {
                this.unpickMesh();
            }
        }
    }

    private pickMesh(mesh: THREE.Mesh) {
        if (this.pickedMesh) {
            this.unpickMesh();
        }
        mesh.material = microtome.three_d.CoreMaterialsFactory.selectMaterial;
        this.pickedMesh = mesh;
    }

    private unpickMesh() {
        if (!this.pickedMesh) return;
        this.pickedMesh.material = microtome.three_d.CoreMaterialsFactory.objectMaterial;
        this.pickedMesh = null;
    }

    public formatVolume(vol: number) {
        return (vol / 1000).toFixed(1);
    }
}

const pvView = new PrinterVolumeView(previewDiv);