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
  };
  cursor: string;
  endCursor: string;
}

export interface Page {
  type: string;
  component: string;
  fragments?: string;
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
