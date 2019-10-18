export interface PrismicMeta {
  id: string;
  uid?: string;
  type: string;
  lang: string | null;
}

export interface PrismicInternalLinkProps extends PrismicMeta {
  link_type: 'Document';
}

export interface PrismicExternalLinkProps {
  link_type: 'Web';
  url: string;
  target?: string;
}

export type PrismicLinkProps = PrismicInternalLinkProps | PrismicExternalLinkProps;

export type LinkResolver = <ExtraData = any>(
  linkData?: PrismicLinkProps,
  extraData?: ExtraData
) => string;

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
  path: string;
  extraFields?: string[];
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
