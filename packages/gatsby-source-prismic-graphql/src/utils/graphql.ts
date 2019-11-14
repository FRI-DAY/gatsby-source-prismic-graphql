import fs from 'fs';
import _ from 'lodash';
import { babelParseToAst } from 'gatsby/dist/utils/babel-parse-to-ast';

export interface GraphqlFragment {
  name: string;
  value: string;
}

const getAst = (path: string) => {
  const content = fs.readFileSync(path, 'utf-8');
  const ast = babelParseToAst(content, path);

  return _.get(ast, 'program.body', []).filter((n: any) => n.type === 'ExportNamedDeclaration');
};

export const extractRootQuery = (componentPath: string) => {
  const target = getAst(componentPath).find((exp: any) => {
    const name = _.get(exp, 'declaration.declarations.0.id.name') as string;
    return name === 'query';
  });
  if (target) {
    return _.get(target, 'declaration.declarations.0.init.quasi.quasis.0.value.raw');
  }
  return null;
};

export const extractFragments = (fragmentsFile?: string) => {
  const result: GraphqlFragment[] = [];
  if (fragmentsFile) {
    getAst(fragmentsFile).forEach((exp: any) => {
      const name = _.get(exp, 'declaration.declarations.0.id.name') as string;
      if (/Fragment$/.test(name)) {
        result.push({
          name,
          value: _.get(exp, 'declaration.declarations.0.init.quasi.quasis.0.value.raw'),
        });
      }
    });
  }
  return result;
};
