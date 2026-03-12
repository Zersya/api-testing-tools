import { db } from '../db';
import { environmentVariables, projects, collections } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getMagicVariableValue } from './magic-variables';

export interface VariableSubstitutionResult {
  value: string;
  warnings: string[];
}

export interface VariableContext {
  environmentId?: string;
  collectionId?: string;
  projectId?: string;
  workspaceId?: string;
}

export interface VariableScope {
  environment?: Record<string, string>;
  collection?: Record<string, string>;
  project?: Record<string, string>;
  global?: Record<string, string>;
}

const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

export function substituteVariables(
  input: string,
  context?: VariableContext
): VariableSubstitutionResult {
  const warnings: string[] = [];
  const variableMap = new Map<string, string>();
  const seenVariables = new Set<string>();

  function resolveVariable(name: string): string {
    name = name.trim();

    if (seenVariables.has(name)) {
      warnings.push(`Circular reference detected: ${name}`);
      return '';
    }

    if (variableMap.has(name)) {
      return variableMap.get(name)!;
    }

    const magicValue = getMagicVariableValue(name);
    if (magicValue !== null) {
      variableMap.set(name, magicValue);
      return magicValue;
    }

    seenVariables.add(name);
    let value = '';

    if (context) {
      value = resolveFromContext(name, context);
    }

    variableMap.set(name, value);
    seenVariables.delete(name);

    return value;
  }

  function resolveFromContext(name: string, ctx: VariableContext): string {
    let value = '';

    const scopes: Record<string, any>[] = [];

    if (ctx.environmentId) {
      const envVars = getEnvironmentVariables(ctx.environmentId);
      scopes.push(envVars);
    }

    if (ctx.collectionId) {
      const collectionVars = getCollectionVariables(ctx.collectionId);
      scopes.push(collectionVars);
    }

    if (ctx.projectId) {
      const projectVars = getProjectVariables(ctx.projectId);
      scopes.push(projectVars);
    }

    if (ctx.workspaceId) {
      const globalVars = getWorkspaceVariables(ctx.workspaceId);
      scopes.push(globalVars);
    }

    for (const scope of scopes) {
      if (scope && name in scope) {
        value = scope[name];
        break;
      }
    }

    return value;
  }

  function substituteNested(input: string): string {
    let result = input;
    let hasMatches = true;
    let iterations = 0;
    const maxIterations = 10;

    while (hasMatches && iterations < maxIterations) {
      hasMatches = false;
      iterations++;

      const matches = [...result.matchAll(VARIABLE_PATTERN)];

      if (matches.length === 0) {
        break;
      }

      hasMatches = true;

      for (const match of matches) {
        const [fullMatch, variableName] = match;
        const resolvedValue = resolveVariable(variableName);

        if (resolvedValue === '' && variableName.trim() !== '') {
          warnings.push(`Undefined variable: ${variableName.trim()}`);
        }

        result = result.replace(fullMatch, resolvedValue);
      }
    }

    if (hasMatches && iterations >= maxIterations) {
      warnings.push('Maximum substitution depth reached, possible circular reference');
    }

    return result;
  }

  const result = substituteNested(input);

  return {
    value: result,
    warnings: [...new Set(warnings)]
  };
}

function getEnvironmentVariables(environmentId: string): Record<string, string> {
  try {
    const variables = db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, environmentId));

    const result: Record<string, string> = {};
    for (const variable of variables) {
      result[variable.key] = variable.value;
    }

    return result;
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return {};
  }
}

function getCollectionVariables(collectionId: string): Record<string, string> {
  try {
    const collection = (db
      .select()
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1))[0];

    if (!collection) {
      return {};
    }

    const authConfig = collection.authConfig as any;
    if (authConfig && typeof authConfig === 'object') {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(authConfig)) {
        if (typeof value === 'string') {
          result[key] = value;
        }
      }
      return result;
    }

    return {};
  } catch (error) {
    console.error('Error fetching collection variables:', error);
    return {};
  }
}

function getProjectVariables(projectId: string): Record<string, string> {
  try {
    const project = (db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1))[0];

    if (!project) {
      return {};
    }

    const result: Record<string, string> = {};

    if (project.baseUrl) {
      result['base_url'] = project.baseUrl;
      result['baseUrl'] = project.baseUrl;
    }

    return result;
  } catch (error) {
    console.error('Error fetching project variables:', error);
    return {};
  }
}

function getWorkspaceVariables(workspaceId: string): Record<string, string> {
  const result: Record<string, string> = {
    workspace_id: workspaceId
  };

  return result;
}

export function extractVariables(input: string): string[] {
  const matches = [...input.matchAll(VARIABLE_PATTERN)];
  const variables = new Set<string>();

  for (const match of matches) {
    const variableName = match[1]?.trim();
    if (variableName) {
      variables.add(variableName);
    }
  }

  return Array.from(variables);
}