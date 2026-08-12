import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { append as svgAppend, attr as svgAttr, create as svgCreate } from 'tiny-svg';

const HIGH_PRIORITY = 1500;

export default class CustomRenderer extends BaseRenderer {
  static $inject = ['eventBus', 'bpmnRenderer'];

  private bpmnRenderer: any;

  constructor(eventBus: any, bpmnRenderer: any) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element: any) {
    return element.type === 'bpmn:ServiceTask';
  }

  drawShape(parentNode: any, element: any) {
    const bo = element.businessObject;
    const isEmailTask = bo.get('flowable:delegateExpression') === '${infinityEmailTaskDelegate}';

    if (isEmailTask) {
      // 1. Draw the base shape using the default renderer
      const shape = this.bpmnRenderer.drawShape(parentNode, element);
      
      // 2. Remove the default gear icon (it's the 'path' element rendered after 'rect')
      const childNodes = Array.from(parentNode.childNodes);
      const gearPath = childNodes.find((n: any) => n.tagName === 'path');
      if (gearPath) {
        parentNode.removeChild(gearPath);
      }

      // 3. Add the envelope icon (standard BPMN SendTask path)
      const envelope = svgCreate('path');
      svgAttr(envelope, {
        d: 'm 15,43 14,0 14,0 0,-18 -14,0 -14,0 0,18 z m 0,-18 14,8 14,-8',
        fill: '#ffffff',
        stroke: '#374151',
        strokeWidth: '1.5px'
      });
      // Adjust translation and scale it down so it's not too big
      svgAttr(envelope, {
        transform: 'translate(4, 4) scale(0.5)' 
      });
      svgAppend(parentNode, envelope);

      return shape;
    }

    // For all other Service Tasks, let the default renderer handle it normally
    return this.bpmnRenderer.drawShape(parentNode, element);
  }
}
