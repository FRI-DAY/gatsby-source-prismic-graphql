export interface PrismicMetaProps {
  id: string;
  uid?: string;
  type: string;
  lang: string | null;
}

export interface PrismicInternalLinkProps {
  link_type: 'Link.document';
  _meta: PrismicMetaProps;
}

export interface PrismicExternalLinkProps {
  link_type: 'Link.web';
  url: string;
}

export interface PrismicRichTextInternalLinkProps extends PrismicMetaProps {
  link_type: 'Document';
}

export interface PrismicRichTextExternalLinkProps {
  link_type: 'Web';
  url: string;
  target?: string;
}

export type PrismicLinkProps =
  | PrismicInternalLinkProps
  | PrismicExternalLinkProps
  | PrismicRichTextInternalLinkProps
  | PrismicRichTextExternalLinkProps;

export type LinkResolver = <ExtraData = any>(
  linkData?: PrismicLinkProps,
  extraData?: ExtraData
) => string;

export interface Edge {
  node: {
    _meta: PrismicMetaProps;
    [p: string]: any;
  };
  cursor: string;
}

export interface Context {
  [p: string]: any;
}

export interface ContextCallbackVariables {
  id: string;
  uid: string;
  lang: string;
}

export type ContextCallback = (
  graphql: any,
  options: PluginOptions,
  page: Page,
  variables: ContextCallbackVariables
) => Promise<Context> | Context;

export interface PagedQuery {
  query: string;
  name: string;
  fragments: string[];
}

export interface Page {
  type: string;
  component: string;
  fragmentsFile?: string;
  fragments?: string[];
  langs?: string[];
  sortBy?: string;
  path: string;
  extraFields?: string[];
  pagedQueries?: PagedQuery[];

  context?: Context | ContextCallback;
}

export interface PluginOptions {
  repositoryName: string;
  accessToken?: string;
  prismicRef?: null | string;
  linkResolver: LinkResolver;
  defaultLang?: string;
  langs?: string[];
  previewPath?: string;
  previews?: boolean;
  pages?: Page[];
  omitPrismicScript?: boolean;
  sharpKeys: RegExp[] | string[];
  fragmentsFile?: string;
  pagedQueries?: PagedQuery[];
}
