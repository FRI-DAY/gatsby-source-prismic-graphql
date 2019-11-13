import { getIsolatedQuery } from 'gatsby-source-graphql-universal';
import { pick, get } from 'lodash';
import React from 'react';
import traverse from 'traverse';
import { inPreview, parseQueryString } from '../utils';
import { createLoadingScreen } from '../utils/createLoadingScreen';
import { getApolloClient } from '../utils/getApolloClient';
import { KEYS, fieldName, typeName } from '../constants';

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
  loading: boolean;
  error: Error | null;
}

export class WrapPage extends React.PureComponent<any, WrapPageState> {
  state: WrapPageState = {
    data: {
      ...this.props.data,
      inPreview: false,
    },
    loading: false,
    error: null,
  };

  get params() {
    const params: any = { ...this.props.pageContext };

    const qs = parseQueryString(String(get(this.props, 'location.search', '?')).substr(1));
    KEYS.forEach((key: string) => {
      if (!params[key] && qs.has(key)) {
        params[key] = qs.get(key);
      }
    });
    return params;
  }

  getQuery() {
    const { rootQuery, queryFragments = [] } = this.props.pageContext;
    const result = `${rootQuery}${queryFragments.join(' ')}`;
    return result
      .split(/\n\r?/gm)
      .map((current: string) => current.trim())
      .join(' ')
      .replace(/\{\s+/gm, '{')
      .replace(/\s+\{/gm, '{')
      .replace(/\s+\}/gm, '}')
      .replace(/\s+\}/gm, '}');
  }

  componentDidMount() {
    const { pageContext, options } = this.props;
    const { rootQuery = null } = pageContext;

    if (inPreview() && options.previews !== false && rootQuery !== null) {
      const closeLoading = createLoadingScreen();
      this.setState({ loading: true });
      this.load()
        .then(res => {
          this.setState({
            loading: false,
            error: null,
            data: { ...this.state.data, prismic: res.data, inPreview: true },
          });
          closeLoading();
        })
        .catch(error => {
          this.setState({ loading: false, error });
          console.error(error);
          closeLoading();
        });
    }
  }

  load = () => {
    const query = this.getQuery();
    const keys = [...(this.props.options.passContextKeys || []), ...KEYS];
    const variables = { ...pick(this.params, keys) };

    const { repositoryName, accessToken } = this.props.options;

    const client = getApolloClient(repositoryName, accessToken);
    return client.query({
      query: stripSharp(getIsolatedQuery(query, fieldName, typeName)),
      fetchPolicy: 'network-only',
      variables,
    });
  };

  render() {
    const children = this.props.children as any;

    return React.cloneElement(children, {
      ...children.props,
      prismic: {
        options: this.props.options,
        loading: this.state.loading,
        error: this.state.error,
        load: this.load,
      },
      data: this.state.data,
    });
  }
}
