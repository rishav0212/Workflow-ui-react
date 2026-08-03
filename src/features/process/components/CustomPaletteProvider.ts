export default class CustomPaletteProvider {
  static $inject = ["palette", "create", "elementFactory", "spaceTool", "lassoTool", "handTool", "globalConnect"];

  private _create: any;
  private _elementFactory: any;
  private _spaceTool: any;
  private _lassoTool: any;
  private _handTool: any;
  private _globalConnect: any;

  constructor(palette: any, create: any, elementFactory: any, spaceTool: any, lassoTool: any, handTool: any, globalConnect: any) {
    this._create = create;
    this._elementFactory = elementFactory;
    this._spaceTool = spaceTool;
    this._lassoTool = lassoTool;
    this._handTool = handTool;
    this._globalConnect = globalConnect;

    palette.registerProvider(this);
  }

  getPaletteEntries(element: any) {
    const { _create, _elementFactory } = this;

    function createEmailTask(event: any) {
      const shape = _elementFactory.createShape({ type: "bpmn:ServiceTask" });
      
      // Pre-fill the delegate expression for the Infinity Email Task
      shape.businessObject.name = "Send Email";
      shape.businessObject.set("flowable:delegateExpression", "${infinityEmailTaskDelegate}");

      _create.start(event, shape);
    }

    return {
      "create.email-task": {
        group: "activity",
        html: `<div class="entry" draggable="true" style="
          display: flex; 
          align-items: center; 
          width: 130px; 
          padding: 8px; 
          margin-bottom: 5px;
          margin-left: -5px;
          border-radius: 6px; 
          background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
          color: white; 
          cursor: grab; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          font-family: 'Inter', sans-serif; 
          font-size: 12px; 
          font-weight: 600;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          <span class="bpmn-icon-send" style="margin-right: 8px; font-size: 16px;"></span>
          Email Task
        </div>`,
        title: "Drag and drop to create an Infinity Email Task",
        action: {
          dragstart: createEmailTask,
          click: createEmailTask
        }
      }
    };
  }
}
