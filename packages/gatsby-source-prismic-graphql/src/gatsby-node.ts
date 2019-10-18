import path from 'path';
import { getRootQuery } from 'gatsby-source-graphql-universal/getRootQuery';
import { onCreateWebpackConfig, sourceNodes } from 'gatsby-source-graphql-universal/gatsby-node';
import { fieldName, PrismicLink, typeName } from './utils';
import { Page, PluginOptions, Edge } from './interfaces/PluginOptions';
import { createRemoteFileNode } from 'gatsby-source-filesystem';

exports.onCreateWebpackConfig = onCreateWebpackConfig;

exports.onCreatePage = ({ page, actions }: any) => {
  const rootQuery = getRootQuery(page.componentPath);
  page.context = page.context || {};
  if (rootQuery) {
    page.context.rootQuery = rootQuery;
    actions.createPage(page);
  }
};

exports.sourceNodes = (ref: any, options: PluginOptions) => {
  const opts = {
    fieldName,
    typeName,
    createLink: () =>
      PrismicLink({
        uri: `https://${options.repositoryName}.prismic.io/graphql`,
        credentials: 'same-origin',
        accessToken: options.accessToken as any,
        customRef: options.prismicRef as any,
      }),
    ...options,
  };

  return sourceNodes(ref, opts);
};

function createGeneralPreviewPage(createPage: Function, options: PluginOptions): void {
  createPage({
    path: (options.previewPath || '/preview').replace(/^\//, ''),
    component: path.resolve(path.join(__dirname, 'components', 'PreviewPage.js')),
    context: {
      prismicPreviewPage: true,
    },
  });
}

function createDocumentPreviewPage(createPage: Function, page: Page, lang?: string | null): void {
  const rootQuery = getRootQuery(page.component);
  createPage({
    path: page.path,
    component: page.component,
    context: {
      rootQuery,
      id: '',
      uid: '',
      lang,
      paginationPreviousUid: '',
      paginationPreviousLang: '',
      paginationNextUid: '',
      paginationNextLang: '',
    },
  });
}

function createDocumentPages(
  createPage: Function,
  edges: Edge[],
  options: PluginOptions,
  page: Page
): void {
  const rootQuery = getRootQuery(page.component);

  // Cycle through each document returned from query...
  edges.forEach(({ cursor, node }, index: number) => {
    const previousEdge = index > 1 ? edges[index - 1] : null;
    const nextEdge = index < edges.length - 1 ? edges[index + 1] : null;

    // ...and create the page
    createPage({
      path: options.linkResolver({
        link_type: 'Document',
        ...node._meta,
      }),
      component: page.component,
      context: {
        rootQuery,
        ...node._meta,
        cursor,
        paginationPreviousMeta: previousEdge ? previousEdge.node._meta : null,
        paginationPreviousUid: previousEdge ? previousEdge.node._meta.uid : '',
        paginationPreviousLang: previousEdge ? previousEdge.node._meta.lang : '',
        paginationNextMeta: nextEdge ? nextEdge.node._meta : null,
        paginationNextUid: nextEdge ? nextEdge.node._meta.uid : '',
        paginationNextLang: nextEdge ? nextEdge.node._meta.lang : '',
        // pagination helpers for overcoming backwards pagination issues cause by Prismic's 20-document query limit
        lastQueryChunkEndCursor: previousEdge ? previousEdge.endCursor : '',
      },
    });
  });
}

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
        first: 20
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
          cursor
          node {
            _meta {
              id
              lang
              uid
              type
            }
          }
        }
      }
    }
  }
`;

exports.createPages = async ({ graphql, actions: { createPage } }: any, options: PluginOptions) => {
  createGeneralPreviewPage(createPage, options);

  /**
   * Helper that recursively queries GraphQL to collect all documents for the given
   * page type. Once all documents are collected, it creates pages for them all.
   * Prismic GraphQL queries only return up to 20 results per query)
   */
  async function createPagesForType(
    page: Page,
    lang: string | null,
    endCursor: string = '',
    documents: [any?] = []
  ): Promise<any> {
    // Prepare and execute query
    const documentType: string = `all${page.type}s`;
    const sortType: string = `PRISMIC_Sort${page.type}y`;
    const query: string = getDocumentsQuery({ documentType, sortType });
    const { data, errors } = await graphql(query, {
      after: endCursor,
      lang: lang,
      sortBy: page.sortBy,
    });

    if (errors && errors.length) {
      throw errors[0];
    }

    const response = data.prismic[documentType];

    // Add last end cursor to all edges to enable pagination context when creating pages
    response.edges.forEach((edge: any) => (edge.endCursor = endCursor));

    // Stage documents for page creation
    documents = [...documents, ...response.edges] as [any?];

    if (response.pageInfo.hasNextPage) {
      const newEndCursor: string = response.pageInfo.endCursor;
      await createPagesForType(page, lang, newEndCursor, documents);
    } else {
      createDocumentPreviewPage(createPage, page, lang);
      createDocumentPages(createPage, documents, options, page);
    }
  }

  // Prepare to create all the pages
  const pages: Page[] = options.pages || [];
  const pageCreators: Promise<any>[] = [];

  // Create pageCreator promises for each page/language combination
  pages.forEach(
    (page: Page): void => {
      const langs = page.langs ||
        options.langs ||
        (options.defaultLang && [options.defaultLang]) || [null];
      langs.forEach((lang: string | null) => pageCreators.push(createPagesForType(page, lang)));
    }
  );

  // Run all pageCreators simultaneously
  await Promise.all(pageCreators);
};

exports.createResolvers = (
  { actions, cache, createNodeId, createResolvers, store, reporter }: any,
  { sharpKeys = [/image|photo|picture/] }: PluginOptions
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
