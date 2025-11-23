import type { Schema, Struct } from '@strapi/strapi';

export interface ButtonDownloadButton extends Struct.ComponentSchema {
  collectionName: 'components_button_download_buttons';
  info: {
    displayName: 'download-button';
    icon: 'arrowDown';
  };
  attributes: {
    icon: Schema.Attribute.Text;
    platform: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'button.download-button': ButtonDownloadButton;
    }
  }
}
