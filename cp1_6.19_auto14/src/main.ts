import { SceneManager } from './engine/sceneManager';
import { MeasureTool } from './engine/measureTool';
import { EditTool } from './engine/editTool';
import { InteractionHandler } from './engine/interactionHandler';
import { MoleculePanel } from './ui/moleculePanel';

class App {
  private sceneManager: SceneManager;
  private measureTool: MeasureTool;
  private editTool: EditTool;
  private interactionHandler: InteractionHandler;
  private moleculePanel: MoleculePanel;

  constructor() {
    this.sceneManager = new SceneManager('three-canvas', 'css3d-container', 'fps-counter');
    this.measureTool = new MeasureTool(this.sceneManager);
    this.editTool = new EditTool(this.sceneManager, this.measureTool, () => {
      this.measureTool.refreshAllMeasurements();
    });
    this.interactionHandler = new InteractionHandler(this.sceneManager, this.measureTool, this.editTool);
    this.moleculePanel = new MoleculePanel(
      'molecule-list',
      this.sceneManager,
      this.interactionHandler,
      this.measureTool
    );
  }

  public start(): void {
    console.log('MoleculeLab 3D Viewer started');
  }
}

const app = new App();
app.start();
