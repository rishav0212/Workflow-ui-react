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
        className: "infinity-email-task-icon",
        title: "Infinity Email Task — drag to send an email from this workflow",
        action: {
          dragstart: createEmailTask,
          click: createEmailTask
        }
      }
    };
  }
}
