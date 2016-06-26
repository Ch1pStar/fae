export default class Consts {}

Consts.VERSION = '{{version}}';

Consts.BLACK = [0, 0, 0, 255];

// component size of the elements in the vertex array
Consts.COMPONENT_SIZE = {
    POSITION_2D:    2,
    POSITION_3D:    3,
    COLOR:          1,
    TEX_COORDS:     2,
    NORMAL:         3,
};
Object.freeze(Consts.COMPONENT_SIZE);