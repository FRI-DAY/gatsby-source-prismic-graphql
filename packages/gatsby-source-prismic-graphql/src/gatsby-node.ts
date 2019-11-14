import path from 'path';
import { onCreateWebpackConfig, sourceNodes } from 'gatsby-source-graphql-universal/gatsby-node';
import { getPrismicDomain, createHttpLink, resolveQuery } from './utils';
import { Page, PluginOptions, Edge, LinkResolver } from './interfaces/PluginOptions';
import { createRemoteFileNode } from 'gatsby-source-filesystem';
import { GraphqlFragment, extractFragments, extractRootQuery } from './utils/graphql';
import { fieldName, typeName } from './constants';
import { downloadIntrospectionQueryResultData } from './utils/downloadIntrospectionQueryResultData';

const computePagedQueries = async (
  lang: string,
  page: Page,
  graphql: any,
  fragments: GraphqlFragment[]
) => {
  const result: {
    [p: string]: Edge[];
  } = {};

  const pagedQueries = page.pagedQueries || [];
  for (const pagedQuery of pagedQueries) {
    let edges: Edge[] = [];
    let pageInfo = {
      hasNextPage: true,
      endCursor: '',
    };

    const resolvedQuery = resolveQuery(pagedQuery.query, fragments, pagedQuery.fragments);
    while (pageInfo.hasNextPage) {
      const { data, errors } = await graphql(resolvedQuery, {
        cursor: pageInfo.endCursor,
        after: pageInfo.endCursor,
        lang: lang || '',
      });

      if (errors && errors.length) {
        throw errors[0];
      }
      const response = data.prismic[pagedQuery.name];

      edges = [...edges, ...response.edges];
      pageInfo = response.pageInfo;
    }
    result[pagedQuery.name] = edges;
  }
  return result;
};

exports.onCreateWebpackConfig = onCreateWebpackConfig;

exports.sourceNodes = async (ref: any, options: PluginOptions) => {
  return sourceNodes(ref, {
    url: getPrismicDomain(options.repositoryName) + 'graphql',
    fieldName: fieldName,
    typeName: typeName,
    createLink: () => createHttpLink(options.repositoryName, options.accessToken),
  });
};

