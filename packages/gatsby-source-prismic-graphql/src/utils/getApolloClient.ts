import {
  IntrospectionFragmentMatcher,
  InMemoryCache,
  ApolloClient,
  NormalizedCacheObject,
} from 'apollo-boost';
import { createHttpLink } from './index';
import introspectionQueryResultData from '../fragmentTypes.json';

let client: null | ApolloClient<NormalizedCacheObject> = null;

export const getApolloClient = (
  repositoryName: string,
  accessToken?: string
): ApolloClient<NormalizedCacheObject> => {
  if (client === null) {
    const fragmentMatcher = new IntrospectionFragmentMatcher({
      introspectionQueryResultData,
    });
    const link = createHttpLink(repositoryName, accessToken);
    client = new ApolloClient({
      ssrMode: true,
      link: link,
      cache: new InMemoryCache({ fragmentMatcher }),
    });
  }
  return client;
};
