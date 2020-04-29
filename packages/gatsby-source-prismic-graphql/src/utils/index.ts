import { createHttpLink as _createHttpLink } from 'apollo-link-http';
import Prismic from 'prismic-javascript';
import { LinkResolver } from '../interfaces/PluginOptions';
import { ApolloLink } from 'apollo-link';
import { GraphqlFragment } from './graphql';

// keep link resolver function
export let linkResolver: LinkResolver = () => '/';

export function registerLinkResolver(resolver: LinkResolver) {
  linkResolver = resolver;
}

/**
 * pass query string into an object
 * @param qs
 * @param delimiter
 */
export const parseQueryString = (qs: string = '', delimiter: string = '&'): Map<string, string> => {
  return new Map(
    qs.split(delimiter).map(item => {
      const [key, ...value] = item.split('=').map(part => {
        try {
          return decodeURIComponent(part.trim());
        } catch (ex) {
          return part.trim();
        }
      });
      return [key, value.join('=')] as [string, string];
    })
  );
};

/**
 * retries cookies
 */
export const getCookies = () => {
  return typeof window !== 'undefined' ? parseQueryString(document.cookie, ';') : new Map();
};

/**
 * returns boolean indicating if we are running in preview mode
 */
export const inPreview = () => {
  const cookies = getCookies();
  return cookies.has(Prismic.experimentCookie) || cookies.has(Prismic.previewCookie);
};

/**
 * returns the prismic full domain
 * @param repositoryName
 */
export const getPrismicDomain = (repositoryName: string) => {
  return `https://${repositoryName}.prismic.io/`;
};

const refCache = {
  masterRef: '',
};
/**
 * returns the needed prismic headers to
 * @param repositoryName
 * @param accessToken
 */
export const getPrismicHeaders = async (repositoryName: string, accessToken?: string) => {
  let prismicRef;
  if (inPreview()) {
    const cookies = getCookies();
    prismicRef = cookies.get(Prismic.previewCookie) || cookies.get(Prismic.experimentCookie);
  } else if (!refCache.masterRef) {
    const prismicClient = Prismic.client(`${getPrismicDomain(repositoryName)}api`, {
      accessToken,
    });
    refCache.masterRef = prismicRef = (await prismicClient.getApi()).masterRef.ref;
  } else {
    prismicRef = refCache.masterRef;
  }

  if (accessToken) {
    return {
      Authorization: `Token ${accessToken}`,
      'Prismic-ref': prismicRef,
    };
  } else {
    return {
      'Prismic-ref': prismicRef,
    };
  }
};

export const stripWhitespace = (url: string) => {
  const [hostname, qs = ''] = url.split('?');
  const queryString = parseQueryString(qs);
  if (queryString.has('query')) {
    queryString.set(
      'query',
      String(queryString.get('query'))
        .split(/\n\r?/gm)
        .map((current: string) => {
          return current
            .trim()
            .replace(/\#.*/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\{\s+/gm, '{')
            .replace(/\s+\{/gm, '{')
            .replace(/\s+\}/gm, '}')
            .replace(/\s+\}/gm, '}');
        })
        .join(' ')
    );
  }
  const updatedQs = Array.from(queryString)
    .map(n => n.map(j => encodeURIComponent(j)).join('='))
    .join('&');
  return `${hostname}?${updatedQs}`;
};

/**
 * creates apollo link
 * @param repositoryName
 * @param accessToken
 */
export const createHttpLink = (repositoryName: string, accessToken?: string): ApolloLink => {
  return _createHttpLink({
    uri: getPrismicDomain(repositoryName) + 'graphql',

    useGETForQueries: true,

    fetch: async (url: string, options: any) => {
      url = stripWhitespace(url);
      const headers = await getPrismicHeaders(repositoryName, accessToken);
      options.headers = {
        ...(options.headers || {}),
        ...headers,
      };
      return fetch(url, options);
    },
  });
};

export const resolveQuery = (
  query: string,
  fragments: GraphqlFragment[],
  fragmentNames: string[] = []
) => {
  if (fragmentNames.length > 0) {
    return `${query}${fragments
      .filter(current => fragmentNames.includes(current.name))
      .map(current => current.value)
      .join(' ')}`;
  } else {
    return query;
  }
};
