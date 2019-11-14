import { getIsolatedQuery } from 'gatsby-source-graphql-universal';
import { get } from 'lodash';
import React from 'react';
import traverse from 'traverse';
import { inPreview, parseQueryString, resolveQuery } from '../utils';
import { createLoadingScreen } from '../utils/createLoadingScreen';
import { getApolloClient } from '../utils/getApolloClient';
import { KEYS, fieldName, typeName, StaticQueryVariable } from '../constants';
import { PagedQuery, PluginOptions, Edge, Page } from '../interfaces/PluginOptions';
import { DocumentNode } from 'graphql';
import { GraphqlFragment } from '../utils/graphql';

const stripSharp = (query: any) => {
  return traverse(query).map(function(x) {
    if (
      typeof x === 'object' &&
      x.kind == 'Name' &&
      this.parent &&
      this.parent.node.kind === 'Field' &&
      x.value.match(/Sharp$/)
    ) {
      this.parent.delete();
    }
  });
};

interface WrapPageState {
  data: any;
  pagedQueryResults: any;
  loading: boolean;
  error: Error | null;
}

export class WrapPage extends React.PureComponent<
  {
    data: any;
    pageContext: {
      rootQuery: string | null;
      fragments: GraphqlFragment[];

      page?: Page;
      pagedQueryResults: object;
    } & { [p in StaticQueryVariable]: any };
    options: PluginOptions;
  },
  WrapPageState
> {
  state: WrapPageState = {
    loading: false,
    error: null,
    data: {},
    pagedQueryResults: {},
  };

  runQuery(isolatedQuery: DocumentNode, variables: object) {
    const client = getApolloClient(
      this.props.options.repositoryName,
      this.props.options.accessToken
    );
    return client.query({
      query: isolatedQuery,
      fetchPolicy: 'network-only',
      variables,
    });
  }

  isolateQuery(query: string) {
    return stripSharp(getIsolatedQuery(query, fieldName, typeName));
  }

  getVariables() {
    const qs = parseQueryString(String(get(this.props, 'location.search', '?')).substr(1));
    return KEYS.reduce(
      (result, key) => {
        result[key] = qs.get(key) || this.props.pageContext[key];
        return result;
      },
      {} as { [p in StaticQueryVariable]: any }
    );
  }

  /**
   * loads the root query
   * @param query
   * @param queryFragments
   */
  async loadRootQuery(query: string, fragments: GraphqlFragment[], fragmentNames: string[]) {
    const { data } = await this.runQuery(
      this.isolateQuery(resolveQuery(query, fragments, fragmentNames)),
      this.getVariables()
    );
    return data;
  }

  /**
   * loads paged queries
   * @param pagedQueries
   */
  async loadPagedQueries(pagedQueries: PagedQuery[], fragments: GraphqlFragment[]) {
    const result: {
      [p: string]: Edge[];
    } = {};
    for (const pagedQuery of pagedQueries) {
      let edges: Edge[] = [];
      let pageInfo = {
        hasNextPage: true,
        endCursor: '',
      };

      const query = this.isolateQuery(
        resolveQuery(pagedQuery.query, fragments, pagedQuery.fragments)
      );
      const params = this.getVariables();

      while (pageInfo.hasNextPage) {
        const { data } = (await this.runQuery(query, {
          cursor: pageInfo.endCursor,
          after: pageInfo.endCursor,
          lang: params.lang,
        })) as any;

        pageInfo = data[pagedQuery.name].pageInfo;
        edges = [...edges, ...data[pagedQuery.name].edges];
      }
      result[pagedQuery.name] = edges;
    }
    return result;
  }

  async componentDidMount() {
    const { pageContext, options } = this.props;
    const { rootQuery, page = {} as Page, fragments } = pageContext;
    const pagedQueries = page.pagedQueries || [];

    if (
      !inPreview() ||
      options.previews === false ||
      (rootQuery === null && pagedQueries.length === 0)
    ) {
      return;
    }

    const closeLoading = createLoadingScreen();
    this.setState({ loading: true });

    try {
      let rootQueryData = {};
      let pagedQueryResults = {};

      if (rootQuery !== null) {
        rootQueryData = await this.loadRootQuery(rootQuery, fragments, page.fragments || []);
      }
      pagedQueryResults = await this.loadPagedQueries(pagedQueries, fragments);

      this.setState({
        loading: false,
        error: null,
        data: rootQueryData,
        pagedQueryResults,
      });
      closeLoading();
    } catch (error) {
      this.setState({ loading: false, error });
      console.error(error);
      closeLoading();
    }
  }

  render() {
    const children = this.props.children as any;

    return React.cloneElement(children, {
      ...children.props,

      prismic: {
        options: this.props.options,
        loading: this.state.loading,
        error: this.state.error,
      },
      data: {
        ...this.props.data,
        ...this.state.data,
      },
      pagedResults: {
        ...this.props.pageContext.pagedQueryResults,
        ...this.state.pagedQueryResults,
      },
    });
  }
}
