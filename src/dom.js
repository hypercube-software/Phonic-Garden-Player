/*
 * Lightweight API to not depend on jQuery, VueJs or anything else
 * wrapDom() is close to jQuery $()
 * 
 * Some methods can be used to set or get something:
 * - html() gives you innerHTML
 * - html("...") set the innerHTML
 * - the same goes for text(), attr(), value() and data(field) and idata(field)
 * 
 * on() can be used in two ways like we used to do in jQuery (https://api.jquery.com/on/):
 * - on(event,handler)
 * - on(event,selector,handler)
 * 
*/
function domGet(query) {
    const nodeList = document.querySelectorAll(query);
    const result = [];
    for (let i = 0; i < nodeList.length; i++) {
        result.push(wrapDom(nodeList[i]));
    }
    if (result.length == 1)
        return result[0];
    else if (result.length == 0)
        return null;
    else
        return result;
}

function wrapDom(element) {
    if (!element)
        return null;

    const wrapper = {
        element: element,
        text: (text) => {
            if (text) { wrapper.element.textContent = text; }
            return wrapper.element.textContent;
        },
        attr: (name, value) => {
            if (value) {
                wrapper.element.setAttribute(name, value);
            }
            return wrapper.element.getAttribute(name);
        },
        html: (value) => {
            if (value) {
                wrapper.element.innerHTML = value;
            }
            return wrapper.element.innerHTML;
        },
        style: (name,value) => {
            if (value) {
                wrapper.element.style[name] = value;
            }
            return document.defaultView.getComputedStyle(wrapper.element)[name];
        },
        appendHTML: (html) => wrapper.element.innerHTML += html,
        first: () => wrapDom(wrapper.element.firstChild),
        hasClass: (_class) => wrapper.element.classList.contains(_class),
        addClass: (_class) => wrapper.element.classList.add(_class),
        removeClass: (_class) => wrapper.element.classList.remove(_class),
        toggleClass: (_class) => wrapper.element.classList.toggle(_class),
        empty: () => {
            while (wrapper.element.firstChild) {
                wrapper.element.removeChild(wrapper.element.lastChild);
            }
        },
        idata: (id, value) => {
            if (value) {
                wrapper.element.dataset[id] = Number.parseInt(value).toString();
            }
            return Number.parseInt(wrapper.element.dataset[id]);
        },
        data: (id, value) => {
            if (value) {
                wrapper.element.dataset[id] = value
            }
            return wrapper.element.dataset[id];
        },
        value: (value) => {
            if (value) {
                wrapper.element.value = Number.parseInt(value).toString();
            }
            return Number.parseInt(wrapper.element.value);
        },
        on: (eventName, selector, handler) => {
            if (typeof selector === "string" && handler) {
                wrapper.element.addEventListener(eventName, (evt) => {
                    const parent = evt.srcElement.closest(selector);
                    if (parent) {
                        return handler(evt, wrapDom(parent));
                    }
                    else {
                        return false;
                    }
                });
            }
            else {
                handler = selector;
                wrapper.element.addEventListener(eventName, (evt) => {
                    try {
                        return handler(evt, wrapper);
                    }
                    catch (err) {
                        console.error(err);
                    }
                });
            }
        },
        scrollTop: (pos) => {
            wrapper.element.scrollTop = pos;
        }
    }
    return wrapper;
}
