import React from 'react';
import { PluginOptions } from './interfaces/PluginOptions';

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
