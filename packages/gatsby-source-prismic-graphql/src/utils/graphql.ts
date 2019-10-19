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

const execute = (path: string) => {
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
      } else if (/fragment$/i.test(name)) {
        result.graphqlFragments.push(_.get(
          exp,
          'declaration.declarations.0.init.quasi.quasis.0.value.raw'
        ) as string);
      }
    });
  return result;
};

export const getQueryAndFragments = (componentPath: string, fragmentsPath?: string) => {
  if (typeof cache[componentPath] === 'undefined') {
    const result = execute(componentPath);
    if (fragmentsPath) {
      result.graphqlFragments = [
        ...result.graphqlFragments,
        ...execute(fragmentsPath).graphqlFragments,
      ];
    }
    cache[componentPath] = result;
  }
  return cache[componentPath];
};
