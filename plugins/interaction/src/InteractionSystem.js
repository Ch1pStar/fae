import Pointer from './Pointer';
import InteractionComponent from './InteractionComponent';
import { ecs, render/* @ifdef DEBUG */, debug/* @endif */ } from '@fae/core';

const tempCoords = { x: 0, y: 0 };

/**
 * @class
 * @memberof interaction
 */
export default class InteractionSystem extends ecs.System
{
    /**
     * @param {Renderer} renderer - The renderer to handle interactions on.
     */
    constructor(renderer)
    {
        super(renderer, 0, Number.MAX_SAFE_INTEGER);

        /**
         * The currently active pointers.
         *
         * @member {Pointer[]}
         */
        this.pointers = [];

        /**
         * Context-bound version of the handleEvent function.
         *
         * @private
         * @member {function}
         */
        this._boundHandleEvent = this.handleEvent.bind(this);

        // @ifdef DEBUG
        this._eventsBound = false;
        // @endif
    }

    /**
     * Return true if the entity is eligible to the system, false otherwise.
     *
     * @param {Entity} entity - The entity to test.
     * @return {boolean} True if entity should be included.
     */
    test(entity)
    {
        return entity.hasComponent(InteractionComponent);
    }

    /**
     * Converts client coords to world coords.
     *
     * @param {number} x - The x coord, in client space, to convert.
     * @param {number} y - The y coord, in client space, to convert.
     * @param {object} out - The out object to assign values to.
     * @param {number} out.x - The out X coord.
     * @param {number} out.y - The out Y coord.
     * @return {object} An object with x/y properties.
     */
    convertClientToWorld(x, y, out = { x: 0, y: 0 })
    {
        const dom = this.renderer.gl.canvas;
        const rect = dom.getBoundingClientRect();

        out.x = ((x - rect.left) * (dom.width / rect.width));
        out.y = ((y - rect.top) * (dom.height / rect.height));

        return out;
    }

    /**
     * Hit tests the interactable objects and returns the first hit object. Takes
     * world-space coords.
     *
     * @param {number} x - The x coord, in world space, to test.
     * @param {number} y - The y coord, in world space, to test.
     * @return {InteractableObject} The object that was interacted with, null if nothing hits.
     */
    hitTest(x, y)
    {
        for (let i = 0; i < this.entities.length; ++i)
        {
            const pass = this.entities[i].hitTest(x, y);

            if (pass) return pass;
        }

        return null;
    }

    /**
     * Binds all the DOM events to the view passed in, defaulting to the renderer view.
     * If you don't want to manager DOM events on your own, this is a good option to
     * let the manager do it for you.
     *
     * @param {HTMLElement} view - The element to use as the root view.
     */
    bindEvents()
    {
        // @ifdef DEBUG
        debug.ASSERT(!this._eventsBound, 'bindEvents called again after events were already bound.');

        this._eventsBound = true;
        // @endif

        const dom = this.renderer.gl.canvas;

        if (window.PointerEvent)
        {
            dom.addEventListener('pointerdown', this._boundHandleEvent);
            dom.addEventListener('pointermove', this._boundHandleEvent);
            dom.addEventListener('pointerout', this._boundHandleEvent);
            window.addEventListener('pointerup', this._boundHandleEvent);
        }
        else
        {
            dom.addEventListener('mousedown', this._boundHandleEvent);
            dom.addEventListener('mousemove', this._boundHandleEvent);
            dom.addEventListener('mouseout', this._boundHandleEvent);
            window.addEventListener('mouseup', this._boundHandleEvent);

            dom.addEventListener('touchstart', this._boundHandleEvent);
            dom.addEventListener('touchmove', this._boundHandleEvent);
            dom.addEventListener('touchcancel', this._boundHandleEvent);
            window.addEventListener('touchend', this._boundHandleEvent);
        }

        dom.addEventListener('wheel', this._boundHandleEvent);
    }

