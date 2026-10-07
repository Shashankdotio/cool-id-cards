import type { CardTemplate } from '../../types'

const template: CardTemplate = {
  id: 'loki-tva',
  title: 'loki tva id card',
  caption: 'loki: tva id from doomsday',
  orientation: 'portrait',
  sizeMm: { width: 85.6, height: 54 },
  previewImage: '/templates/tva/loki_tva_id_front.png',
  front: {
    backgroundImage: '/templates/tva/loki_tva_id_front.png',
    fields: [
      {
        id: 'photo',
        type: 'photo',
        x: 24.5,
        y: 46.5,
        width: 51,
        height: 41,
        hideIfPhotoMissing: true,
        photoFilter: {
          valueId: 'photoFilter',
          enabledValue: 'tva',
          intensityId: 'filterIntensity',
          effect: 'tva',
        },
      },
    ],
  },
  back: {
    backgroundImage: '/templates/tva/loki_tva_id_back.png',
    fields: [],
  },
  options: [
    { type: 'photo', id: 'photo', label: 'photo' },
    {
      type: 'select',
      id: 'photoFilter',
      label: 'photo filter',
      defaultValue: 'tva',
      choices: ['original', 'tva'],
    },
    {
      type: 'range',
      id: 'filterIntensity',
      label: 'filter intensity',
      defaultValue: '75',
      min: 0,
      max: 100,
      step: 1,
    },
  ],
}

export default template
