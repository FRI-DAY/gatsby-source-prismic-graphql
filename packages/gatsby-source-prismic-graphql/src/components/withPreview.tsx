import React from 'react';
import { WrapPage } from './WrapPage';

export const withPreview = (render: Function, query: any, fragments: any = []) => {
  if (typeof window === 'undefined') {
    return render;
  }

  const RenderComponent = ({ data }: any) => render(data);
  const resolvedQuery = `${query.source}${fragments.map((item: any) => item.source).join(' ')}`;

  return (data: any) => (
    <WrapPage
      data={data}
      pageContext={{
        rootQuery: resolvedQuery,
        pagedQueryResults: {},
        fragments: [],
        uid: '',
        id: '',
        lang: '',
      }}
      options={(window as any).prismicGatsbyOptions || {}}
    >
      <RenderComponent />
    </WrapPage>
  );
};
