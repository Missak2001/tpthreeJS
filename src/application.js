import * as THREE from 'three/webgpu'

export class Application {
    
    constructor() {
        this.renderer = new THREE.WebGPURenderer({antialias: true})
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        document.body.appendChild(this.renderer.domElement)

        this.renderer.setAnimationLoop(this.render.bind(this))
    }

    render() {
    }

}