    /**
     * Unbinds all the DOM events.
     *
     */
    unbindEvents()
    {
        // @ifdef DEBUG
        debug.ASSERT(this._eventsBound, 'unbindEvents called when events were not bound.');

        this._eventsBound = false;
        // @endif

        const dom = this.renderer.gl.canvas;

        if (window.PointerEvent)
        {
            dom.removeEventListener('pointerdown', this._boundHandleEvent);
            dom.removeEventListener('pointermove', this._boundHandleEvent);
            dom.removeEventListener('pointerout', this._boundHandleEvent);
            window.removeEventListener('pointerup', this._boundHandleEvent);
        }
        else
        {
            dom.removeEventListener('mousedown', this._boundHandleEvent);
            dom.removeEventListener('mousemove', this._boundHandleEvent);
            dom.removeEventListener('mouseout', this._boundHandleEvent);
            window.removeEventListener('mouseup', this._boundHandleEvent);

            dom.removeEventListener('touchstart', this._boundHandleEvent);
            dom.removeEventListener('touchmove', this._boundHandleEvent);
            dom.removeEventListener('touchcancel', this._boundHandleEvent);
            window.removeEventListener('touchend', this._boundHandleEvent);
        }

        dom.removeEventListener('wheel', this._boundHandleEvent);
    }

    /**
     * Handles an interaction event, usually this is passed a DOM Event.
     *
     * @param {Event} event - The start event.
     */
    handleEvent(event)
    {
        // add contacts from the event to the interaction
        if (event.changedTouches)
        {
            for (let i = 0; i < event.changedTouches.length; ++i)
            {
                const touch = event.changedTouches;
                const pointer = this._getPointer(touch);
                const worldCoords = this.convertClientToWorld(touch.clientX, touch.clientY, tempCoords);
                const hitObject = this.hitTest(worldCoords.x, worldCoords.y);

                pointer[Pointer.EVENT_CALL_MAP[event.type]](touch, hitObject, worldCoords.x, worldCoords.y);
            }
        }
        else
        {
            const pointer = this._getPointer(event);
            const worldCoords = this.convertClientToWorld(event.clientX, event.clientY, tempCoords);
            const hitObject = this.hitTest(worldCoords.x, worldCoords.y);

            pointer[Pointer.EVENT_CALL_MAP[event.type]](event, hitObject, worldCoords.x, worldCoords.y);
        }
    }

    /**
     * Called when the system is added to the renderer.
     *
     */
    initialize()
    {
        super.initialize();

        this.bindEvents();
    }

    /**
     * Disposes of the system, called when removed from the renderer.
     *
     */
    dispose()
    {
        super.dispose();

        this.unbindEvents();
    }

    /**
     * Destroys this interaction manager.
     *
     */
    destroy()
    {
        super.destroy();

        this.interactions = null;

        this.onInteraction.detachAll();
        this.onInteraction = null;
    }

    /**
     * Gets or creates a pointer of ID/Type
     *
     * @private
     * @param {MouseEvent|PointerEvent|Touch} data - The event data of the contact.
     * @return {Pointer} The pointer to use.
     */
    _getPointer(data)
    {
        let pointerId = 0;

        if (typeof data.pointerId === 'number') pointerId = data.pointerId;
        else if (typeof data.identifier === 'number') pointerId = data.identifier;

        for (let i = 0; i < this.pointers.length; ++i)
        {
            if (this.pointers[i].id === pointerId)
            {
                return this.pointers[i];
            }
        }

        const pointer = new Pointer(pointerId);

        this.pointers.push(pointer);

        return pointer;
    }
}

render.Renderer.addDefaultSystem(InteractionSystem);

/**
 * The interface for an object that can be added to the interaction manager.
 *
 * @interface InteractableObject
 */

/**
 * Checks if the object is "hit" by a point. It should return the "hit" object,
 * generally that is itself. If `true` is returned, then it is assumed the object
 * meant that it was hit itself. If a falsey values (`false`, `null`, etc) is
 * returned it is assumed that the object is not hit at all.
 *
 * @method
 * @name InteractableObject#hitTest
 * @param {number} x - The x coord to test.
 * @param {number} y - The y coord to test.
 * @return {InteractableObject} The hit object, or null if nothing hit.
 */
