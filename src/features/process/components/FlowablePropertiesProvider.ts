/**
 * FlowablePropertiesProvider
 *
 * A custom bpmn-js properties-panel provider that surfaces the most
 * important Flowable-specific attributes directly in the panel UI:
 *
 *  - UserTask / StartEvent: formKey, assignee, candidateUsers,
 *                           candidateGroups, dueDate, priority
 *  - ServiceTask / SendTask / BusinessRuleTask:
 *                           class, expression, delegateExpression, resultVariable
 *  - All Activities:        asyncBefore, asyncAfter, exclusive
 *
 * It integrates with the @bpmn-io/properties-panel framework by returning
 * a list of "groups" which contain "entries" (rendered fields).
 *
 * Usage: add to BpmnModeler's `additionalModules`:
 *   { __init__: ['flowablePropertiesProvider'],
 *     flowablePropertiesProvider: ['type', FlowablePropertiesProvider] }
 */

// We build our own tiny provider that works with the properties-panel
// framework without pulling in the full Camunda provider.

const LOW_PRIORITY = 500;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isUserTask(element: any) {
  return element.type === "bpmn:UserTask";
}
function isStartEvent(element: any) {
  return element.type === "bpmn:StartEvent";
}
function isServiceLike(element: any) {
  return (
    element.type === "bpmn:ServiceTask" ||
    element.type === "bpmn:SendTask" ||
    element.type === "bpmn:BusinessRuleTask" ||
    element.type === "bpmn:ScriptTask"
  );
}
function isActivity(element: any) {
  const bo = element.businessObject;
  return bo && bo.$instanceOf && bo.$instanceOf("bpmn:Activity");
}
function isFlowElement(element: any) {
  const bo = element.businessObject;
  return bo && bo.$instanceOf && bo.$instanceOf("bpmn:FlowElement");
}

// Generic attr getter/setter on businessObject
function getAttr(element: any, attr: string): string {
  return element.businessObject?.[attr] ?? "";
}

function setAttr(element: any, attr: string, value: string, modeling: any) {
  modeling.updateModdleProperties(element, element.businessObject, {
    [attr]: value || undefined,
  });
}

// ── Entry builders ───────────────────────────────────────────────────────────

function textEntry(opts: {
  id: string;
  label: string;
  attr: string;
  placeholder?: string;
  description?: string;
  element: any;
  modeling: any;
}) {
  const { id, label, attr, placeholder, description, element, modeling } = opts;
  return {
    id,
    element,
    component: "textField" as const,
    isEdited: () => !!element.businessObject?.[attr],
    getValue: () => ({ [id]: getAttr(element, attr) }),
    setValue: (values: any) => setAttr(element, attr, values[id] ?? "", modeling),
    label,
    description,
    placeholder,
  };
}

function checkboxEntry(opts: {
  id: string;
  label: string;
  attr: string;
  element: any;
  modeling: any;
}) {
  const { id, label, attr, element, modeling } = opts;
  return {
    id,
    element,
    component: "checkbox" as const,
    isEdited: () => !!element.businessObject?.[attr],
    getValue: () => ({ [id]: !!element.businessObject?.[attr] }),
    setValue: (values: any) =>
      modeling.updateModdleProperties(element, element.businessObject, {
        [attr]: values[id] === true ? true : undefined,
      }),
    label,
  };
}

// ── Group builders ───────────────────────────────────────────────────────────

function buildUserTaskGroup(element: any, modeling: any) {
  if (!isUserTask(element)) return null;

  return {
    id: "flowable-user-task",
    label: "Flowable — Assignment",
    component: "Group",
    entries: [
      textEntry({
        id: "flowable-assignee",
        label: "Assignee",
        attr: "assignee",
        placeholder: "e.g. ${initiator} or johndoe",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-candidateUsers",
        label: "Candidate Users",
        attr: "candidateUsers",
        placeholder: "Comma-separated user IDs",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-candidateGroups",
        label: "Candidate Groups",
        attr: "candidateGroups",
        placeholder: "Comma-separated group IDs",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-dueDate",
        label: "Due Date",
        attr: "dueDate",
        placeholder: "ISO-8601 or expression",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-priority",
        label: "Priority",
        attr: "priority",
        placeholder: "0–100",
        element,
        modeling,
      }),
    ],
  };
}

function buildFormKeyGroup(element: any, modeling: any) {
  if (!isUserTask(element) && !isStartEvent(element)) return null;

  return {
    id: "flowable-form",
    label: "Flowable — Form",
    component: "Group",
    entries: [
      textEntry({
        id: "flowable-formKey",
        label: "Form Key",
        attr: "formKey",
        placeholder: "e.g. order-review-form",
        element,
        modeling,
      }),
    ],
  };
}

function buildServiceTaskGroup(element: any, modeling: any) {
  if (!isServiceLike(element)) return null;

  return {
    id: "flowable-service-task",
    label: "Flowable — Implementation",
    component: "Group",
    entries: [
      textEntry({
        id: "flowable-class",
        label: "Java Class",
        attr: "class",
        placeholder: "com.example.MyDelegate",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-expression",
        label: "Expression",
        attr: "expression",
        placeholder: "${myBean.execute(execution)}",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-delegateExpression",
        label: "Delegate Expression",
        attr: "delegateExpression",
        placeholder: "${myDelegateBean}",
        element,
        modeling,
      }),
      textEntry({
        id: "flowable-resultVariable",
        label: "Result Variable",
        attr: "resultVariable",
        placeholder: "Variable name for result",
        element,
        modeling,
      }),
    ],
  };
}

function buildAsyncGroup(element: any, modeling: any) {
  if (!isActivity(element) && !isFlowElement(element)) return null;

  return {
    id: "flowable-async",
    label: "Flowable — Async / Job",
    component: "Group",
    entries: [
      checkboxEntry({
        id: "flowable-asyncBefore",
        label: "Asynchronous Before",
        attr: "asyncBefore",
        element,
        modeling,
      }),
      checkboxEntry({
        id: "flowable-asyncAfter",
        label: "Asynchronous After",
        attr: "asyncAfter",
        element,
        modeling,
      }),
      checkboxEntry({
        id: "flowable-exclusive",
        label: "Exclusive (no parallel jobs)",
        attr: "exclusive",
        element,
        modeling,
      }),
    ],
  };
}

// ── Provider class ───────────────────────────────────────────────────────────

export default class FlowablePropertiesProvider {
  static $inject = ["propertiesPanel", "injector", "translate"];

  private _injector: any;

  constructor(propertiesPanel: any, injector: any, _translate: any) {
    this._injector = injector;
    propertiesPanel.registerProvider(LOW_PRIORITY, this);
  }

  getGroups(element: any) {
    return (groups: any[]) => {
      const modeling = this._injector.get("modeling");

      const userTaskGroup = buildUserTaskGroup(element, modeling);
      const formKeyGroup = buildFormKeyGroup(element, modeling);
      const serviceTaskGroup = buildServiceTaskGroup(element, modeling);
      const asyncGroup = buildAsyncGroup(element, modeling);

      const newGroups: any[] = [];
      if (formKeyGroup) newGroups.push(formKeyGroup);
      if (userTaskGroup) newGroups.push(userTaskGroup);
      if (serviceTaskGroup) newGroups.push(serviceTaskGroup);
      if (asyncGroup) newGroups.push(asyncGroup);

      return [...newGroups, ...groups];
    };
  }
}
