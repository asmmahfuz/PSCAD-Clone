/**
 * PSCAD Modern - FMI 2.0 / 3.0 FMU Importer
 * Parses modelDescription.xml and instantiates companion blocks on the CAD schematic.
 */

import type { FmiVariable } from './fmiExport';
import type { CircuitComponentData } from '../types';

export interface ParsedFmuModel {
  modelName: string;
  fmiVersion: string;
  guid: string;
  description: string;
  author: string;
  generationTool: string;
  variables: FmiVariable[];
  inputs: FmiVariable[];
  outputs: FmiVariable[];
  parameters: FmiVariable[];
}

export class FmiImporter {
  /**
   * Parse modelDescription.xml content string
   */
  public static parseModelDescriptionXml(xmlContent: string): ParsedFmuModel {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    const root = doc.documentElement;
    const modelName = root.getAttribute('modelName') || 'External_FMU';
    const fmiVersion = root.getAttribute('fmiVersion') || '2.0';
    const guid = root.getAttribute('guid') || root.getAttribute('instantiationToken') || '';
    const description = root.getAttribute('description') || '';
    const author = root.getAttribute('author') || 'Unknown';
    const generationTool = root.getAttribute('generationTool') || '';

    const variables: FmiVariable[] = [];

    // Parse ScalarVariable (FMI 2.0) or Float64/Int32 (FMI 3.0)
    const varNodes = root.querySelectorAll('ModelVariables > ScalarVariable, ModelVariables > Float64, ModelVariables > Int32, ModelVariables > Boolean');

    varNodes.forEach((node) => {
      const name = node.getAttribute('name') || '';
      const vrStr = node.getAttribute('valueReference') || '0';
      const vr = parseInt(vrStr, 10);
      const causality = (node.getAttribute('causality') || 'local') as any;
      const variability = (node.getAttribute('variability') || 'continuous') as any;
      const desc = node.getAttribute('description') || '';

      let type: 'Real' | 'Integer' | 'Boolean' | 'String' = 'Real';
      let startValue: any = undefined;
      let unit: string | undefined = undefined;

      const realChild = node.querySelector('Real');
      if (realChild) {
        type = 'Real';
        if (realChild.hasAttribute('start')) {
          startValue = parseFloat(realChild.getAttribute('start') || '0');
        }
        if (realChild.hasAttribute('unit')) {
          unit = realChild.getAttribute('unit') || undefined;
        }
      } else if (node.tagName.toLowerCase() === 'float64') {
        type = 'Real';
        if (node.hasAttribute('start')) startValue = parseFloat(node.getAttribute('start') || '0');
        if (node.hasAttribute('unit')) unit = node.getAttribute('unit') || undefined;
      }

      variables.push({
        name,
        valueReference: vr,
        causality,
        variability,
        type,
        startValue,
        description: desc,
        unit,
      });
    });

    const inputs = variables.filter((v) => v.causality === 'input');
    const outputs = variables.filter((v) => v.causality === 'output');
    const parameters = variables.filter((v) => v.causality === 'parameter');

    return {
      modelName,
      fmiVersion,
      guid,
      description,
      author,
      generationTool,
      variables,
      inputs,
      outputs,
      parameters,
    };
  }

  /**
   * Convert parsed FMU model into a dynamic PSCAD custom component data structure
   */
  public static createComponentFromFmu(
    parsed: ParsedFmuModel,
    x: number = 200,
    y: number = 200
  ): CircuitComponentData {
    const params: Record<string, any> = {
      modelName: parsed.modelName,
      fmiVersion: parsed.fmiVersion,
      guid: parsed.guid,
    };

    parsed.parameters.forEach((p) => {
      params[p.name] = p.startValue !== undefined ? p.startValue : 0.0;
    });

    return {
      id: `FMU_${parsed.modelName}_${Date.now()}`,
      type: 'FMU_Block',
      name: parsed.modelName,
      x,
      y,
      rotation: 0,
      params,
    };
  }
}
