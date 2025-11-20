// src/UI.js
import GUI from 'lil-gui'

export class UI {
  constructor() {
    this.gui = new GUI()

    // Paramètres pour l'affichage de l'objet sélectionné
    this.selectionParams = {
      name: '',
      position: '',
      rotation: '',
      scale: ''
    }

    this.selectionFolder = null
  }

  // --- Skybox ---
  addSkyboxUI(files, params, onChange) {
    const folder = this.gui.addFolder('Skybox')

    folder
      .add(params, 'file', files)
      .name('file')
      .onChange((value) => {
        onChange(value)
      })
  }

  // --- Panneau "Selection" (caché par défaut) ---
  addSelectionPanel() {
    const folder = this.gui.addFolder('Selection')

    folder.add(this.selectionParams, 'name').name('Name').listen()
    folder.add(this.selectionParams, 'position').name('Position').listen()
    folder.add(this.selectionParams, 'rotation').name('Rotation').listen()
    folder.add(this.selectionParams, 'scale').name('Scale').listen()

    // caché par défaut
    folder.domElement.style.display = 'none'

    this.selectionFolder = folder
  }

  showSelectionPanel(show) {
    if (!this.selectionFolder) return
    this.selectionFolder.domElement.style.display = show ? '' : 'none'
  }

  updateSelectionInfo(object) {
    if (!object) return

    const p = object.position
    const q = object.quaternion
    const s = object.scale

    this.selectionParams.name = object.name || 'Object'
    this.selectionParams.position = `${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`
    this.selectionParams.rotation = `${q.x.toFixed(2)}, ${q.y.toFixed(2)}, ${q.z.toFixed(2)}, ${q.w.toFixed(2)}`
    this.selectionParams.scale = `${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)}`

    this.showSelectionPanel(true)
  }

  clearSelectionInfo() {
    this.selectionParams.name = ''
    this.selectionParams.position = ''
    this.selectionParams.rotation = ''
    this.selectionParams.scale = ''
    this.showSelectionPanel(false)
  }

  // --- Bouton d'export de scène ---
  addExportButton(callback) {
    this.gui
      .add({ exportScene: callback }, 'exportScene')
      .name('📤 Export Scene')
  }

  // --- Boutons Clear / Import dans un dossier "Scene" ---
  addSceneIOButtons(onClear, onImport) {
    const folder = this.gui.addFolder('Scene')

    folder
      .add({ clearScene: onClear }, 'clearScene')
      .name('🧹 Clear Scene')

    folder
      .add({ importScene: onImport }, 'importScene')
      .name('📥 Import Scene')
  }
}
