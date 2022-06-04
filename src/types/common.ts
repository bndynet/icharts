export enum Position {
  Top = 'top',
  TopLeft = 'top-left',
  TopRight = 'top-right',
  Bottom = 'bottom',
  BottomLeft = 'bottom-left',
  BottomRight = 'bottom-right',
  Right = 'right',
  Left = 'left',
  Center = 'center',
}

export interface TopRightBottomLeft {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}