const createGeneralPreviewPage = (createPage: Function, options: PluginOptions): void => {
  createPage({
    path: (options.previewPath || '/preview').replace(/^\//, ''),
    component: path.resolve(path.join(__dirname, 'components', 'PreviewPage.js')),
    context: {
      isPreviewPage: true,
    },
  });
};

const createDocumentPreviewPage = async (
  createPage: Function,
  page: Page,
  lang: string,
  rootQuery: string | null,
  fragments: GraphqlFragment[],
  pagedQueryResults: any
) => {
  await createPage({
    path: page.path,
    component: page.component,
    context: {
      isPreviewPage: true,
      rootQuery,
      fragments,
      page,
      pagedQueryResults,
      id: '',
      uid: '',
      lang: lang || '',
    },
  });
};

const createDocumentPages = async (
  createPage: Function,
  edges: Edge[],
  page: Page,
  lang: string,
  rootQuery: string | null,
  fragments: GraphqlFragment[],
  pagedQueryResults: any,
  linkResolver: LinkResolver
) => {
  // Cycle through each document returned from query...
  edges.forEach(({ cursor, node }, index) => {
    const previousEdge = index > 1 ? edges[index - 1] : null;
    const nextEdge = index < edges.length - 1 ? edges[index + 1] : null;

    // ...and create the page
    createPage({
      path: linkResolver({
        _meta: node._meta,
        link_type: 'Link.document',
      }),
      component: page.component,
      context: {
        rootQuery,
        fragments,
        cursor,
        page,
        pagedQueryResults,

        uid: node._meta.uid || '',
        id: node._meta.id || '',
        lang: lang,

        previousDocument: previousEdge ? previousEdge.node._meta : null,
        nextDocument: nextEdge ? nextEdge.node._meta : null,
      },
    });
  });
};

const getDocumentsQuery = ({
  documentType,
  sortType,
}: {
  documentType: string;
  sortType: string;
}): string => `
  query AllPagesQuery ($after: String, $lang: String, $sortBy: ${sortType}) {
    prismic {
      ${documentType} (
        after: $after
        sortBy: $sortBy
        lang: $lang
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            _meta {
              id
              lang
              uid
              type
            }
          }
          cursor
        }
      }
    }
  }
`;

exports.createPages = async ({ graphql, actions: { createPage } }: any, options: PluginOptions) => {
  /**
   * Helper that recursively queries GraphQL to collect all documents for the given
   * page type. Once all documents are collected, it creates pages for them all.
   * Prismic GraphQL queries only return up to 20 results per query)
   */
  const createPagesForType = async (
    page: Page,
    lang: string,
    rootQuery: string | null,
    fragments: GraphqlFragment[]
  ) => {
    // Prepare and execute query
    const documentType: string = `all${page.type}s`;
    const sortType: string = `PRISMIC_Sort${page.type}y`;
    const query: string = getDocumentsQuery({
      documentType,
      sortType,
    });

    let documents: any[] = [];
    let pageInfo = {
      hasNextPage: true,
      endCursor: '',
    };

    // retrieve all pages for the given page type and language
    while (pageInfo.hasNextPage) {
      const { data, errors } = await graphql(query, {
        after: pageInfo.endCursor,
        lang: lang,
        sortBy: page.sortBy,
      });

      if (errors && errors.length) {
        throw errors[0];
      }

      const response = data.prismic[documentType];
      documents = [...documents, ...response.edges];
      pageInfo = response.pageInfo;
    }

    // create preview page and pages
    const pagedQueryResults = await computePagedQueries(lang, page, graphql, fragments);
    await createDocumentPreviewPage(
      createPage,
      page,
      lang,
      rootQuery,
      fragments,
      pagedQueryResults
    );
    await createDocumentPages(
      createPage,
      documents,
      page,
      lang,
      rootQuery,
      fragments,
      pagedQueryResults,
      options.linkResolver
    );
  };

  //create general preview page
  createGeneralPreviewPage(createPage, options);

  // Prepare to create all the pages
  const pages: Page[] = options.pages || [];
  const pageCreators: Promise<any>[] = [];

  // extract all graphql fragments
  const fragments = extractFragments(options.fragmentsFile);

  // Create pageCreator promises for each page/language combination
  pages.forEach((page: Page) => {
    const rootQuery = extractRootQuery(page.component);
    const langs = page.langs ||
      options.langs ||
      (options.defaultLang && [options.defaultLang]) || [''];

    langs.forEach((lang: string) =>
      pageCreators.push(createPagesForType(page, lang, rootQuery, fragments))
    );
  });

  // await all promises
  await Promise.all(pageCreators);
};

exports.createResolvers = (
  { actions, cache, createNodeId, createResolvers, store, reporter }: any,
  { sharpKeys = [/image|photo|picture/], pages = [] }: PluginOptions
) => {
  const { createNode } = actions;

  const state = store.getState();
  const [prismicSchema = {}] = state.schemaCustomization.thirdPartySchemas;
  const typeMap = prismicSchema._typeMap;

  const resolvers: { [key: string]: any } = {};

  for (const typeName in typeMap) {
    const typeEntry = typeMap[typeName];
    const typeFields = (typeEntry && typeEntry.getFields && typeEntry.getFields()) || {};
    const typeResolver: { [key: string]: any } = {};
    for (const fieldName in typeFields) {
      const field = typeFields[fieldName];
      if (
        field.type === typeMap.PRISMIC_Json &&
        sharpKeys.some((re: RegExp | string) =>
          re instanceof RegExp ? re.test(fieldName) : re === fieldName
        )
      ) {
        typeResolver[`${fieldName}Sharp`] = {
          type: 'File',
          args: {
            crop: { type: typeMap.String },
          },
          resolve(source: any, args: any) {
            const obj = (source && source[fieldName]) || {};
            const url = args.crop ? obj[args.crop] && obj[args.crop].url : obj.url;
            if (url) {
              return createRemoteFileNode({
                url,
                store,
                cache,
                createNode,
                createNodeId,
                reporter,
              });
            }
            return null;
          },
        };
      }
    }
    if (Object.keys(typeResolver).length) {
      resolvers[typeName] = typeResolver;
    }
  }

  if (Object.keys(resolvers).length) {
    createResolvers(resolvers);
  }
};

exports.onPreInit = (args: any, options: PluginOptions) => {
  downloadIntrospectionQueryResultData(options.repositoryName);
};
