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
 *  - Infinity Email Task:   toEmail, subject, templateName, isReply
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

// Helper to get/set flowable:Field in extensionElements
function getFieldString(element: any, name: string): string {
  const bo = element.businessObject;
  const ext = bo.extensionElements;
  if (!ext || !ext.values) return "";
  const field = ext.values.find((v: any) => v.$type === "flowable:Field" && v.name === name);
  return field ? (field.stringValue || field.string || "") : "";
}

function setFieldString(element: any, name: string, value: string, modeling: any, bpmnFactory: any) {
  const bo = element.businessObject;
  let ext = bo.extensionElements;
  
  if (!ext) {
    ext = bpmnFactory.create("bpmn:ExtensionElements", { values: [] });
    modeling.updateModdleProperties(element, bo, { extensionElements: ext });
  }
  
  let fields = ext.values.filter((v: any) => v.$type === "flowable:Field");
  const otherExts = ext.values.filter((v: any) => v.$type !== "flowable:Field");
  
  // Remove existing
  fields = fields.filter((v: any) => v.name !== name);
  
  if (value) {
    const newField = bpmnFactory.create("flowable:Field", {
      name: name,
      stringValue: value
    });
    fields.push(newField);
  }
  
  modeling.updateModdleProperties(element, ext, { values: [...otherExts, ...fields] });
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

function fieldTextEntry(opts: {
  id: string;
  label: string;
  fieldName: string;
  placeholder?: string;
  description?: string;
  element: any;
  modeling: any;
  bpmnFactory: any;
}) {
  const { id, label, fieldName, placeholder, description, element, modeling, bpmnFactory } = opts;
  return {
    id,
    element,
    component: "textField" as const,
    isEdited: () => !!getFieldString(element, fieldName),
    getValue: () => ({ [id]: getFieldString(element, fieldName) }),
    setValue: (values: any) => setFieldString(element, fieldName, values[id] ?? "", modeling, bpmnFactory),
    label,
    description,
    placeholder,
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

function buildInfinityEmailGroup(element: any, modeling: any, bpmnFactory: any) {
  const bo = element.businessObject;
  if (!bo || !isServiceLike(element)) return null;

  // Moddle might store it under different keys depending on how it was created (palette vs xml import)
  const delExp = bo.delegateExpression || 
                 (bo.get && bo.get("flowable:delegateExpression")) || 
                 bo.get?.("camunda:delegateExpression") || 
                 bo.$attrs?.["flowable:delegateExpression"];

  if (delExp !== "${infinityEmailTaskDelegate}") {
    return null;
  }

  return {
    id: "flowable-infinity-email",
    label: "📧 Infinity Email Settings",
    component: "Group",
    entries: [
      fieldTextEntry({
        id: "email-toEmail",
        label: "To Email Address",
        fieldName: "toEmail",
        placeholder: "${customerEmail}",
        description: "Recipient email",
        element,
        modeling,
        bpmnFactory
      }),
      fieldTextEntry({
        id: "email-subject",
        label: "Subject",
        fieldName: "subject",
        placeholder: "Alert!",
        element,
        modeling,
        bpmnFactory
      }),
      fieldTextEntry({
        id: "email-templateName",
        label: "Template Name",
        fieldName: "templateName",
        placeholder: "invoice.html",
        element,
        modeling,
        bpmnFactory
      }),
      fieldTextEntry({
        id: "email-isReply",
        label: "Is Reply? (true/false)",
        fieldName: "isReply",
        placeholder: "true",
        element,
        modeling,
        bpmnFactory
      })
    ]
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
      const bpmnFactory = this._injector.get("bpmnFactory");

      const userTaskGroup = buildUserTaskGroup(element, modeling);
      const formKeyGroup = buildFormKeyGroup(element, modeling);
      const serviceTaskGroup = buildServiceTaskGroup(element, modeling);
      const asyncGroup = buildAsyncGroup(element, modeling);
      const emailGroup = buildInfinityEmailGroup(element, modeling, bpmnFactory);

      const newGroups: any[] = [];
      if (formKeyGroup) newGroups.push(formKeyGroup);
      if (userTaskGroup) newGroups.push(userTaskGroup);
      if (emailGroup) newGroups.push(emailGroup); // Show email settings first!
      if (serviceTaskGroup) newGroups.push(serviceTaskGroup);
      if (asyncGroup) newGroups.push(asyncGroup);

      return [...newGroups, ...groups];
    };
  }
}
