import React from 'react';
import { PluginOptions } from './interfaces/PluginOptions';
import { WrapPage } from './components/WrapPage';

interface OnRenderBodyArgs {
  setHeadComponents(args: React.ReactElement<any>[]): void;
  setPostBodyComponents(args: React.ReactElement<any>[]): void;
}

exports.onRenderBody = (
  { setHeadComponents, setPostBodyComponents }: OnRenderBodyArgs,
  options: PluginOptions
) => {
  const accessToken = options.previews ? null : options.accessToken;

  const headComponents = [
    <script
      key="prismic-config"
      dangerouslySetInnerHTML={{
        __html: `
            window.prismic = {
              endpoint: 'https://${options.repositoryName}.prismic.io/api/v2',
            };
            window.prismicGatsbyOptions = ${JSON.stringify({ ...options, accessToken })};
          `,
      }}
    />,
  ];

  const postBodyComponents = [];
  if (options.omitPrismicScript !== true) {
    postBodyComponents.push(
      <script
        key="prismic-script"
        type="text/javascript"
        async
        src="//static.cdn.prismic.io/prismic.min.js"
      />
    );
  }

  setHeadComponents(headComponents);
  setPostBodyComponents(postBodyComponents);
};

interface WrapPageArgs {
  element: any;
  props: any;
}

export const wrapPageElement = ({ element, props }: WrapPageArgs, options: any) => {
  if (props.pageContext.rootQuery || props.pageContext.isPreviewPage) {
    return (
      <WrapPage key={props.location.key} options={options} {...props}>
        {element}
      </WrapPage>
    );
  }
  return element;
};
