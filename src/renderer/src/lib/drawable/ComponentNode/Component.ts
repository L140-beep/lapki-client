import { CanvasScheme } from '@renderer/lib/CanvasScheme';
import { Shape } from '@renderer/lib/drawable/Shape';
import { Dimensions, Point } from '@renderer/lib/types';
import { getColor } from '@renderer/theme';

import { MarkedIconData, picto } from '../Picto';

const fontSizeMark = 32;
/**
 * Представление компонента в схемотехническом экране
 */
export class DrawableComponent extends Shape {
  isSelected = false;
  icon: MarkedIconData;
  __position: Point;
  __dimensions: Dimensions;
  constructor(app: CanvasScheme, id: string, icon: MarkedIconData, parent?: Shape) {
    super(app, id, parent);
    this.icon = icon;
    this.__position = {
      x: 0,
      y: 0,
    };
    this.__dimensions = {
      width: 90,
      height: 50,
    };
  }

  get computedStyles() {
    const scale = this.app.controller.model.data.scale;

    return {
      padding: 10 / scale,
      fontSize: 16 / scale,
      borderRadius: 6 / scale,
      color: getColor('border-primary'),
    };
  }

  get data() {
    return this.app.controller.model.data.elements.components[this.id];
  }

  get position() {
    return this.__position;
  }
  set position(value) {
    this.__position = value;
    if (this.data) {
      this.data.position = value;
    }
  }

  get dimensions() {
    return this.__dimensions;
  }
  set dimensions(_value) {
    this.__dimensions = _value;
  }

  draw(ctx: CanvasRenderingContext2D, _canvas: HTMLCanvasElement) {
    this.drawBody(ctx);

    if (this.isSelected) {
      this.drawSelection(ctx);
    }
  }

  private drawBody(ctx: CanvasRenderingContext2D) {
    const platform = this.app.controller.platform;
    if (!platform || !this.icon) return;

    const { x, y, width, height } = this.drawBounds;
    picto.drawRect(ctx, x, y, width, height, undefined, undefined, 50);
    picto.drawImage(
      ctx,
      this.icon,
      {
        x: x,
        y: y,
        width: width,
        height: height,
      },
      fontSizeMark
    );
  }

  private drawSelection(ctx: CanvasRenderingContext2D) {
    const { x, y, width, height } = this.drawBounds;
    const { borderRadius } = this.computedStyles;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFF';

    ctx.roundRect(
      x,
      y,
      width / this.app.controller.model.data.scale,
      height / this.app.controller.model.data.scale,
      borderRadius
    );
    ctx.stroke();
  }

  setIsSelected(value: boolean) {
    this.isSelected = value;
  }
}