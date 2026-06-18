import { SceneManager } from './engine/sceneManager';
import { MeasureTool } from './engine/measureTool';
import { EditTool } from './engine/editTool';
import { InteractionHandler } from './engine/interactionHandler';
import { MoleculePanel } from './ui/moleculePanel';

function init(): void {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    console.error('Canvas container not found');
    return;
  }

  const sceneManager = new SceneManager(canvasContainer);
  const measureTool = new MeasureTool(sceneManager);
  const editTool = new EditTool(sceneManager, measureTool);

  new MoleculePanel(sceneManager, measureTool, editTool);
  new InteractionHandler(sceneManager, measureTool, editTool, canvasContainer);

  sceneManager.startAnimationLoop();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
