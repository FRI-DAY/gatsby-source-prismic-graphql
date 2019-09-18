import { getRootQuery } from 'gatsby-source-graphql-universal/getRootQuery';

export function createDocumentPreviewPage(createPage: Function, page: any, lang?: string) {
  const rootQuery = getRootQuery(page.component);

  createPage({
    path: page.path,
    matchPath: process.env.NODE_ENV === 'production' ? undefined : page.match,
    component: page.component,
    context: {
      rootQuery,
      id: '',
      uid: '',
      lang,
    },
  });
}
