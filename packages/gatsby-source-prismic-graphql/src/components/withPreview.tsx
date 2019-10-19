import React from 'react';
import { WrapPage } from './WrapPage';

export const withPreview = (render: Function, query: any, fragments: any = []) => {
  if (typeof window === 'undefined') {
    return render;
  }

  if (!render) {
    return null;
  }

  const RenderComponent = ({ data }: any) => render(data);

  return (data: any) => (
    <WrapPage
      data={data}
      pageContext={{
        rootQuery: query.source,
        queryFragments: fragments.map((item: any) => item.source),
      }}
      options={(window as any).prismicGatsbyOptions || {}}
    >
      <RenderComponent />
    </WrapPage>
  );
};
