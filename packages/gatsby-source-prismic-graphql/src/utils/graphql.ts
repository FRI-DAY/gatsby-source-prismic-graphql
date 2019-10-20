import fs from 'fs';
import _ from 'lodash';
import { babelParseToAst } from 'gatsby/dist/utils/babel-parse-to-ast';
import { Fragments } from '../interfaces/PluginOptions';

interface Result {
  graphqlQuery: string | null;
  graphqlFragments: string[];
}

const cache: {
  [p: string]: Result;
} = {};

const execute = (path: string, entries: string[]) => {
  const result: Result = { graphqlQuery: null, graphqlFragments: [] };

  const content = fs.readFileSync(path, 'utf-8');
  const ast = babelParseToAst(content, path);

  _.get(ast, 'program.body', [])
    .filter((n: any) => n.type === 'ExportNamedDeclaration')
    .forEach((exp: any) => {
      const name = _.get(exp, 'declaration.declarations.0.id.name') as string;

      if (name === 'query') {
        result.graphqlQuery = _.get(
          exp,
          'declaration.declarations.0.init.quasi.quasis.0.value.raw'
        );
      } else if (entries.length > 0 && entries.includes(name)) {
        result.graphqlFragments.push(_.get(
          exp,
          'declaration.declarations.0.init.quasi.quasis.0.value.raw'
        ) as string);
      } else if (/fragment$/i.test(name)) {
        result.graphqlFragments.push(_.get(
          exp,
          'declaration.declarations.0.init.quasi.quasis.0.value.raw'
        ) as string);
      }
    });
  return result;
};

export const getQueryAndFragments = (componentPath: string, fragments?: Fragments) => {
  if (typeof cache[componentPath] === 'undefined') {
    const result = execute(componentPath, []);
    if (fragments) {
      result.graphqlFragments = [
        ...result.graphqlFragments,
        ...execute(fragments.path, fragments.entries || []).graphqlFragments,
      ];
    }
    cache[componentPath] = result;
  }
  return cache[componentPath];
};
