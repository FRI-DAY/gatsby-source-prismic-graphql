export interface AlternateLanguage {
  id: string;
  uid: string;
  type: string;
  lang: string;
}
export interface PrismicMeta {
  id: string;
  uid?: string;
  type: string;
  href: string;
  tags: string[];
  slugs: string[];
  lang?: string;
  alternate_languages: string[];
  first_publication_date: string | null;
  last_publication_date: string | null;
}

export type LinkResolver = (_meta?: PrismicMeta) => string;

export interface Edge {
  node: {
    _meta: PrismicMeta;
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
   * placeholder page path for previewing unpublished pages
   */
  path: string;
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
