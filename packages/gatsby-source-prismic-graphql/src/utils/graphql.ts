import fs from 'fs';
import _ from 'lodash';
import { babelParseToAst } from 'gatsby/dist/utils/babel-parse-to-ast';

interface Result {
  graphqlQuery: string | null;
  graphqlFragments: string[];
}

const cache: {
  [p: string]: Result;
} = {};

const getAst = (path: string) => {
  const content = fs.readFileSync(path, 'utf-8');
  const ast = babelParseToAst(content, path);

  return _.get(ast, 'program.body', []).filter((n: any) => n.type === 'ExportNamedDeclaration');
};

const execute = (path: string, entries: string[]) => {
  const result: Result = { graphqlQuery: null, graphqlFragments: [] };

  let previewQuery = null;
  let query = null;

  getAst(path).forEach((exp: any) => {
    const name = _.get(exp, 'declaration.declarations.0.id.name') as string;
    if (name === 'previewQuery') {
      previewQuery = _.get(exp, 'declaration.declarations.0.init.quasi.quasis.0.value.raw');
    } else if (name === 'query') {
      query = _.get(exp, 'declaration.declarations.0.init.quasi.quasis.0.value.raw');
    } else if (entries.length > 0 && entries.includes(name)) {
      result.graphqlFragments.push(_.get(
        exp,
        'declaration.declarations.0.init.quasi.quasis.0.value.raw'
      ) as string);
    }
  });

  result.graphqlQuery = previewQuery || query;
  return result;
};

export const getQueryAndFragments = (
  componentPath: string,
  gqlFragmentsFile?: string,
  gqlFragments?: string[]
) => {
  if (typeof cache[componentPath] === 'undefined') {
    const result = execute(componentPath, []);
    if (gqlFragmentsFile) {
      result.graphqlFragments = [
        ...result.graphqlFragments,
        ...execute(gqlFragmentsFile, gqlFragments || []).graphqlFragments,
      ];
    }
    cache[componentPath] = result;
  }
  return cache[componentPath];
};
