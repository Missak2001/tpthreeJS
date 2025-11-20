import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class Camera {
  constructor(rendererDomElement) {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    )

    this.defaultPosition()

    this.controls = new OrbitControls(this.camera, rendererDomElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.target.set(0, 0, 0)

    // l'autorisation a la camera de regarder vers le haut
    this.controls.minPolarAngle = 0
    this.controls.maxPolarAngle = Math.PI / 2 

    window.addEventListener('resize', () => this.onResize())
  }

  defaultPosition() {
    this.camera.position.set(10, 10, 10)
    this.camera.lookAt(0, 0, 0)
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
  }

  update() {
    this.controls.update()
  }
}
