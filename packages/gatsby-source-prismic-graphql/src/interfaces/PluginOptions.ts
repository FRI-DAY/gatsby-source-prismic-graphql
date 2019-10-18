export interface PrismicMeta {
  id: string;
  uid?: string;
  type: string;
  lang: string | null;
}

export interface PrismicInternalLink extends PrismicMeta {
  link_type: 'Document';
}

export interface PrismicExternalLink {
  link_type: 'Web';
  url: string;
}

export type PrismicLink = PrismicInternalLink | PrismicExternalLink;

export type LinkResolver = (linkData?: PrismicLink) => string;

export interface Edge {
  node: {
    link_type: string;
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
