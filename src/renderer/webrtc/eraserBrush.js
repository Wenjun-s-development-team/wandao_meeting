(function () {
  /** ERASER_START */

  /**
   * add `eraser` to enlivened props
   */
  fabric.Object.ENLIVEN_PROPS.push('eraser')

  const __drawClipPath = fabric.Object.prototype._drawClipPath
  const _needsItsOwnCache = fabric.Object.prototype.needsItsOwnCache
  const _toObject = fabric.Object.prototype.toObject
  const _getSvgCommons = fabric.Object.prototype.getSvgCommons
  const __createBaseClipPathSVGMarkup = fabric.Object.prototype._createBaseClipPathSVGMarkup
  const __createBaseSVGMarkup = fabric.Object.prototype._createBaseSVGMarkup

  fabric.Object.prototype.cacheProperties.push('eraser')
  fabric.Object.prototype.stateProperties.push('eraser')

  /**
   * @fires erasing:end
   */
  fabric.util.object.extend(fabric.Object.prototype, {
    /**
     * Indicates whether this object can be erased by {@link fabric.EraserBrush}
     * The `deep` option introduces fine grained control over a group's `erasable` property.
     * When set to `deep` the eraser will erase nested objects if they are erasable, leaving the group and the other objects untouched.
     * When set to `true` the eraser will erase the entire group. Once the group changes the eraser is propagated to its children for proper functionality.
     * When set to `false` the eraser will leave all objects including the group untouched.
     * @tutorial {@link http://fabricjs.com/erasing#erasable_property}
     * @type boolean | 'deep'
     * @default true
     */
    erasable: true,

    /**
     * @tutorial {@link http://fabricjs.com/erasing#eraser}
     * @type fabric.Eraser
     */
    eraser: undefined,

    /**
     * @override
     * @returns Boolean
     */
    needsItsOwnCache() {
      return _needsItsOwnCache.call(this) || !!this.eraser
    },

    /**
     * draw eraser above clip path
     * @override
     * @private
     * @param {CanvasRenderingContext2D} ctx
     * @param {fabric.Object} clipPath
     */
    _drawClipPath(ctx, clipPath) {
      __drawClipPath.call(this, ctx, clipPath)
      if (this.eraser) {
        //  update eraser size to match instance
        const size = this._getNonTransformedDimensions()
        this.eraser.isType('eraser') && this.eraser.set({
          width: size.x,
          height: size.y,
        })
        __drawClipPath.call(this, ctx, this.eraser)
      }
    },

    /**
     * Returns an object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {object} Object representation of an instance
     */
    toObject(propertiesToInclude) {
      const object = _toObject.call(this, ['erasable'].concat(propertiesToInclude))
      if (this.eraser && !this.eraser.excludeFromExport) {
        object.eraser = this.eraser.toObject(propertiesToInclude)
      }
      return object
    },

    /* _TO_SVG_START_ */
    /**
     * Returns id attribute for svg output
     * @override
     * @return {string}
     */
    getSvgCommons() {
      return _getSvgCommons.call(this) + (this.eraser ? `mask="url(#${this.eraser.clipPathId})" ` : '')
    },

    /**
     * create svg markup for eraser
     * use <mask> to achieve erasing for svg, credit: https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * must be called before object markup creation as it relies on the `clipPathId` property of the mask
     * @param {Function} [reviver]
     * @returns
     */
    _createEraserSVGMarkup(reviver) {
      if (this.eraser) {
        this.eraser.clipPathId = `MASK_${fabric.Object.__uid++}`
        return [
          '<mask id="',
          this.eraser.clipPathId,
          '" >',
          this.eraser.toSVG(reviver),
          '</mask>',
          '\n',
        ].join('')
      }
      return ''
    },

    /**
     * @private
     */
    _createBaseClipPathSVGMarkup(objectMarkup, options) {
      return [
        this._createEraserSVGMarkup(options && options.reviver),
        __createBaseClipPathSVGMarkup.call(this, objectMarkup, options),
      ].join('')
    },

    /**
     * @private
     */
    _createBaseSVGMarkup(objectMarkup, options) {
      return [
        this._createEraserSVGMarkup(options && options.reviver),
        __createBaseSVGMarkup.call(this, objectMarkup, options),
      ].join('')
    },
    /* _TO_SVG_END_ */
  })

  const __restoreObjectsState = fabric.Group.prototype._restoreObjectsState
  fabric.util.object.extend(fabric.Group.prototype, {
    /**
     * @private
     * @param {fabric.Path} path
     */
    _addEraserPathToObjects(path) {
      this._objects.forEach((object) => {
        // eslint-disable-next-line no-useless-call
        fabric.EraserBrush.prototype._addPathToObjectEraser.call(
          fabric.EraserBrush.prototype,
          object,
          path,
        )
      })
    },

    /**
     * Applies the group's eraser to its objects
     * @tutorial {@link http://fabricjs.com/erasing#erasable_property}
     */
    applyEraserToObjects() {
      const eraser = this.eraser
      if (eraser) {
        delete this.eraser
        const transform = this.calcTransformMatrix()
        eraser.clone((eraser) => {
          const clipPath = this.clipPath
          eraser.getObjects('path')
            .forEach((path) => {
              //  first we transform the path from the group's coordinate system to the canvas'
              const originalTransform = fabric.util.multiplyTransformMatrices(
                transform,
                path.calcTransformMatrix(),
              )
              fabric.util.applyTransformToObject(path, originalTransform)
              if (clipPath) {
                clipPath.clone((_clipPath) => {
                  // eslint-disable-next-line no-useless-call
                  const eraserPath = fabric.EraserBrush.prototype.applyClipPathToPath.call(
                    fabric.EraserBrush.prototype,
                    path,
                    _clipPath,
                    transform,
                  )
                  this._addEraserPathToObjects(eraserPath)
                }, ['absolutePositioned', 'inverted'])
              } else {
                this._addEraserPathToObjects(path)
              }
            })
        })
      }
    },

    /**
     * Propagate the group's eraser to its objects, crucial for proper functionality of the eraser within the group and nested objects.
     * @private
     */
    _restoreObjectsState() {
      this.erasable === true && this.applyEraserToObjects()
      return __restoreObjectsState.call(this)
    },
  })

  /**
   * An object's Eraser
   * @private
   * @class fabric.Eraser
   * @extends fabric.Group
   * @memberof fabric
   */
  fabric.Eraser = fabric.util.createClass(fabric.Group, {
    /**
     * @readonly
     * @static
     */
    type: 'eraser',

    /**
     * @default
     */
    originX: 'center',

    /**
     * @default
     */
    originY: 'center',

    drawObject(ctx) {
      ctx.save()
      ctx.fillStyle = 'black'
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
      ctx.restore()
      this.callSuper('drawObject', ctx)
    },

    /**
     * eraser should retain size
     * dimensions should not change when paths are added or removed
     * handled by {@link fabric.Object#_drawClipPath}
     * @override
     * @private
     */
    _getBounds() {
      //  noop
    },

    /* _TO_SVG_START_ */
    /**
     * Returns svg representation of an instance
     * use <mask> to achieve erasing for svg, credit: https://travishorn.com/removing-parts-of-shapes-in-svg-b539a89e5649
     * for masking we need to add a white rect before all paths
     *
     * @param {Function} [reviver] Method for further parsing of svg representation.
     * @return {string} svg representation of an instance
     */
    _toSVG(reviver) {
      const svgString = ['<g ', 'COMMON_PARTS', ' >\n']
      const x = -this.width / 2; const y = -this.height / 2
      const rectSvg = [
        '<rect ',
        'fill="white" ',
        'x="',
        x,
        '" y="',
        y,
        '" width="',
        this.width,
        '" height="',
        this.height,
        '" />\n',
      ].join('')
      svgString.push('\t\t', rectSvg)
      for (let i = 0, len = this._objects.length; i < len; i++) {
        svgString.push('\t\t', this._objects[i].toSVG(reviver))
      }
      svgString.push('</g>\n')
      return svgString
    },
    /* _TO_SVG_END_ */
  })

  /**
   * Returns {@link fabric.Eraser} instance from an object representation
   * @static
   * @memberOf fabric.Eraser
   * @param {object} object Object to create an Eraser from
   * @param {Function} [callback] Callback to invoke when an eraser instance is created
   */
  fabric.Eraser.fromObject = function (object, callback) {
    const objects = object.objects
    fabric.util.enlivenObjects(objects, (enlivenedObjects) => {
      const options = fabric.util.object.clone(object, true)
      delete options.objects
      fabric.util.enlivenObjectEnlivables(object, options, () => {
        callback && callback(new fabric.Eraser(enlivenedObjects, options, true))
      })
    })
  }

  const __renderOverlay = fabric.Canvas.prototype._renderOverlay
  /**
   * @fires erasing:start
   * @fires erasing:end
   */
  fabric.util.object.extend(fabric.Canvas.prototype, {
    /**
     * Used by {@link #renderAll}
     * @returns boolean
     */
    isErasing() {
      return (
        this.isDrawingMode
        && this.freeDrawingBrush
        && this.freeDrawingBrush.type === 'eraser'
        && this.freeDrawingBrush._isErasing
      )
    },

    /**
     * While erasing the brush clips out the erasing path from canvas
     * so we need to render it on top of canvas every render
     * @param {CanvasRenderingContext2D} ctx
     */
    _renderOverlay(ctx) {
      __renderOverlay.call(this, ctx)
      if (this.isErasing() && !this.freeDrawingBrush.inverted) {
        this.freeDrawingBrush._render()
      }
    },
  })

  /**
   * EraserBrush class
   * Supports selective erasing meaning that only erasable objects are affected by the eraser brush.
   * Supports **inverted** erasing meaning that the brush can "undo" erasing.
   *
   * In order to support selective erasing, the brush clips the entire canvas
   * and then draws all non-erasable objects over the erased path using a pattern brush so to speak (masking).
   * If brush is **inverted** there is no need to clip canvas. The brush draws all erasable objects without their eraser.
   * This achieves the desired effect of seeming to erase or unerase only erasable objects.
   * After erasing is done the created path is added to all intersected objects' `eraser` property.
   *
   * In order to update the EraserBrush call `preparePattern`.
   * It may come in handy when canvas changes during erasing (i.e animations) and you want the eraser to reflect the changes.
   *
   * @tutorial {@link http://fabricjs.com/erasing}
   * @class fabric.EraserBrush
   * @extends fabric.PencilBrush
   * @memberof fabric
   */
  fabric.EraserBrush = fabric.util.createClass(
    fabric.PencilBrush,
    /** @lends fabric.EraserBrush.prototype */ {
      type: 'eraser',

      /**
       * When set to `true` the brush will create a visual effect of undoing erasing
       */
      inverted: false,

      /**
       * @private
       */
      _isErasing: false,

      /**
       *
       * @private
       * @param {fabric.Object} object
       * @returns boolean
       */
      _isErasable(object) {
        return object.erasable !== false
      },

      /**
       * @private
       * This is designed to support erasing a collection with both erasable and non-erasable objects.
       * Iterates over collections to allow nested selective erasing.
       * Prepares the pattern brush that will draw on the top context to achieve the desired visual effect.
       * If brush is **NOT** inverted render all non-erasable objects.
       * If brush is inverted render all erasable objects that have been erased with their clip path inverted.
       * This will render the erased parts as if they were not erased.
       *
       * @param {fabric.Collection} collection
       * @param {CanvasRenderingContext2D} ctx
       * @param {{ visibility: fabric.Object[], eraser: fabric.Object[], collection: fabric.Object[] }} restorationContext
       */
      _prepareCollectionTraversal(collection, ctx, restorationContext) {
        collection.forEachObject((obj) => {
          if (obj.forEachObject && obj.erasable === 'deep') {
            //  traverse
            this._prepareCollectionTraversal(obj, ctx, restorationContext)
          } else if (!this.inverted && obj.erasable && obj.visible) {
            //  render only non-erasable objects
            obj.visible = false
            collection.dirty = true
            restorationContext.visibility.push(obj)
            restorationContext.collection.push(collection)
          } else if (this.inverted && obj.visible) {
            //  render only erasable objects that were erased
            if (obj.erasable && obj.eraser) {
              obj.eraser.inverted = true
              obj.dirty = true
              collection.dirty = true
              restorationContext.eraser.push(obj)
              restorationContext.collection.push(collection)
            } else {
              obj.visible = false
              collection.dirty = true
              restorationContext.visibility.push(obj)
              restorationContext.collection.push(collection)
            }
          }
        }, this)
      },

      /**
       * Prepare the pattern for the erasing brush
       * This pattern will be drawn on the top context, achieving a visual effect of erasing only erasable objects
       * @todo decide how overlay color should behave when `inverted === true`, currently draws over it which is undesirable
       * @private
       */
      preparePattern() {
        if (!this._patternCanvas) {
          this._patternCanvas = fabric.util.createCanvasElement()
        }
        let color = this.canvas.backgroundColor
        const canvas = this._patternCanvas
        canvas.width = this.canvas.width
        canvas.height = this.canvas.height
        const patternCtx = canvas.getContext('2d')
        if (this.canvas._isRetinaScaling()) {
          const retinaScaling = this.canvas.getRetinaScaling()
          this.canvas.__initRetinaScaling(retinaScaling, canvas, patternCtx)
        }
        const backgroundImage = this.canvas.backgroundImage
        const bgErasable = backgroundImage && this._isErasable(backgroundImage)
        const overlayImage = this.canvas.overlayImage
        const overlayErasable = overlayImage && this._isErasable(overlayImage)
        if (!this.inverted && ((backgroundImage && !bgErasable) || !!this.canvas.backgroundColor)) {
          if (bgErasable) {
            this.canvas.backgroundImage = undefined
          }
          this.canvas._renderBackground(patternCtx)
          if (bgErasable) {
            this.canvas.backgroundImage = backgroundImage
          }
        } else if (this.inverted && (backgroundImage && bgErasable)) {
          this.canvas.backgroundColor = undefined
          this.canvas._renderBackground(patternCtx)
          this.canvas.backgroundColor = color
        }
        patternCtx.save()
        // eslint-disable-next-line prefer-spread
        patternCtx.transform.apply(patternCtx, this.canvas.viewportTransform)
        const restorationContext = { visibility: [], eraser: [], collection: [] }
        this._prepareCollectionTraversal(this.canvas, patternCtx, restorationContext)
        this.canvas._renderObjects(patternCtx, this.canvas._objects)
        restorationContext.visibility.forEach((obj) => {
          obj.visible = true
        })
        restorationContext.eraser.forEach((obj) => {
          obj.eraser.inverted = false
          obj.dirty = true
        })
        restorationContext.collection.forEach((obj) => {
          obj.dirty = true
        })
        patternCtx.restore()
        if (!this.inverted && ((overlayImage && !overlayErasable) || !!this.canvas.overlayColor)) {
          if (overlayErasable) {
            this.canvas.overlayImage = undefined
          }
          __renderOverlay.call(this.canvas, patternCtx)
          if (overlayErasable) {
            this.canvas.overlayImage = overlayImage
          }
        } else if (this.inverted && (overlayImage && overlayErasable)) {
          color = this.canvas.overlayColor
          this.canvas.overlayColor = undefined
          __renderOverlay.call(this.canvas, patternCtx)
          this.canvas.overlayColor = color
        }
      },

      /**
       * Sets brush styles
       * @private
       * @param {CanvasRenderingContext2D} ctx
       */
      _setBrushStyles(ctx) {
        this.callSuper('_setBrushStyles', ctx)
        ctx.strokeStyle = 'black'
      },

      /**
       * **Customiztion**
       *
       * if you need the eraser to update on each render (i.e animating during erasing) override this method by **adding** the following (performance may suffer):
       * @example
       * ```
       * if(ctx === this.canvas.contextTop) {
       *  this.preparePattern();
       * }
       * ```
       *
       * @override
       * @param {CanvasRenderingContext2D} ctx
       */
      _saveAndTransform(ctx) {
        this.callSuper('_saveAndTransform', ctx)
        this._setBrushStyles(ctx)
        ctx.globalCompositeOperation = ctx === this.canvas.getContext() ? 'destination-out' : 'source-over'
      },

      /**
       * We indicate {@link fabric.PencilBrush} to repaint itself if necessary
       * @returns
       */
      needsFullRender() {
        return true
      },

      /**
       *
       * @param {fabric.Point} pointer
       * @param {fabric.IEvent} options
       * @returns
       */
      onMouseDown(pointer, options) {
        if (!this.canvas._isMainEvent(options.e)) {
          return
        }
        this._prepareForDrawing(pointer)
        // capture coordinates immediately
        // this allows to draw dots (when movement never occurs)
        this._captureDrawingPath(pointer)

        //  prepare for erasing
        this.preparePattern()
        this._isErasing = true
        this.canvas.fire('erasing:start')
        this._render()
      },

      /**
       * Rendering Logic:
       * 1. Use brush to clip canvas by rendering it on top of canvas (unnecessary if `inverted === true`)
       * 2. Render brush with canvas pattern on top context
       *
       */
      _render() {
        let ctx
        if (!this.inverted) {
          //  clip canvas
          ctx = this.canvas.getContext()
          this.callSuper('_render', ctx)
        }
        //  render brush and mask it with image of non erasables
        ctx = this.canvas.contextTop
        this.canvas.clearContext(ctx)
        this.callSuper('_render', ctx)
        ctx.save()
        const t = this.canvas.getRetinaScaling(); const s = 1 / t
        ctx.scale(s, s)
        ctx.globalCompositeOperation = 'source-in'
        ctx.drawImage(this._patternCanvas, 0, 0)
        ctx.restore()
      },

      /**
       * Creates fabric.Path object
       * @override
       * @private
       * @param {(string|number)[][]} pathData Path data
       * @return {fabric.Path} Path to add on canvas
       * @returns
       */
      createPath(pathData) {
        const path = this.callSuper('createPath', pathData)
        path.globalCompositeOperation = this.inverted ? 'source-over' : 'destination-out'
        path.stroke = this.inverted ? 'white' : 'black'
        return path
      },

      /**
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path in canvas coordinate plane
       * @param {fabric.Object} clipPath The clipPath to apply to the path
       * @param {number[]} clipPathContainerTransformMatrix The transform matrix of the object that the clip path belongs to
       * @returns {fabric.Path} path with clip path
       */
      applyClipPathToPath(path, clipPath, clipPathContainerTransformMatrix) {
        const pathInvTransform = fabric.util.invertTransform(path.calcTransformMatrix())
        const clipPathTransform = clipPath.calcTransformMatrix()
        const transform = clipPath.absolutePositioned
          ? pathInvTransform
          : fabric.util.multiplyTransformMatrices(
            pathInvTransform,
            clipPathContainerTransformMatrix,
          )
        //  when passing down a clip path it becomes relative to the parent
        //  so we transform it acoordingly and set `absolutePositioned` to false
        clipPath.absolutePositioned = false
        fabric.util.applyTransformToObject(
          clipPath,
          fabric.util.multiplyTransformMatrices(
            transform,
            clipPathTransform,
          ),
        )
        //  We need to clip `path` with both `clipPath` and it's own clip path if existing (`path.clipPath`)
        //  so in turn `path` erases an object only where it overlaps with all it's clip paths, regardless of how many there are.
        //  this is done because both clip paths may have nested clip paths of their own (this method walks down a collection => this may reccur),
        //  so we can't assign one to the other's clip path property.
        path.clipPath = path.clipPath ? fabric.util.mergeClipPaths(clipPath, path.clipPath) : clipPath
        return path
      },

      /**
       * Utility to apply a clip path to a path.
       * Used to preserve clipping on eraser paths in nested objects.
       * Called when a group has a clip path that should be applied to the path before applying erasing on the group's objects.
       * @param {fabric.Path} path The eraser path
       * @param {fabric.Object} object The clipPath to apply to path belongs to object
       * @param {Function} callback Callback to be invoked with the cloned path after applying the clip path
       */
      clonePathWithClipPath(path, object, callback) {
        const objTransform = object.calcTransformMatrix()
        const clipPath = object.clipPath
        path.clone((_path) => {
          clipPath.clone((_clipPath) => {
            callback(this.applyClipPathToPath(_path, _clipPath, objTransform))
          }, ['absolutePositioned', 'inverted'])
        })
      },

      /**
       * Adds path to object's eraser, walks down object's descendants if necessary
       *
       * @fires erasing:end on object
       * @param {fabric.Object} obj
       * @param {fabric.Path} path
       */
      _addPathToObjectEraser(obj, path) {
        //  object is collection, i.e group
        if (obj.forEachObject && obj.erasable === 'deep') {
          const targets = obj._objects.filter((_obj) => {
            return _obj.erasable
          })
          if (targets.length > 0 && obj.clipPath) {
            this.clonePathWithClipPath(path, obj, (_path) => {
              targets.forEach((_obj) => {
                this._addPathToObjectEraser(_obj, _path)
              })
            })
          } else if (targets.length > 0) {
            targets.forEach((_obj) => {
              this._addPathToObjectEraser(_obj, path)
            })
          }
          return
        }
        //  prepare eraser
        let eraser = obj.eraser
        if (!eraser) {
          eraser = new fabric.Eraser()
          obj.eraser = eraser
        }
        //  clone and add path
        path.clone((path) => {
          // http://fabricjs.com/using-transformations
          const desiredTransform = fabric.util.multiplyTransformMatrices(
            fabric.util.invertTransform(
              obj.calcTransformMatrix(),
            ),
            path.calcTransformMatrix(),
          )
          fabric.util.applyTransformToObject(path, desiredTransform)
          eraser.addWithUpdate(path)
          obj.set('dirty', true)
          obj.fire('erasing:end', {
            path,
          })
          if (obj.group && Array.isArray(_this.__subTargets)) {
            _this.__subTargets.push(obj)
          }
        })
      },

      /**
       * Add the eraser path to canvas drawables' clip paths
       *
       * @param {fabric.Canvas} source
       * @param {fabric.Canvas} path
       * @returns {object} canvas drawables that were erased by the path
       */
      applyEraserToCanvas(path) {
        const canvas = this.canvas
        const drawables = {};
        [
          'backgroundImage',
          'overlayImage',
        ].forEach((prop) => {
          const drawable = canvas[prop]
          if (drawable && drawable.erasable) {
            this._addPathToObjectEraser(drawable, path)
            drawables[prop] = drawable
          }
        }, this)
        return drawables
      },

      /**
       * On mouseup after drawing the path on contextTop canvas
       * we use the points captured to create an new fabric path object
       * and add it to every intersected erasable object.
       */
      _finalizeAndAddPath() {
        const ctx = this.canvas.contextTop; const canvas = this.canvas
        ctx.closePath()
        if (this.decimate) {
          this._points = this.decimatePoints(this._points, this.decimate)
        }

        // clear
        canvas.clearContext(canvas.contextTop)
        this._isErasing = false

        const pathData = this._points && this._points.length > 1
          ? this.convertPointsToSVGPath(this._points)
          : null
        if (!pathData || this._isEmptySVGPath(pathData)) {
          canvas.fire('erasing:end')
          // do not create 0 width/height paths, as they are
          // rendered inconsistently across browsers
          // Firefox 4, for example, renders a dot,
          // whereas Chrome 10 renders nothing
          canvas.requestRenderAll()
          return
        }

        const path = this.createPath(pathData)
        //  needed for `intersectsWithObject`
        path.setCoords()
        //  commense event sequence
        canvas.fire('before:path:created', { path })

        // finalize erasing
        const drawables = this.applyEraserToCanvas(path)
        this.__subTargets = []
        const targets = []
        canvas.forEachObject((obj) => {
          if (obj.erasable && obj.intersectsWithObject(path, true, true)) {
            this._addPathToObjectEraser(obj, path)
            targets.push(obj)
          }
        })
        //  fire erasing:end
        canvas.fire('erasing:end', {
          path,
          targets,
          subTargets: this.__subTargets,
          drawables,
        })
        delete this.__subTargets

        canvas.requestRenderAll()
        this._resetShadow()

        // fire event 'path' created
        canvas.fire('path:created', { path })
      },
    },
  )

  /** ERASER_END */
})()
