export type ReindeerSkin = 'BROWN' | 'WHITE';
export type AntlerType = 'OPTION-01' | 'OPTION-02' | 'OPTION-03';
export type MufflerColor = 'RED' | 'GREEN' | 'PURPLE';

export const REINDEER_IMAGES = {
  BROWN: {
    'OPTION-01': {
      RED: 'Skin Color=Brown, Antlers=Option-01(Heart Shape), Muffler=Red.png',
      GREEN:
        'Skin Color=Brown, Antlers=Option-01(Heart Shape), Muffler=Green.png',
      PURPLE:
        'Skin Color=Brown, Antlers=Option-01(Heart Shape), Muffler=Purple.png',
    },
    'OPTION-02': {
      RED: 'Skin Color=Brown, Antlers=Option-02, Muffler=Red.png',
      GREEN: 'Skin Color=Brown, Antlers=Option-02, Muffler=Green.png',
      PURPLE: 'Skin Color=Brown, Antlers=Option-02, Muffler=Purple.png',
    },
    'OPTION-03': {
      RED: 'Skin Color=Brown, Antlers=Option-03, Muffler=Red.png',
      GREEN: 'Skin Color=Brown, Antlers=Option-03, Muffler=Green.png',
      PURPLE: 'Skin Color=Brown, Antlers=Option-03, Muffler=Purple.png',
    },
  },
  WHITE: {
    'OPTION-01': {
      RED: 'Skin Color=White Blue, Antlers=Option-01(Heart Shape), Muffler=Red.png',
      GREEN:
        'Skin Color=White Blue, Antlers=Option-01(Heart Shape), Muffler=Green.png',
      PURPLE:
        'Skin Color=White Blue, Antlers=Option-01(Heart Shape), Muffler=Purple.png',
    },
    'OPTION-02': {
      RED: 'Skin Color=White Blue, Antlers=Option-02, Muffler=Red.png',
      GREEN: 'Skin Color=White Blue, Antlers=Option-02, Muffler=Green.png',
      PURPLE: 'Skin Color=White Blue, Antlers=Option-02, Muffler=Purple.png',
    },
    'OPTION-03': {
      RED: 'Skin Color=White Blue, Antlers=Option-03, Muffler=Red.png',
      GREEN: 'Skin Color=White Blue, Antlers=Option-03, Muffler=Green.png',
      PURPLE: 'Skin Color=White Blue, Antlers=Option-03, Muffler=Purple.png',
    },
  },
};

export interface ReindeerImageOptions {
  skinColor: ReindeerSkin;
  antlerType: AntlerType;
  mufflerColor: MufflerColor;
}

export const getReindeerImageUrl = (options: ReindeerImageOptions): string => {
  const baseUrl =
    'https://letter-bucket.s3.ap-northeast-2.amazonaws.com/images/';
  const fileName =
    REINDEER_IMAGES[options.skinColor][options.antlerType][
      options.mufflerColor
    ];
  return `${baseUrl}${fileName}`;
};
