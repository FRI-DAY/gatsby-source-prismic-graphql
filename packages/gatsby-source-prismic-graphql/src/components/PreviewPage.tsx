import React from 'react';
import Prismic from 'prismic-javascript';
import { linkResolver, getCookies } from '../utils';
import { parseQueryString } from '../utils/parseQueryString';
import { Page } from '../interfaces/PluginOptions';
import { Document } from 'prismic-javascript/d.ts/documents';
import { KEYS } from '../constants';

interface Variation {
  id: string;
  label: string;
  ref: string;
}

export default class PreviewPage extends React.Component<any> {
  public componentDidMount() {
    this.preview();
  }

  get config() {
    return this.props.prismic.options;
  }

  public async preview() {
    const { location } = this.props;
    const qs = parseQueryString(String(location.search).substr(1));
    const token = qs.get('token');
    const experiment = qs.get('experiment');
    const documentId = qs.get('documentId');

    // Expiration date of cookie
    const now = new Date();
    now.setHours(now.getHours() + 1);

    const api = await Prismic.getApi(`https://${this.config.repositoryName}.cdn.prismic.io/api/v2`);

    if (token) {
      await api.previewSession(token, linkResolver, '/');
      document.cookie = `${Prismic.previewCookie}=${token}; expires=${now.toUTCString()}; path=/`;

      if (!documentId) {
        return this.redirect();
      }

      const doc = await api.getByID(documentId);

      return this.redirect(doc);
    } else if (experiment) {
      const runningVariations: Variation[] = [];

      if (api.experiments.running && api.experiments.running.length) {
        runningVariations.concat(
          ...api.experiments.running.map(experiment => experiment.data.variations)
        );
      }

      if (experiment && runningVariations.length) {
        const matchedVariation = runningVariations.find(
          variation => variation.label.toLowerCase().replace(' ', '-') === experiment
        );

        if (matchedVariation) {
          document.cookie = `${Prismic.experimentCookie}=${
            matchedVariation.ref
          }; expires=${now.toUTCString()}; path=/`;
          this.redirect();
        }
      }
    } else if (documentId) {
      const cookies = getCookies();
      const doc = await api.getByID(documentId);
      const preview = cookies.has(Prismic.previewCookie) || cookies.has(Prismic.experimentCookie);
      this.redirect(preview && doc ? doc : undefined);
    } else {
      this.redirect();
    }
  }

  public redirect(doc?: Document) {
    if (doc) {
      const previewPage: Page | null = (this.config.pages || []).find(
        (page: Page) => page.type.toLowerCase() === doc.type.toLowerCase()
      );
      if (previewPage) {
        console.log(doc);
        const url =
          previewPage.path +
          '?' +
          KEYS.map(key => {
            return `${key}=${encodeURIComponent(doc[key] || '')}`;
          }).join('&');
        console.log(url);
        return;
        window.location = url as any;
        return;
      }
    }
    window.location = '/' as any;
  }

  public render() {
    return null;
  }
}
