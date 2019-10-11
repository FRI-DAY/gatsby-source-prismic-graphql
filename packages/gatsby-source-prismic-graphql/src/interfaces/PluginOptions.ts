import { Document } from 'prismic-javascript/d.ts/documents';

export interface AlternateLanguage {
  id: string;
  uid: string;
  type: string;
  lang: string;
}

export type LinkResolver = (doc?: Document) => string;

export interface Edge {
  node: {
    _meta: Document;
  };
  cursor: string;
  endCursor: string;
}

export interface Page {
  type: string;
  component: string;
  langs?: string[];
  sortBy?: string;
  /**
   * placeholder page path
   */
  path?: string;
  /**
   * client page match route
   */
  matchPath?: string;
}

export interface PluginOptions {
  repositoryName: string;
  accessToken?: null | string;
  prismicRef?: null | string;
  linkResolver: LinkResolver;
  defaultLang?: string;
  langs?: string[];
  passContextKeys?: string[];
  previewPath?: string;
  previews?: boolean;
  pages?: Page[];
  omitPrismicScript?: boolean;
  sharpKeys: RegExp[] | string[];
}
